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

const NOTIFICATIONS_CACHE_TTL_MS = 45_000;

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

type NotificationsCache = {
    userId: string;
    notifications: Notification[];
    savedAt: number;
};

type LoadNotificationsOptions = {
    force?: boolean;
    silent?: boolean;
};

let notificationsCache: NotificationsCache | null = null;

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

function NotificationsSkeleton() {
    return (
        <div className="space-y-4">
            {[0, 1, 2, 3].map((item) => (
                <div
                    key={item}
                    className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
                >
                    <div className="h-12 w-12 animate-pulse rounded-full bg-zinc-800" />

                    <div className="min-w-0 flex-1 space-y-3">
                        <div className="h-4 w-2/3 animate-pulse rounded bg-zinc-800" />
                        <div className="h-3 w-36 animate-pulse rounded bg-zinc-900" />
                    </div>
                </div>
            ))}
        </div>
    );
}

function NotificationsContent() {
    const supabase = useMemo(() => createClient(), []);

    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [userId, setUserId] = useState<string | null>(null);

    const mountedRef = useRef(true);
    const requestVersionRef = useRef(0);
    const userIdRef = useRef<string | null>(null);
    const notificationsRef = useRef<Notification[]>([]);
    const refreshTimerRef = useRef<number | null>(null);

    const updateNotifications = useCallback(
        (
            next:
                | Notification[]
                | ((current: Notification[]) => Notification[])
        ) => {
            setNotifications((current) => {
                const resolved =
                    typeof next === "function"
                        ? (
                            next as (
                                currentNotifications: Notification[]
                            ) => Notification[]
                        )(current)
                        : next;

                notificationsRef.current = resolved;

                if (userIdRef.current) {
                    notificationsCache = {
                        userId: userIdRef.current,
                        notifications: resolved,
                        savedAt: Date.now(),
                    };
                }

                return resolved;
            });
        },
        []
    );

    const unreadCount = useMemo(
        () =>
            notifications.reduce(
                (count, notification) =>
                    notification.is_read ? count : count + 1,
                0
            ),
        [notifications]
    );

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

    const loadNotifications = useCallback(
        async ({
            force = false,
            silent = false,
        }: LoadNotificationsOptions = {}) => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user || !mountedRef.current) {
                setLoading(false);
                return;
            }

            userIdRef.current = user.id;
            setUserId(user.id);

            const cached =
                notificationsCache?.userId === user.id
                    ? notificationsCache
                    : null;

            const cacheIsFresh =
                cached &&
                Date.now() - cached.savedAt < NOTIFICATIONS_CACHE_TTL_MS;

            if (cached && !force && cacheIsFresh) {
                updateNotifications(cached.notifications);
                setLoading(false);
                setRefreshing(false);
                setErrorMessage("");

                window.setTimeout(() => {
                    void loadNotifications({
                        force: true,
                        silent: true,
                    });
                }, 0);

                return;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (cached) {
                updateNotifications(cached.notifications);
                setLoading(false);

                if (!silent) {
                    setRefreshing(true);
                }
            } else if (!silent) {
                setLoading(true);
            }

            setErrorMessage("");

            try {
                const { data: notificationsData, error } = await supabase
                    .from("notifications")
                    .select(
                        "id, type, message, is_read, created_at, actor_id, artwork_id, commission_request_id"
                    )
                    .eq("user_id", user.id)
                    .order("created_at", { ascending: false });

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (error) {
                    throw new Error(error.message);
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
                    const { data: profilesData, error: profilesError } =
                        await supabase
                            .from("profiles")
                            .select("id, name, username")
                            .in("id", actorIds);

                    if (profilesError) {
                        throw new Error(profilesError.message);
                    }

                    profiles = (profilesData || []) as Profile[];
                }

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                const profilesById = new Map(
                    profiles.map((profile) => [profile.id, profile])
                );

                const formattedNotifications: Notification[] =
                    databaseNotifications.map((notification) => ({
                        ...notification,
                        actorName: notification.actor_id
                            ? profilesById.get(notification.actor_id)?.name ||
                            "Someone"
                            : "",
                    }));

                updateNotifications(formattedNotifications);
            } catch (loadError) {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                setErrorMessage(
                    loadError instanceof Error
                        ? loadError.message
                        : "Notifications could not be loaded."
                );

                if (!cached) {
                    updateNotifications([]);
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
        [supabase, updateNotifications]
    );

    useEffect(() => {
        void loadNotifications();
    }, [loadNotifications]);

    useEffect(() => {
        if (!userId) return;

        function scheduleRefresh() {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }

            refreshTimerRef.current = window.setTimeout(() => {
                void loadNotifications({
                    force: true,
                    silent: true,
                });
            }, 250);
        }

        const channel = supabase
            .channel(`notifications-page-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "*",
                    schema: "public",
                    table: "notifications",
                    filter: `user_id=eq.${userId}`,
                },
                scheduleRefresh
            )
            .subscribe();

        return () => {
            if (refreshTimerRef.current) {
                window.clearTimeout(refreshTimerRef.current);
            }

            supabase.removeChannel(channel);
        };
    }, [loadNotifications, supabase, userId]);

    const markAllAsRead = useCallback(async () => {
        const currentUserId = userIdRef.current;

        if (!currentUserId || unreadCount === 0) return;

        const previousNotifications = notificationsRef.current;

        updateNotifications((current) =>
            current.map((notification) => ({
                ...notification,
                is_read: true,
            }))
        );

        const { error } = await supabase
            .from("notifications")
            .update({ is_read: true })
            .eq("user_id", currentUserId)
            .eq("is_read", false);

        if (error) {
            updateNotifications(previousNotifications);
            setErrorMessage(error.message);
        }
    }, [supabase, unreadCount, updateNotifications]);

    const markOneAsRead = useCallback(
        async (notificationId: string) => {
            const target = notificationsRef.current.find(
                (notification) => notification.id === notificationId
            );

            if (!target || target.is_read) return;

            const previousNotifications = notificationsRef.current;

            updateNotifications((current) =>
                current.map((notification) =>
                    notification.id === notificationId
                        ? { ...notification, is_read: true }
                        : notification
                )
            );

            const { error } = await supabase
                .from("notifications")
                .update({ is_read: true })
                .eq("id", notificationId);

            if (error) {
                updateNotifications(previousNotifications);
                setErrorMessage(error.message);
            }
        },
        [supabase, updateNotifications]
    );

    const clearNotifications = useCallback(async () => {
        const currentUserId = userIdRef.current;

        if (!currentUserId || notificationsRef.current.length === 0) return;

        const previousNotifications = notificationsRef.current;

        updateNotifications([]);

        const { error } = await supabase
            .from("notifications")
            .delete()
            .eq("user_id", currentUserId);

        if (error) {
            updateNotifications(previousNotifications);
            setErrorMessage(error.message);
        }
    }, [supabase, updateNotifications]);

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
                            prefetch
                            className="rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                        >
                            Back
                        </Link>
                    </div>
                </div>

                {refreshing && notifications.length > 0 && (
                    <p className="mb-4 text-xs font-medium text-zinc-500">
                        Updating notifications...
                    </p>
                )}

                {errorMessage && (
                    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
                        <p>{errorMessage}</p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadNotifications({
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
                    <NotificationsSkeleton />
                ) : notifications.length > 0 ? (
                    <div className="space-y-4">
                        {notifications.map((notification) => (
                            <Link
                                key={notification.id}
                                href={getNotificationLink(notification)}
                                prefetch
                                onClick={() =>
                                    void markOneAsRead(notification.id)
                                }
                                className={`flex items-center gap-4 rounded-3xl border border-zinc-800 p-5 transition hover:border-zinc-600 hover:bg-zinc-900 ${notification.is_read
                                        ? "bg-zinc-950"
                                        : "bg-zinc-900"
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
                            New social activity and commission updates will appear
                            here.
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