"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft, Ban, Send } from "lucide-react";

type Message = {
    id: number;
    conversation_id: string;
    sender_id: string;
    content: string;
    is_read: boolean;
    created_at: string;
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

function ChatContent() {
    const params = useParams();
    const conversationId = params.id as string;
    const supabase = useMemo(() => createClient(), []);

    const messagesEndRef = useRef<HTMLDivElement | null>(null);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const channelRef = useRef<ReturnType<typeof supabase.channel> | null>(null);

    const [myId, setMyId] = useState<string | null>(null);
    const [otherUser, setOtherUser] = useState<Profile | null>(null);
    const [messages, setMessages] = useState<Message[]>([]);
    const [text, setText] = useState("");
    const [loading, setLoading] = useState(true);
    const [otherUserTyping, setOtherUserTyping] = useState(false);
    const [conversationBlocked, setConversationBlocked] = useState(false);

    function scrollToBottom() {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({
                behavior: "smooth",
                block: "end",
            });
        }, 50);
    }

    async function loadChat() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        setMyId(user.id);

        const { data: conversationData, error: conversationError } = await supabase
            .from("conversations")
            .select("id, user_one, user_two")
            .eq("id", conversationId)
            .single();

        if (conversationError || !conversationData) {
            setLoading(false);
            return;
        }

        const conversation = conversationData as Conversation;

        const isConversationMember =
            conversation.user_one === user.id || conversation.user_two === user.id;

        if (!isConversationMember) {
            setLoading(false);
            return;
        }

        const otherUserId =
            conversation.user_one === user.id
                ? conversation.user_two
                : conversation.user_one;

        const [profileResult, blockedResult] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, name, username, avatar_url")
                .eq("id", otherUserId)
                .single(),

            supabase.rpc("are_users_blocked", {
                p_first_user_id: user.id,
                p_second_user_id: otherUserId,
            }),
        ]);

        setOtherUser((profileResult.data as Profile) || null);
        setConversationBlocked(Boolean(blockedResult.data));

        await supabase
            .from("messages")
            .update({ is_read: true })
            .eq("conversation_id", conversationId)
            .neq("sender_id", user.id);

        const { data: messagesData } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, is_read, created_at")
            .eq("conversation_id", conversationId)
            .order("created_at", { ascending: true });

        setMessages((messagesData || []) as Message[]);
        setLoading(false);
    }

    useEffect(() => {
        void loadChat();

        const channel = supabase
            .channel(`chat-${conversationId}`)
            .on(
                "broadcast",
                {
                    event: "typing",
                },
                ({ payload }) => {
                    const typingPayload = payload as TypingPayload;

                    if (typingPayload.user_id === myId) return;
                    if (conversationBlocked) return;

                    setOtherUserTyping(typingPayload.is_typing);

                    if (typingPayload.is_typing) {
                        setTimeout(() => {
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
                },
                async (payload) => {
                    const newMessage = payload.new as Message;

                    if (newMessage.conversation_id !== conversationId) return;

                    setMessages((previous) => {
                        const alreadyExists = previous.some(
                            (message) => message.id === newMessage.id
                        );

                        if (alreadyExists) return previous;

                        return [...previous, newMessage];
                    });

                    const {
                        data: { user },
                    } = await supabase.auth.getUser();

                    if (user && newMessage.sender_id !== user.id) {
                        await supabase
                            .from("messages")
                            .update({ is_read: true })
                            .eq("id", newMessage.id);
                    }
                }
            )
            .subscribe();

        channelRef.current = channel;

        return () => {
            supabase.removeChannel(channel);

            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, [conversationId, myId, conversationBlocked, supabase]);

    useEffect(() => {
        scrollToBottom();
    }, [messages, otherUserTyping]);

    async function sendTypingStatus(isTyping: boolean) {
        if (!myId || !channelRef.current || conversationBlocked) return;

        await channelRef.current.send({
            type: "broadcast",
            event: "typing",
            payload: {
                user_id: myId,
                is_typing: isTyping,
            },
        });
    }

    function handleTextChange(value: string) {
        if (conversationBlocked) return;

        setText(value);

        void sendTypingStatus(true);

        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }

        typingTimeoutRef.current = setTimeout(() => {
            void sendTypingStatus(false);
        }, 1200);
    }

    async function sendMessage() {
        if (conversationBlocked) {
            alert(
                "Messaging is unavailable because one of you has blocked the other."
            );
            return;
        }

        if (!text.trim() || !myId) return;

        const message = text.trim();
        setText("");
        void sendTypingStatus(false);

        const { error } = await supabase.from("messages").insert({
            conversation_id: conversationId,
            sender_id: myId,
            content: message,
        });

        if (error) {
            alert(error.message);
            return;
        }

        scrollToBottom();
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
                    Loading chat...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white">
            <section className="mx-auto flex h-[calc(100vh-3rem)] max-w-3xl flex-col rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between border-b border-zinc-800 p-5">
                    <div className="flex items-center gap-3">
                        <Link
                            href="/messages"
                            className="rounded-full border border-zinc-800 p-2 hover:bg-zinc-900"
                        >
                            <ArrowLeft size={18} />
                        </Link>

                        {otherUser?.avatar_url ? (
                            <img
                                src={otherUser.avatar_url}
                                alt={otherUser.name}
                                className="h-11 w-11 rounded-full object-cover"
                            />
                        ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-bold">
                                {otherUser?.name?.charAt(0) || "U"}
                            </div>
                        )}

                        <div>
                            <p className="font-bold">{otherUser?.name || "User"}</p>
                            <p className="text-sm text-zinc-400">
                                @{otherUser?.username}
                            </p>
                        </div>
                    </div>

                    {conversationBlocked && (
                        <div className="hidden items-center gap-2 rounded-full border border-red-900/60 bg-red-950/30 px-3 py-2 text-xs font-semibold text-red-300 sm:flex">
                            <Ban size={14} />
                            Messaging unavailable
                        </div>
                    )}
                </div>

                <div className="flex-1 space-y-3 overflow-y-auto p-5">
                    {messages.length > 0 ? (
                        messages.map((message) => {
                            const mine = message.sender_id === myId;

                            return (
                                <div
                                    key={message.id}
                                    className={`flex ${
                                        mine ? "justify-end" : "justify-start"
                                    }`}
                                >
                                    <div
                                        className={`max-w-[75%] rounded-3xl px-5 py-3 ${
                                            mine
                                                ? "bg-white text-black"
                                                : "bg-zinc-900 text-white"
                                        }`}
                                    >
                                        <p>{message.content}</p>

                                        <p
                                            className={`mt-1 text-xs ${
                                                mine
                                                    ? "text-zinc-600"
                                                    : "text-zinc-500"
                                            }`}
                                        >
                                            {new Date(
                                                message.created_at
                                            ).toLocaleTimeString([], {
                                                hour: "2-digit",
                                                minute: "2-digit",
                                            })}
                                        </p>
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

                    <div ref={messagesEndRef} />
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
                            onChange={(event) => handleTextChange(event.target.value)}
                            onKeyDown={(event) => {
                                if (event.key === "Enter") {
                                    void sendMessage();
                                }
                            }}
                            placeholder="Write a message..."
                            className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-5 py-3 outline-none"
                        />

                        <button
                            type="button"
                            onClick={() => void sendMessage()}
                            className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200"
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