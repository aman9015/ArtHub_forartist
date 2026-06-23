"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useParams } from "next/navigation";
import type { RealtimeChannel } from "@supabase/supabase-js";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft, Ban, Send } from "lucide-react";

const CHAT_CACHE_TTL_MS = 45_000;

type Message = {
    id: number | string;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
    pending?: boolean;
};

type Conversation = {
    id: string;
    user_one: string;
    user_two: string;
};

type Profile = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type TypingPayload = {
    user_id: string;
    is_typing: boolean;
};

type ChatCache = {
    userId: string;
    otherUser: Profile | null;
    messages: Message[];
    conversationBlocked: boolean;
    savedAt: number;
};

type LoadChatOptions = {
    force?: boolean;
    silent?: boolean;
};

const chatCache = new Map<string, ChatCache>();

function sortMessages(messages: Message[]) {
    return [...messages].sort(
        (first, second) =>
            new Date(first.created_at).getTime() -
            new Date(second.created_at).getTime()
    );
}

function ChatSkeleton() {
    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white">
            <section className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="flex items-center gap-3 border-b border-zinc-800 p-5">
                    <div className="h-9 w-9 animate-pulse rounded-full bg-zinc-800" />
                    <div className="h-11 w-11 animate-pulse rounded-full bg-zinc-800" />

                    <div className="space-y-2">
                        <div className="h-4 w-36 animate-pulse rounded bg-zinc-800" />
                        <div className="h-3 w-24 animate-pulse rounded bg-zinc-900" />
                    </div>
                </div>

                <div className="flex flex-1 flex-col justify-end gap-3 p-5">
                    <div className="h-14 w-2/3 animate-pulse rounded-3xl bg-zinc-900" />
                    <div className="ml-auto h-16 w-1/2 animate-pulse rounded-3xl bg-zinc-800" />
                    <div className="h-12 w-3/5 animate-pulse rounded-3xl bg-zinc-900" />
                </div>

                <div className="flex gap-3 border-t border-zinc-800 p-5">
                    <div className="h-12 flex-1 animate-pulse rounded-full bg-zinc-900" />
                    <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-800" />
                </div>
            </section>
        </main>
    );
}

