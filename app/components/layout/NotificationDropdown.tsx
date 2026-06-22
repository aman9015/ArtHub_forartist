"use client";

import Link from "next/link";
import {
    Bell,
    Bookmark,
    CheckCircle2,
    CircleX,
    FolderKanban,
    Heart,
    MessageCircle,
    Sparkles,
    Upload,
    UserPlus,
} from "lucide-react";
import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { createClient } from "@/app/lib/supabase";

type Notification = {
    id: string;
    user_id: string;
    type: string;
    message: string;
    actor_id: string | null;
    artwork_id: string | null;
    commission_request_id: string | null;
    is_read: boolean;
    created_at: string;
};

function getNotificationLink(notification: Notification) {
    if (notification.commission_request_id) {
        if (notification.type === "commission_request") {
            return "/commissions/inbox";
        }

        return `/commissions/requests#${notification.commission_request_id}`;
    }

    if (notification.artwork_id) {
        return `/artwork/${notification.artwork_id}`;
    }

    return "/notifications";
}

function getIcon(type: string) {
    if (type === "like") {
        return <Heart size={17} className="text-red-400" />;
    }

    if (type === "follow") {
        return <UserPlus size={17} className="text-blue-400" />;
    }

    if (type === "save") {
        return <Bookmark size={17} className="text-yellow-300" />;
    }

    if (type === "comment") {
        return <MessageCircle size={17} className="text-emerald-400" />;
    }

    if (type === "commission_request") {
        return <Sparkles size={17} className="text-purple-300" />;
    }

    if (type === "commission_accepted") {
        return <CheckCircle2 size={17} className="text-blue-300" />;
    }

    if (type === "commission_in_progress") {
        return <FolderKanban size={17} className="text-purple-300" />;
    }

    if (type === "commission_completed") {
        return <CheckCircle2 size={17} className="text-emerald-300" />;
    }

    if (
        type === "commission_rejected" ||
        type === "commission_cancelled"
    ) {
        return <CircleX size={17} className="text-red-300" />;
    }

    return <Upload size={17} className="text-purple-300" />;
}

function formatTime(date: string) {
    const createdAt = new Date(date);
    const now = new Date();

    const differenceInMinutes = Math.floor(
        (now.getTime() - createdAt.getTime()) / 60000
    );

    if (differenceInMinutes < 1) return "Just now";
    if (differenceInMinutes < 60) return `${differenceInMinutes}m ago`;

    const differenceInHours = Math.floor(differenceInMinutes / 60);

    if (differenceInHours < 24) return `${differenceInHours}h ago`;

    const differenceInDays = Math.floor(differenceInHours / 24);

    if (differenceInDays < 7) return `${differenceInDays}d ago`;

    return createdAt.toLocaleDateString();
}

