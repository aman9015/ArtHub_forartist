"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";

import {
    Bell,
    Bookmark,
    CheckCircle2,
    CircleX,
    FolderKanban,
    Heart,
    MessageCircle,
    Sparkles,
    Trash2,
    Upload,
    UserPlus,
} from "lucide-react";

type Notification = {
    id: string;
    type: string;
    message: string;
    is_read: boolean;
    created_at: string;
    actor_id: string | null;
    artwork_id: string | null;
    commission_request_id: string | null;
    actorName: string;
};

type DbNotification = Omit<Notification, "actorName">;

type Profile = {
    id: string;
    name: string;
    username: string;
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
        return <Heart className="text-red-400" size={22} />;
    }

    if (type === "follow") {
        return <UserPlus className="text-blue-400" size={22} />;
    }

    if (type === "save") {
        return <Bookmark className="text-yellow-400" size={22} />;
    }

    if (type === "comment") {
        return <MessageCircle className="text-green-400" size={22} />;
    }

    if (type === "delete") {
        return <Trash2 className="text-red-500" size={22} />;
    }

    if (type === "commission_request") {
        return <Sparkles className="text-purple-300" size={22} />;
    }

    if (type === "commission_accepted") {
        return <CheckCircle2 className="text-blue-300" size={22} />;
    }

    if (type === "commission_in_progress") {
        return <FolderKanban className="text-purple-300" size={22} />;
    }

    if (type === "commission_completed") {
        return <CheckCircle2 className="text-emerald-300" size={22} />;
    }

    if (
        type === "commission_rejected" ||
        type === "commission_cancelled"
    ) {
        return <CircleX className="text-red-300" size={22} />;
    }

    return <Upload className="text-purple-400" size={22} />;
}

function formatTime(date: string) {
    return new Date(date).toLocaleString();
}

function notificationText(notification: Notification) {
    if (notification.type.startsWith("commission_")) {
        return notification.message;
    }

    return `${notification.actorName || "Someone"} ${notification.message}`;
}

function NotificationsContent() {
    const supabase = useMemo(() => createClient(), []);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    const loadNotifications = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: notificationsData, error } = await supabase
            .from("notifications")
            .select(
                "id, type, message, is_read, created_at, actor_id, artwork_id, commission_request_id"
            )
            .eq("user_id", user.id)
            .order("created_at", { ascending: false });

        if (error) {
            setErrorMessage(error.message);
            setLoading(false);
            return;
        }

        const databaseNotifications = (
            notificationsData || []
        ) as DbNotification[];

        const actorIds = [
            ...new Set(
                databaseNotifications
                    .map((notification) => notification.actor_id)
                    .filter((id): id is string => Boolean(id))
            ),
        ];

        let profiles: Profile[] = [];

        if (actorIds.length > 0) {
            const { data: profilesData } = await supabase
                .from("profiles")
                .select("id, name, username")
                .in("id", actorIds);

            profiles = (profilesData || []) as Profile[];
        }

        const profilesById = new Map(
            profiles.map((profile) => [profile.id, profile])
        );

        setNotifications(
            databaseNotifications.map((notification) => ({
                ...notification,
                actorName: notification.actor_id
                    ? profilesById.get(notification.actor_id)?.name || "Someone"
                    : "",
            }))
        );

        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    async function markAllAsRead() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", user.id)
            .eq("is_read", false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setNotifications((previous) =>
            previous.map((notification) => ({
                ...notification,
                is_read: true,
            }))
        );
    }

    async function markOneAsRead(notificationId: string) {
        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("id", notificationId);

        if (error) return;

        setNotifications((previous) =>
            previous.map((notification) =>
                notification.id === notificationId
                    ? { ...notification, is_read: true }
                    : notification
            )
        );
    }

    async function clearNotifications() {
        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) return;

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", user.id);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setNotifications([]);
    }

    return (
        <div className="w-full min-w-0 px-1 py-2 text-white">
            <section className="mx-auto w-full max-w-3xl">
                <div className="mb-8 flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold">
                            <Bell size={30} />
                            Notifications
                        </h1>

                        <p className="mt-2 text-zinc-400">
                            Likes, follows, messages, and commission updates.
                        </p>
                    </div>

                    <div className="flex flex-wrap gap-3">
                        {unreadCount > 0 && (
                            <button
                                type="button"
                                onClick={() => void markAllAsRead()}
                                className="rounded-full border border-blue-500/30 px-5 py-3 text-sm font-semibold text-blue-300 transition hover:bg-blue-500/10"
                            >
                                Mark all read
                            </button>
                        )}

                        {notifications.length > 0 && (
                            <button
                                type="button"
                                onClick={() => void clearNotifications()}
                                className="rounded-full border border-red-900/60 px-5 py-3 text-sm font-semibold text-red-400 transition hover:bg-red-950"
                            >
                                Clear
                            </button>
                        )}

                        <Link
                            href="/explore"
                            className="rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                        >
                            Back
                        </Link>
                    </div>
                </div>

                {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorMessage}
                    </div>
                )}

                {loading ? (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                        <h2 className="text-xl font-bold">Loading notifications...</h2>
                    </div>
                ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <Link
                                key={notification.id}
                                href={getNotificationLink(notification)}
                                onClick={() => void markOneAsRead(notification.id)}
                                className={`flex items-center gap-4 rounded-3xl border border-zinc-800 p-5 transition hover:border-zinc-600 hover:bg-zinc-900 ${notification.is_read ? "bg-zinc-950" : "bg-zinc-900"
                                    }`}
                            >
                                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-black">
                                    {getIcon(notification.type)}
                                </div>

                                <div className="min-w-0 flex-1">
                                    <p className="text-sm text-zinc-300">
                                        {notificationText(notification)}
                                    </p>

                                    <p className="mt-1 text-xs text-zinc-500">
                                        {formatTime(notification.created_at)}
                                    </p>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
                            <Bell className="text-zinc-500" size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">
                            No notifications yet
                        </h2>

                        <p className="mt-2 text-zinc-400">
                            New social activity and commission updates will appear here.
                        </p>
                    </div>
                )}
            </section>
        </div>
    );
}

export default function NotificationsPage() {
    return (
        <RequireAuth>
            <NotificationsContent />
        </RequireAuth>
    );
}