function ChatContent() {
    const params = useParams();
    const rawConversationId = params.id;
    const conversationId = Array.isArray(rawConversationId)
        ? rawConversationId[0]
        : rawConversationId;

    const supabase = useMemo(() => createClient(), []);

    const messageListRef = useRef<HTMLDivElement | null>(null);
    const typingTimeoutRef = useRef<number | null>(null);
    const channelRef = useRef<RealtimeChannel | null>(null);

    const mountedRef = useRef(true);
    const requestVersionRef = useRef(0);

    const myIdRef = useRef<string | null>(null);
    const otherUserRef = useRef<Profile | null>(null);
    const messagesRef = useRef<Message[]>([]);
    const conversationBlockedRef = useRef(false);
    const cacheKeyRef = useRef<string | null>(null);

    const typingActiveRef = useRef(false);
    const shouldStickToBottomRef = useRef(true);

    const [myId, setMyId] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [sending, setSending] = useState(false);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [conversationBlocked, setConversationBlocked] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const saveChatCache = useCallback((nextMessages = messagesRef.current) => {
        const cacheKey = cacheKeyRef.current;
        const userId = myIdRef.current;

        if (!cacheKey || !userId) return;

        chatCache.set(cacheKey, {
            userId,
            otherUser: otherUserRef.current,
            messages: nextMessages.filter((message) => !message.pending),
            conversationBlocked: conversationBlockedRef.current,
            savedAt: Date.now(),
        });
    }, []);

    const replaceMessages = useCallback(
        (nextMessages: Message[]) => {
            const sortedMessages = sortMessages(nextMessages);

            messagesRef.current = sortedMessages;

            if (mountedRef.current) {
                setMessages(sortedMessages);
            }

            saveChatCache(sortedMessages);
        },
        [saveChatCache]
    );

    const updateOtherUser = useCallback((profile: Profile | null) => {
        otherUserRef.current = profile;

        if (mountedRef.current) {
            setOtherUser(profile);
        }
    }, []);

    const updateConversationBlocked = useCallback(
        (isBlocked: boolean) => {
            conversationBlockedRef.current = isBlocked;

            if (mountedRef.current) {
                setConversationBlocked(isBlocked);
            }
        },
        []
    );

    const scrollToBottom = useCallback((behavior: ScrollBehavior = "auto") => {
        window.requestAnimationFrame(() => {
            const messageList = messageListRef.current;

            if (!messageList) return;

            messageList.scrollTo({
                top: messageList.scrollHeight,
                behavior,
            });
        });
    }, []);

    const isNearBottom = useCallback(() => {
        const messageList = messageListRef.current;

        if (!messageList) return true;

        const distanceFromBottom =
            messageList.scrollHeight -
            messageList.scrollTop -
            messageList.clientHeight;

        return distanceFromBottom < 140;
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;

            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    const loadChat = useCallback(
        async ({
            force = false,
            silent = false,
        }: LoadChatOptions = {}) => {
            if (!conversationId) {
                setLoading(false);
                return;
            }

            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user || !mountedRef.current) {
                setLoading(false);
                return;
            }

            const cacheKey = `${user.id}:${conversationId}`;
            const cachedChat = chatCache.get(cacheKey);

            myIdRef.current = user.id;
            cacheKeyRef.current = cacheKey;

            setMyId(user.id);

            const cacheIsFresh =
                cachedChat &&
                Date.now() - cachedChat.savedAt < CHAT_CACHE_TTL_MS;

            if (cachedChat && !force && cacheIsFresh) {
                updateOtherUser(cachedChat.otherUser);
                updateConversationBlocked(cachedChat.conversationBlocked);
                replaceMessages(cachedChat.messages);

                setLoading(false);
                setRefreshing(false);
                setError(null);

                shouldStickToBottomRef.current = true;
                scrollToBottom("auto");

                window.setTimeout(() => {
                    void loadChat({
                        force: true,
                        silent: true,
                    });
                }, 0);

                return;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (cachedChat) {
                updateOtherUser(cachedChat.otherUser);
                updateConversationBlocked(cachedChat.conversationBlocked);
                replaceMessages(cachedChat.messages);

                setLoading(false);

                if (!silent) {
                    setRefreshing(true);
                }
            } else if (!silent) {
                setLoading(true);
            }

            setError(null);

            try {
                const { data: conversationData, error: conversationError } =
                    await supabase
                        .from("conversations")
                        .select("id, user_one, user_two")
                        .eq("id", conversationId)
                        .single();

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (conversationError || !conversationData) {
                    throw new Error(
                        conversationError?.message ||
                        "This conversation could not be found."
                    );
                }

                const conversation = conversationData as Conversation;

                const isConversationMember =
                    conversation.user_one === user.id ||
                    conversation.user_two === user.id;

                if (!isConversationMember) {
                    throw new Error(
                        "You do not have permission to open this conversation."
                    );
                }

                const otherUserId =
                    conversation.user_one === user.id
                        ? conversation.user_two
                        : conversation.user_one;

                const [profileResult, blockedResult, messagesResult] =
                    await Promise.all([
                        supabase
                            .from("profiles")
                            .select("id, name, username, avatar_url")
                            .eq("id", otherUserId)
                            .single(),

                        supabase.rpc("are_users_blocked", {
                            p_first_user_id: user.id,
                            p_second_user_id: otherUserId,
                        }),

                        supabase
                            .from("messages")
                            .select(
                                "id, conversation_id, sender_id, content, is_read, created_at"
                            )
                            .eq("conversation_id", conversationId)
                            .order("created_at", { ascending: true }),
                    ]);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (profileResult.error) {
                    throw new Error(profileResult.error.message);
                }

                if (blockedResult.error) {
                    throw new Error(blockedResult.error.message);
                }

                if (messagesResult.error) {
                    throw new Error(messagesResult.error.message);
                }

                updateOtherUser((profileResult.data as Profile) || null);
                updateConversationBlocked(Boolean(blockedResult.data));

                replaceMessages((messagesResult.data || []) as Message[]);

                shouldStickToBottomRef.current = true;
                scrollToBottom("auto");

                void supabase
                    .from("messages")
                    .update({ is_read: true })
                    .eq("conversation_id", conversationId)
                    .neq("sender_id", user.id)
                    .eq("is_read", false);
            } catch (loadError) {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                setError(
                    loadError instanceof Error
                        ? loadError.message
                        : "Chat could not be loaded."
                );
            } finally {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                setLoading(false);
                setRefreshing(false);
            }
        },
        [
            conversationId,
            replaceMessages,
            scrollToBottom,
            supabase,
            updateConversationBlocked,
            updateOtherUser,
        ]
    );

    useEffect(() => {
        void loadChat();
    }, [loadChat]);

    const handleIncomingMessage = useCallback(
        (newMessage: Message) => {
            if (newMessage.conversation_id !== conversationId) return;

            const mine = newMessage.sender_id === myIdRef.current;
            const shouldAutoScroll = mine || isNearBottom();

            const currentMessages = messagesRef.current;

            const alreadyExists = currentMessages.some(
                (message) => String(message.id) === String(newMessage.id)
            );

            if (alreadyExists) return;

            const matchingTemporaryIndex = mine
                ? currentMessages.findIndex(
                    (message) =>
                        message.pending &&
                        message.sender_id === newMessage.sender_id &&
                        message.content === newMessage.content
                )
                : -1;

            const nextMessages =
                matchingTemporaryIndex >= 0
                    ? currentMessages.map((message, index) =>
                        index === matchingTemporaryIndex
                            ? newMessage
                            : message
                    )
                    : [...currentMessages, newMessage];

            replaceMessages(nextMessages);

            if (shouldAutoScroll) {
                shouldStickToBottomRef.current = true;
                scrollToBottom("smooth");
            }

            if (!mine) {
                void supabase
                    .from("messages")
                    .update({ is_read: true })
                    .eq("id", newMessage.id);
            }
        },
        [
            conversationId,
            isNearBottom,
            replaceMessages,
            scrollToBottom,
            supabase,
        ]
    );

    useEffect(() => {
        if (!myId || !conversationId) return;

        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on(
                "broadcast",
                {
                    event: "typing",
                },
                ({ payload }) => {
                    const typingPayload = payload as TypingPayload;

                    if (typingPayload.user_id === myIdRef.current) return;
                    if (conversationBlockedRef.current) return;

                    setOtherUserTyping(typingPayload.is_typing);

                    if (typingPayload.is_typing) {
                        window.setTimeout(() => {
                            setOtherUserTyping(false);
                        }, 2500);
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "messages",
                    filter: `conversation_id=eq.${conversationId}`,
                },
                (payload) => {
                    handleIncomingMessage(payload.new as Message);
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            if (channelRef.current === channel) {
                channelRef.current = null;
            }

            supabase.removeChannel(channel);

            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [conversationId, handleIncomingMessage, myId, supabase]);

    const sendTypingStatus = useCallback(async (isTyping: boolean) => {
        const channel = channelRef.current;

        if (
            !channel ||
            !myIdRef.current ||
            conversationBlockedRef.current ||
            typingActiveRef.current === isTyping
        ) {
            return;
        }

        typingActiveRef.current = isTyping;

        await channel.send({
            type: "broadcast",
            event: "typing",
            payload: {
                user_id: myIdRef.current,
                is_typing: isTyping,
            },
        });
    }, []);

    const handleTextChange = useCallback(
        (value: string) => {
            if (conversationBlockedRef.current) return;

            setText(value);

            if (typingTimeoutRef.current) {
                window.clearTimeout(typingTimeoutRef.current);
            }

            if (!value.trim()) {
                void sendTypingStatus(false);
                return;
            }

            void sendTypingStatus(true);

            typingTimeoutRef.current = window.setTimeout(() => {
                void sendTypingStatus(false);
            }, 1200);
        },
        [sendTypingStatus]
    );

    const sendMessage = useCallback(async () => {
        if (conversationBlockedRef.current) {
            alert(
                "Messaging is unavailable because one of you has blocked the other."
            );
            return;
        }

        if (!text.trim() || !myIdRef.current || sending || !conversationId) {
            return;
        }

        const content = text.trim();
        const temporaryId =
            typeof crypto !== "undefined" && "randomUUID" in crypto
                ? `temp-${crypto.randomUUID()}`
                : `temp-${Date.now()}-${Math.random()}`;

        const optimisticMessage: Message = {
            id: temporaryId,
            conversation_id: conversationId,
            sender_id: myIdRef.current,
            content,
            is_read: true,
            created_at: new Date().toISOString(),
            pending: true,
        };

        setSending(true);
        setText("");
        void sendTypingStatus(false);

        shouldStickToBottomRef.current = true;
        replaceMessages([...messagesRef.current, optimisticMessage]);
        scrollToBottom("smooth");

        const { data, error: sendError } = await supabase
            .from("messages")
            .insert({
                conversation_id: conversationId,
                sender_id: myIdRef.current,
                content,
            })
            .select(
                "id, conversation_id, sender_id, content, is_read, created_at"
            )
            .single();

        if (sendError || !data) {
            replaceMessages(
                messagesRef.current.filter(
                    (message) => message.id !== temporaryId
                )
            );

            alert(sendError?.message || "Message could not be sent.");
            setSending(false);
            return;
        }

        const savedMessage = data as Message;
        const currentMessages = messagesRef.current;

        const savedMessageAlreadyExists = currentMessages.some(
            (message) => String(message.id) === String(savedMessage.id)
        );

        const nextMessages = savedMessageAlreadyExists
            ? currentMessages.filter((message) => message.id !== temporaryId)
            : currentMessages.map((message) =>
                message.id === temporaryId ? savedMessage : message
            );

        replaceMessages(nextMessages);
        scrollToBottom("smooth");
        setSending(false);
    }, [
        conversationId,
        replaceMessages,
        scrollToBottom,
        sendTypingStatus,
        sending,
        supabase,
        text,
    ]);

    if (loading) {
        return <ChatSkeleton />;
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white">
            <section className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800 p-5">
                    <div className="flex min-w-0 items-center gap-3">
                        <Link
                            href="/messages"
                            prefetch
                            className="shrink-0 rounded-full border border-zinc-800 p-2 transition hover:bg-zinc-900"
                            aria-label="Back to messages"
                        >
                            <ArrowLeft size={18} />
                        </Link>

                        {otherUser?.avatar_url ? (
                            <img
                                src={otherUser.avatar_url}
                                alt={otherUser.name}
                                className="h-11 w-11 shrink-0 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                        )}

                        <div className="min-w-0">
                            <p className="truncate font-bold">
                                {otherUser?.name || "User"}
                            </p>
                            <p className="truncate text-sm text-zinc-400">
                                @{otherUser?.username || "unknown"}
                            </p>
                        </div>
                    </div>

                    <div className="flex items-center gap-3">
                        {refreshing && (
                            <span className="hidden text-xs text-zinc-500 sm:inline">
                                Updating...
                            </span>
                        )}

                        {conversationBlocked && (
                            <div className="hidden items-center gap-2 rounded-full border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 sm:flex">
                                <Ban size={14} />
                                Messaging unavailable
                            </div>
                        )}
                    </div>
                </div>

                {error && (
                    <div className="m-5 mb-0 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadChat({
                                    force: true,
                                })
                            }
                            className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <div
                    ref={messageListRef}
                    onScroll={() => {
                        shouldStickToBottomRef.current = isNearBottom();
                    }}
                    className="flex-1 space-y-3 overflow-y-auto p-5"
                >
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const mine = message.sender_id === myId;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${mine ? "justify-end" : "justify-start"
                                        }`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-3xl px-5 py-3 ${mine
                                                ? "bg-white text-black"
                                                : "bg-zinc-900 text-white"
                                            }`}
                                    >
                                        <p>{message.content}</p>

                                        <div
                                            className={`mt-1 flex items-center gap-2 text-xs ${mine
                                                    ? "text-zinc-600"
                                                    : "text-zinc-500"
                                                }`}
                                        >
                                            <span>
                                                {new Date(
                                                    message.created_at
                                                ).toLocaleTimeString([], {
                                                    hour: "2-digit",
                                                    minute: "2-digit",
                                                })}
                                            </span>

                                            {message.pending && (
                                                <span>Sending...</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            );
                        })
                    ) : (
                        <div className="flex h-full items-center justify-center text-zinc-500">
                            No messages yet. Start the conversation.
                        </div>
                    )}

                    {otherUserTyping && !conversationBlocked && (
                        <div className="flex justify-start">
                            <div className="rounded-3xl bg-zinc-900 px-5 py-3 text-sm text-zinc-400">
                                {otherUser?.name || "User"} is typing...
                            </div>
                        </div>
                    )}
                </div>

                {conversationBlocked ? (
                    <div className="flex items-center gap-3 border-t border-zinc-800 bg-red-950/20 p-5 text-sm text-red-200">
                        <Ban size={19} className="shrink-0 text-red-400" />
                        Messaging is unavailable because one of you has blocked the
                        other.
                    </div>
                ) : (
                    <div className="flex gap-3 border-t border-zinc-800 p-5">
                        <input
                            value={text}
                            onChange={(event) =>
                                handleTextChange(event.target.value)
                            }
                            onKeyDown={(event) => {
                                if (
                                    event.key === "Enter" &&
                                    !event.shiftKey
                                ) {
                                    event.preventDefault();
                                    void sendMessage();
                                }
                            }}
                            disabled={sending}
                            placeholder="Write a message..."
                            className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-5 py-3 outline-none transition focus:border-zinc-600 disabled:cursor-not-allowed disabled:opacity-60"
                        />

                        <button
                            type="button"
                            onClick={() => void sendMessage()}
                            disabled={sending || !text.trim()}
                            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                            aria-label="Send message"
                        >
                            <Send size={18} />
                        </button>
                    </div>
                )}
            </section>
        </main>
    );
}

export default function ChatPage() {
    return (
        <RequireAuth>
            <ChatContent />
        </RequireAuth>
    );
}