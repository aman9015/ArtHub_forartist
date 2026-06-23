"use client";

import Link from "next/link";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft, MessageCircle } from "lucide-react";

const MESSAGES_CACHE_TTL_MS = 45_000;

type Conversation = {
    id: string;
    user_one: string;
    user_two: string;
    created_at: string;
};

type Profile = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type Message = {
    id: number;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
};

type ChatPreview = {
    id: string;
    otherUser: Profile;
    latestMessage: Message | null;
    unreadCount: number;
    sortTime: string;
};

type MessagesCache = {
    userId: string;
    chats: ChatPreview[];
    savedAt: number;
};

type LoadMessagesOptions = {
    force?: boolean;
    silent?: boolean;
};

let messagesCache: MessagesCache | null = null;

function formatTime(date?: string) {
    if (!date) return "";

    const messageDate = new Date(date);
    const now = new Date();

    if (messageDate.toDateString() === now.toDateString()) {
        return messageDate.toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    return messageDate.toLocaleDateString([], {
        month: "short",
        day: "numeric",
    });
}

function MessagesSkeleton() {
    return (
        <div className="space-y-4">
            {[0, 1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
                >
                    <div className="h-14 w-14 animate-pulse rounded-full bg-zinc-800" />

                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
                        <div className="h-4 w-64 max-w-full animate-pulse rounded bg-zinc-900" />
                        <div className="h-3 w-24 animate-pulse rounded bg-zinc-900" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function MessagesContent() {
    const supabase = useMemo(() => createClient(), []);

    const [myId, setMyId] = useState<string | null>(null);
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const mountedRef = useRef(true);
    const requestVersionRef = useRef(0);
    const conversationIdsRef = useRef<Set<string>>(new Set());
    const refreshTimerRef = useRef<number | null>(null);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;

            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }
        };
    }, []);

    const loadMessages = useCallback(
        async ({
            force = false,
            silent = false,
        }: LoadMessagesOptions = {}) => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user || !mountedRef.current) {
                setLoading(false);
                return;
            }

            setMyId(user.id);

            const cachedInbox =
                messagesCache?.userId === user.id ? messagesCache : null;

            const cacheIsFresh =
                cachedInbox &&
                Date.now() - cachedInbox.savedAt < MESSAGES_CACHE_TTL_MS;

            if (cachedInbox && !force && cacheIsFresh) {
                setChats(cachedInbox.chats);
                setLoading(false);
                setRefreshing(false);
                setError(null);

                window.setTimeout(() => {
                    void loadMessages({
                        force: true,
                        silent: true,
                    });
                }, 0);

                return;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (cachedInbox) {
                setChats(cachedInbox.chats);
                setLoading(false);

                if (!silent) {
                    setRefreshing(true);
                }
            } else if (!silent) {
                setLoading(true);
            }

            setError(null);

            try {
                const { data: conversationsData, error: conversationsError } =
                    await supabase
                        .from("conversations")
                        .select("id, user_one, user_two, created_at")
                        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (conversationsError) {
                    throw new Error(conversationsError.message);
                }

                const conversations = (conversationsData || []) as Conversation[];

                if (conversations.length === 0) {
                    conversationIdsRef.current = new Set();

                    messagesCache = {
                        userId: user.id,
                        chats: [],
                        savedAt: Date.now(),
                    };

                    setChats([]);
                    return;
                }

                const conversationIds = conversations.map(
                    (conversation) => conversation.id
                );

                conversationIdsRef.current = new Set(conversationIds);

                const otherUserIds = [
                    ...new Set(
                        conversations.map((conversation) =>
                            conversation.user_one === user.id
                                ? conversation.user_two
                                : conversation.user_one
                        )
                    ),
                ];

                const [profilesResult, messagesResult] = await Promise.all([
                    supabase
                        .from("profiles")
                        .select("id, name, username, avatar_url")
                        .in("id", otherUserIds),

                    supabase
                        .from("messages")
                        .select(
                            "id, conversation_id, sender_id, content, is_read, created_at"
                        )
                        .in("conversation_id", conversationIds)
                        .order("created_at", { ascending: false }),
                ]);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (profilesResult.error) {
                    throw new Error(profilesResult.error.message);
                }

                if (messagesResult.error) {
                    throw new Error(messagesResult.error.message);
                }

                const profiles = (profilesResult.data || []) as Profile[];
                const allMessages = (messagesResult.data || []) as Message[];

                const profilesById = new Map(
                    profiles.map((profile) => [profile.id, profile])
                );

                const latestMessageByConversation = new Map<string, Message>();
                const unreadCountByConversation = new Map<string, number>();

                for (const message of allMessages) {
                    if (!latestMessageByConversation.has(message.conversation_id)) {
                        latestMessageByConversation.set(
                            message.conversation_id,
                            message
                        );
                    }

                    if (message.sender_id !== user.id && !message.is_read) {
                        unreadCountByConversation.set(
                            message.conversation_id,
                            (unreadCountByConversation.get(
                                message.conversation_id
                            ) || 0) + 1
                        );
                    }
                }

                const formattedChats: ChatPreview[] = [];

                for (const conversation of conversations) {
                    const otherUserId =
                        conversation.user_one === user.id
                            ? conversation.user_two
                            : conversation.user_one;

                    const otherUser = profilesById.get(otherUserId);

                    if (!otherUser) continue;

                    const latestMessage =
                        latestMessageByConversation.get(conversation.id) || null;

                    formattedChats.push({
                        id: conversation.id,
                        otherUser,
                        latestMessage,
                        unreadCount:
                            unreadCountByConversation.get(conversation.id) || 0,
                        sortTime:
                            latestMessage?.created_at || conversation.created_at,
                    });
                }

                formattedChats.sort(
                    (first, second) =>
                        new Date(second.sortTime).getTime() -
                        new Date(first.sortTime).getTime()
                );

                messagesCache = {
                    userId: user.id,
                    chats: formattedChats,
                    savedAt: Date.now(),
                };

                setChats(formattedChats);
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
                        : "Messages could not be loaded."
                );

                if (!messagesCache || messagesCache.userId !== user.id) {
                    setChats([]);
                }
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
        [supabase]
    );

    useEffect(() => {
        void loadMessages();
    }, [loadMessages]);

    useEffect(() => {
        if (!myId) return;

        function scheduleInboxRefresh() {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }

            refreshTimerRef.current = window.setTimeout(() => {
                void loadMessages({
                    force: true,
                    silent: true,
                });
            }, 250);
        }

        const channel = supabase
            .channel(`messages-inbox-${myId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                },
                (payload) => {
                    const nextMessage = payload.new as Partial<Message>;
                    const previousMessage = payload.old as Partial<Message>;

                    const conversationId =
                        nextMessage.conversation_id ||
                        previousMessage.conversation_id;

                    if (
                        conversationId &&
                        conversationIdsRef.current.has(conversationId)
                    ) {
                        scheduleInboxRefresh();
                    }
                }
            )
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "conversations",
                },
                (payload) => {
                    const nextConversation = payload.new as Partial<Conversation>;

                    if (
                        nextConversation.user_one === myId ||
                        nextConversation.user_two === myId
                    ) {
                        scheduleInboxRefresh();
                    }
                }
            )
            .subscribe();

        return () => {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }

            supabase.removeChannel(channel);
        };
    }, [loadMessages, myId, supabase]);

    return (
        <main className="min-h-screen bg-black px-4 py-8 text-white">
            <section className="mx-auto max-w-3xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold">
                            <MessageCircle size={30} />
                            Messages
                        </h1>

                        <p className="mt-2 text-zinc-400">
                            Chat with artists and collectors on ArtHub.
                        </p>
                    </div>

                    <Link
                        href="/explore"
                        prefetch
                        className="flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                    >
                        <ArrowLeft size={17} />
                        Back
                    </Link>
                </div>

                {refreshing && chats.length > 0 && (
                    <p className="mb-4 text-xs font-medium text-zinc-500">
                        Updating conversations...
                    </p>
                )}

                {error && (
                    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>{error}</p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadMessages({
                                    force: true,
                                })
                            }
                            className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
                        >
                            Try again
                        </button>
                    </div>
                )}

                {loading ? (
                    <MessagesSkeleton />
                ) : chats.length > 0 ? (
                    <div className="space-y-4">
                        {chats.map((chat) => (
                            <Link
                                key={chat.id}
                                href={`/messages/${chat.id}`}
                                prefetch
                                className={`flex items-center gap-4 rounded-3xl border border-zinc-800 p-5 transition hover:bg-zinc-900 ${chat.unreadCount > 0
                                        ? "bg-zinc-900"
                                        : "bg-zinc-950"
                                    }`}
                            >
                                {chat.otherUser.avatar_url ? (
                                    <img
                                        src={chat.otherUser.avatar_url}
                                        alt={chat.otherUser.name}
                                        className="h-14 w-14 rounded-full object-cover"
                                    />
                                ) : (
                                    <div className="flex h-14 w-14 items-center justify-center rounded-full bg-zinc-800 text-xl font-bold">
                                        {chat.otherUser.name
                                            .charAt(0)
                                            .toUpperCase()}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="truncate font-bold">
                                            {chat.otherUser.name}
                                        </p>

                                        <p className="shrink-0 text-xs text-zinc-500">
                                            {formatTime(
                                                chat.latestMessage?.created_at ||
                                                chat.sortTime
                                            )}
                                        </p>
                                    </div>

                                    <p className="mt-1 truncate text-sm text-zinc-400">
                                        {chat.latestMessage
                                            ? chat.latestMessage.sender_id ===
                                                chat.otherUser.id
                                                ? chat.latestMessage.content
                                                : `You: ${chat.latestMessage.content}`
                                            : "No messages yet"}
                                    </p>

                                    <p className="mt-1 text-xs text-zinc-600">
                                        @{chat.otherUser.username}
                                    </p>
                                </div>

                                {chat.unreadCount > 0 && (
                                    <div className="flex h-6 min-w-6 items-center justify-center rounded-full bg-red-500 px-2 text-xs font-bold text-white">
                                        {chat.unreadCount}
                                    </div>
                                )}
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
                            <MessageCircle
                                className="text-zinc-500"
                                size={28}
                            />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">
                            No messages yet
                        </h2>

                        <p className="mt-2 text-zinc-400">
                            Visit an artist profile and click Message to start a
                            chat.
                        </p>
                    </div>
                )}
            </section>
        </main>
    );
}

export default function MessagesPage() {
    return (
        <RequireAuth>
            <MessagesContent />
        </RequireAuth>
    );
}