export default function NotificationDropdown() {
    const supabase = useMemo(() => createClient(), []);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);

    const dropdownRef = useRef<HTMLDivElement | null>(null);

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    const loadNotifications = useCallback(async () => {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { data, error } = await supabase
            .from("notifications")
            .select(
                "id, user_id, type, message, actor_id, artwork_id, commission_request_id, is_read, created_at"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false })
            .limit(8);

        if (!error && data) {
            setNotifications(data as Notification[]);
        }
    }, [supabase]);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        let activeChannel: ReturnType<typeof supabase.channel> | null = null;
        let isUnmounted = false;

        async function setupRealtime() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user || isUnmounted) return;

            activeChannel = supabase
                .channel(
                    `topbar-notifications-${user.id}-${Math.random()
                        .toString(36)
                        .slice(2)}`
                )
                .on(
                    "postgres_changes",
                    {
                        event: "INSERT",
                        schema: "public",
                        table: "notifications",
                        filter: `user_id=eq.${user.id}`,
                    },
                    (payload) => {
                        const newNotification = payload.new as Notification;

                        setNotifications((previous) => {
                            const alreadyExists = previous.some(
                                (notification) => notification.id === newNotification.id
                            );

                            if (alreadyExists) return previous;

                            return [newNotification, ...previous].slice(0, 8);
                        });
                    }
                )
                .subscribe();
        }

        void setupRealtime();

        return () => {
            isUnmounted = true;

            if (activeChannel) {
                void supabase.removeChannel(activeChannel);
            }
        };
    }, [supabase]);

    useEffect(() => {
        function handleClickOutside(event: MouseEvent) {
            if (
                dropdownRef.current &&
                !dropdownRef.current.contains(event.target as Node)
            ) {
                setOpen(false);
            }
        }

        function handleEscape(event: KeyboardEvent) {
            if (event.key === "Escape") {
                setOpen(false);
            }
        }

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("keydown", handleEscape);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("keydown", handleEscape);
        };
    }, []);

    async function markOneAsRead(notificationId: string) {
        setNotifications((previous) =>
            previous.map((notification) =>
                notification.id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            )
        );

        await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);
    }

    return (
        <div ref={dropdownRef} className="relative shrink-0">
            <button
                type="button"
                onClick={() => setOpen((previous) => !previous)}
                aria-label="Open notifications"
                className="relative flex h-11 w-11 items-center justify-center rounded-full border border-zinc-800 bg-zinc-900 text-white transition hover:border-zinc-600 hover:bg-zinc-800"
            >
                <Bell size={20} />

                {unreadCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white">
                        {unreadCount > 9 ? "9+" : unreadCount}
                    </span>
                )}
            </button>

            {open && (
                <div className="absolute right-0 top-[calc(100%+0.75rem)] z-[100] w-[360px] max-w-[calc(100vw-2rem)] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 shadow-2xl shadow-black/60">
                    <div className="flex items-center justify-between border-b border-zinc-800 px-5 py-4">
                        <div>
                            <h3 className="font-bold text-white">Notifications</h3>
                            <p className="mt-0.5 text-xs text-zinc-500">
                                Your latest activity
                            </p>
                        </div>

                        {unreadCount > 0 && (
                            <span className="rounded-full bg-red-500/15 px-2.5 py-1 text-xs font-semibold text-red-300">
                                {unreadCount} new
                            </span>
                        )}
                    </div>

                    <div className="max-h-[390px] overflow-y-auto">
                        {notifications.length > 0 ? (
                            notifications.map((notification) => (
                                <Link
                                    key={notification.id}
                                    href={getNotificationLink(notification)}
                                    onClick={() => {
                                        setOpen(false);
                                        void markOneAsRead(notification.id);
                                    }}
                                    className={`flex gap-3 border-b border-zinc-900 px-5 py-4 transition hover:bg-zinc-900 ${notification.is_read ? "bg-zinc-950" : "bg-zinc-900/70"
                                        }`}
                                >
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-black">
                                        {getIcon(notification.type)}
                                    </div>

                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm leading-5 text-zinc-200">
                                            {notification.message}
                                        </p>

                                        <p className="mt-1 text-xs text-zinc-500">
                                            {formatTime(notification.created_at)}
                                        </p>
                                    </div>

                                    {!notification.is_read && (
                                        <span className="mt-2 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-400" />
                                    )}
                                </Link>
                            ))
                        ) : (
                            <div className="px-6 py-12 text-center">
                                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-zinc-900">
                                    <Bell size={21} className="text-zinc-500" />
                                </div>

                                <p className="mt-4 font-semibold text-white">
                                    No notifications yet
                                </p>

                                <p className="mt-1 text-sm text-zinc-500">
                                    Likes, comments, follows, and commission updates will appear
                                    here.
                                </p>
                            </div>
                        )}
                    </div>

                    <Link
                        href="/notifications"
                        onClick={() => setOpen(false)}
                        className="block border-t border-zinc-800 px-5 py-4 text-center text-sm font-semibold text-purple-300 transition hover:bg-zinc-900"
                    >
                        View all notifications
                    </Link>
                </div>
            )}
        </div>
    );
}