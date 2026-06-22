"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft, MessageCircle } from "lucide-react";

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

function formatTime(date?: string) {
    if (!date) return "";

    const messageDate = new Date(date);
    const now = new Date();
    const isToday = messageDate.toDateString() === now.toDateString();

    if (isToday) {
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

function MessagesContent() {
    const supabase = createClient();

    const [myId, setMyId] = useState<string | null>(null);
    const [chats, setChats] = useState<ChatPreview[]>([]);
    const [loading, setLoading] = useState(true);

    async function loadMessages() {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        setMyId(user.id);

        const { data: conversationsData, error } = await supabase
            .from("conversations")
            .select("id, user_one, user_two, created_at")
            .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

        if (error) {
            alert(error.message);
            setLoading(false);
            return;
        }

        const conversations = (conversationsData || []) as Conversation[];

        if (conversations.length === 0) {
            setChats([]);
            setLoading(false);
            return;
        }

        const conversationIds = conversations.map((conversation) => conversation.id);

        const otherUserIds = conversations.map((conversation) =>
            conversation.user_one === user.id
                ? conversation.user_two
                : conversation.user_one
        );

        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, username, avatar_url")
            .in("id", otherUserIds);

        const { data: messagesData } = await supabase
            .from("messages")
            .select("id, conversation_id, sender_id, content, is_read, created_at")
            .in("conversation_id", conversationIds)
            .order("created_at", { ascending: false });

        const profiles = (profilesData || []) as Profile[];
        const allMessages = (messagesData || []) as Message[];

        const formattedChats: ChatPreview[] = conversations
            .map((conversation) => {
                const otherUserId =
                    conversation.user_one === user.id
                        ? conversation.user_two
                        : conversation.user_one;

                const otherUser = profiles.find((profile) => profile.id === otherUserId);

                if (!otherUser) return null;

                const conversationMessages = allMessages.filter(
                    (message) => message.conversation_id === conversation.id
                );

                const latestMessage = conversationMessages[0] || null;

                const unreadCount = conversationMessages.filter(
                    (message) => message.sender_id !== user.id && !message.is_read
                ).length;

                return {
                    id: conversation.id,
                    otherUser,
                    latestMessage,
                    unreadCount,
                    sortTime: latestMessage?.created_at || conversation.created_at,
                };
            })
            .filter(Boolean) as ChatPreview[];

        formattedChats.sort(
            (a, b) => new Date(b.sortTime).getTime() - new Date(a.sortTime).getTime()
        );

        setChats(formattedChats);
        setLoading(false);
    }

    useEffect(() => {
        loadMessages();
    }, []);

    useEffect(() => {
        if (!myId) return;

        const channel = supabase
            .channel(`messages-inbox-${myId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "messages",
                },
                () => {
                    loadMessages();
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [myId]);

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
                        className="flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold hover:bg-zinc-900"
                    >
                        <ArrowLeft size={17} />
                        Back
                    </Link>
                </div>

                {loading ? (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                        <h2 className="text-xl font-bold">Loading messages...</h2>
                    </div>
                ) : chats.length > 0 ? (
                    <div className="space-y-4">
                        {chats.map((chat) => (
                            <Link
                                key={chat.id}
                                href={`/messages/${chat.id}`}
                                className={`flex items-center gap-4 rounded-3xl border border-zinc-800 p-5 hover:bg-zinc-900 ${chat.unreadCount > 0 ? "bg-zinc-900" : "bg-zinc-950"
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
                                        {chat.otherUser.name.charAt(0)}
                                    </div>
                                )}

                                <div className="min-w-0 flex-1">
                                    <div className="flex items-center justify-between gap-3">
                                        <p className="font-bold">{chat.otherUser.name}</p>

                                        <p className="shrink-0 text-xs text-zinc-500">
                                            {formatTime(chat.latestMessage?.created_at || chat.sortTime)}
                                        </p>
                                    </div>

                                    <p className="mt-1 truncate text-sm text-zinc-400">
                                        {chat.latestMessage
                                            ? chat.latestMessage.sender_id === chat.otherUser.id
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
                            <MessageCircle className="text-zinc-500" size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">No messages yet</h2>
                        <p className="mt-2 text-zinc-400">
                            Visit an artist profile and click Message to start a chat.
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