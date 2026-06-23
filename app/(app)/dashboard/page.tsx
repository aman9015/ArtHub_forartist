"use client";

import Image from "next/image";
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
    ArrowLeft,
    BarChart3,
    Bookmark,
    Heart,
    ImageIcon,
    MessageCircle,
    Star,
    TrendingUp,
    Users,
    UserPlus,
} from "lucide-react";

const DASHBOARD_CACHE_TTL_MS = 45_000;

type Artwork = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    image_url: string;
    created_at: string;
};

type DashboardData = {
    userId: string;
    artworks: Artwork[];
    totalLikes: number;
    totalSaves: number;
    totalComments: number;
    followers: number;
    following: number;
    savedAt: number;
};

type LoadDashboardOptions = {
    force?: boolean;
    silent?: boolean;
};

let dashboardCache: DashboardData | null = null;

function DashboardSkeleton() {
    return (
        <main className="min-h-screen bg-black px-4 py-8 text-white">
            <section className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center justify-between gap-4">
                    <div className="space-y-3">
                        <div className="h-9 w-64 animate-pulse rounded bg-zinc-800" />
                        <div className="h-4 w-80 max-w-full animate-pulse rounded bg-zinc-900" />
                    </div>

                    <div className="h-11 w-40 animate-pulse rounded-full bg-zinc-900" />
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {[0, 1, 2, 3, 4, 5].map((item) => (
                        <div
                            key={item}
                            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
                        >
                            <div className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-800" />
                            <div className="mt-5 h-9 w-20 animate-pulse rounded bg-zinc-800" />
                            <div className="mt-3 h-4 w-28 animate-pulse rounded bg-zinc-900" />
                        </div>
                    ))}
                </div>
            </section>
        </main>
    );
}

function DashboardContent() {
    const supabase = useMemo(() => createClient(), []);

    const [loading, setLoading] = useState(() => !dashboardCache);
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const [myArtworks, setMyArtworks] = useState<Artwork[]>(
        () => dashboardCache?.artworks || []
    );
    const [totalLikes, setTotalLikes] = useState(
        () => dashboardCache?.totalLikes || 0
    );
    const [totalSaves, setTotalSaves] = useState(
        () => dashboardCache?.totalSaves || 0
    );
    const [totalComments, setTotalComments] = useState(
        () => dashboardCache?.totalComments || 0
    );
    const [followers, setFollowers] = useState(
        () => dashboardCache?.followers || 0
    );
    const [following, setFollowing] = useState(
        () => dashboardCache?.following || 0
    );

    const mountedRef = useRef(true);
    const requestVersionRef = useRef(0);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;
        };
    }, []);

    const applyDashboardData = useCallback((data: DashboardData) => {
        setMyArtworks(data.artworks);
        setTotalLikes(data.totalLikes);
        setTotalSaves(data.totalSaves);
        setTotalComments(data.totalComments);
        setFollowers(data.followers);
        setFollowing(data.following);
    }, []);

    const loadDashboard = useCallback(
        async ({
            force = false,
            silent = false,
        }: LoadDashboardOptions = {}) => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user || !mountedRef.current) {
                setLoading(false);
                return;
            }

            const cached =
                dashboardCache?.userId === user.id ? dashboardCache : null;

            const cacheIsFresh =
                cached &&
                Date.now() - cached.savedAt < DASHBOARD_CACHE_TTL_MS;

            if (cached && !force && cacheIsFresh) {
                applyDashboardData(cached);
                setLoading(false);
                setRefreshing(false);
                setErrorMessage("");

                window.setTimeout(() => {
                    void loadDashboard({
                        force: true,
                        silent: true,
                    });
                }, 0);

                return;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (cached) {
                applyDashboardData(cached);
                setLoading(false);

                if (!silent) {
                    setRefreshing(true);
                }
            } else if (!silent) {
                setLoading(true);
            }

            setErrorMessage("");

            try {
                const { data: artworksData, error: artworksError } =
                    await supabase
                        .from("artworks")
                        .select(
                            "id, user_id, title, description, image_url, created_at"
                        )
                        .eq("user_id", user.id)
                        .order("created_at", { ascending: false });

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (artworksError) {
                    throw new Error(artworksError.message);
                }

                const artworks = (artworksData || []) as Artwork[];
                const artworkIds = artworks.map((artwork) => artwork.id);

                const [
                    likesResult,
                    savesResult,
                    commentsResult,
                    followersResult,
                    followingResult,
                ] = await Promise.all([
                    artworkIds.length > 0
                        ? supabase
                            .from("likes")
                            .select("id", { count: "exact", head: true })
                            .in("artwork_id", artworkIds)
                        : Promise.resolve({ count: 0, error: null }),

                    artworkIds.length > 0
                        ? supabase
                            .from("saves")
                            .select("id", { count: "exact", head: true })
                            .in("artwork_id", artworkIds)
                        : Promise.resolve({ count: 0, error: null }),

                    artworkIds.length > 0
                        ? supabase
                            .from("comments")
                            .select("id", { count: "exact", head: true })
                            .in("artwork_id", artworkIds)
                        : Promise.resolve({ count: 0, error: null }),

                    supabase
                        .from("follows")
                        .select("follower_id", { count: "exact", head: true })
                        .eq("following_id", user.id),

                    supabase
                        .from("follows")
                        .select("following_id", { count: "exact", head: true })
                        .eq("follower_id", user.id),
                ]);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                const firstError =
                    likesResult.error ||
                    savesResult.error ||
                    commentsResult.error ||
                    followersResult.error ||
                    followingResult.error;

                if (firstError) {
                    throw new Error(firstError.message);
                }

                const nextDashboardData: DashboardData = {
                    userId: user.id,
                    artworks,
                    totalLikes: likesResult.count || 0,
                    totalSaves: savesResult.count || 0,
                    totalComments: commentsResult.count || 0,
                    followers: followersResult.count || 0,
                    following: followingResult.count || 0,
                    savedAt: Date.now(),
                };

                dashboardCache = nextDashboardData;
                applyDashboardData(nextDashboardData);
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
                        : "Dashboard could not be loaded."
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
        [applyDashboardData, supabase]
    );

    useEffect(() => {
        void loadDashboard();
    }, [loadDashboard]);

    const totalPosts = myArtworks.length;

    const engagementScore =
        totalPosts === 0
            ? 0
            : Math.min(
                Math.round(
                    ((totalLikes +
                        totalSaves +
                        totalComments +
                        followers) /
                        totalPosts) *
                    10
                ),
                100
            );

    const latestArtwork = useMemo(() => {
        return myArtworks[0] || null;
    }, [myArtworks]);

    const stats = [
        {
            label: "Total Posts",
            value: totalPosts,
            icon: <ImageIcon size={22} />,
        },
        {
            label: "Likes Received",
            value: totalLikes,
            icon: <Heart size={22} />,
        },
        {
            label: "Saves Received",
            value: totalSaves,
            icon: <Bookmark size={22} />,
        },
        {
            label: "Comments Received",
            value: totalComments,
            icon: <MessageCircle size={22} />,
        },
        {
            label: "Followers",
            value: followers,
            icon: <Users size={22} />,
        },
        {
            label: "Following",
            value: following,
            icon: <UserPlus size={22} />,
        },
    ];

    if (loading) {
        return <DashboardSkeleton />;
    }

    return (
        <main className="min-h-screen bg-black px-4 py-8 text-white">
            <section className="mx-auto max-w-6xl">
                <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h1 className="flex items-center gap-3 text-3xl font-bold">
                            <BarChart3 size={32} />
                            Artist Dashboard
                        </h1>

                        <p className="mt-2 text-zinc-400">
                            Real analytics from your ArtHub profile.
                        </p>
                    </div>

                    <Link
                        href="/explore"
                        prefetch
                        className="flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                    >
                        <ArrowLeft size={17} />
                        Back to Explore
                    </Link>
                </div>

                {refreshing && (
                    <p className="mb-4 text-xs font-medium text-zinc-500">
                        Updating dashboard...
                    </p>
                )}

                {errorMessage && (
                    <div className="mb-5 flex flex-col gap-3 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200 sm:flex-row sm:items-center sm:justify-between">
                        <p>{errorMessage}</p>

                        <button
                            type="button"
                            onClick={() => void loadDashboard({ force: true })}
                            className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {stats.map((stat) => (
                        <div
                            key={stat.label}
                            className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6"
                        >
                            <div className="mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-900 text-zinc-300">
                                {stat.icon}
                            </div>

                            <p className="text-3xl font-bold">{stat.value}</p>
                            <p className="mt-1 text-zinc-400">{stat.label}</p>
                        </div>
                    ))}
                </div>

                <div className="mt-6 grid gap-6 lg:grid-cols-[1fr_0.8fr]">
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="flex items-center gap-2 text-2xl font-bold">
                            <TrendingUp size={24} />
                            Engagement Score
                        </h2>

                        <p className="mt-2 text-zinc-400">
                            Based on real likes, saves, comments, followers, and
                            posts.
                        </p>

                        <div className="mt-8">
                            <div className="flex items-end gap-3">
                                <p className="text-6xl font-black">
                                    {engagementScore}
                                </p>
                                <p className="pb-2 text-zinc-400">/ 100</p>
                            </div>

                            <div className="mt-5 h-4 overflow-hidden rounded-full bg-zinc-900">
                                <div
                                    className="h-full rounded-full bg-white transition-all duration-500"
                                    style={{ width: `${engagementScore}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="flex items-center gap-2 text-2xl font-bold">
                            <Star size={24} />
                            Latest Artwork
                        </h2>

                        {latestArtwork ? (
                            <div className="mt-6">
                                <div className="relative h-48 overflow-hidden rounded-3xl bg-zinc-900">
                                    <Image
                                        src={latestArtwork.image_url}
                                        alt={latestArtwork.title}
                                        fill
                                        unoptimized
                                        sizes="400px"
                                        className="object-cover"
                                    />
                                </div>

                                <h3 className="mt-5 text-xl font-bold">
                                    {latestArtwork.title}
                                </h3>

                                <p className="mt-2 text-sm text-zinc-500">
                                    Your newest uploaded artwork.
                                </p>
                            </div>
                        ) : (
                            <p className="mt-6 text-zinc-400">
                                Upload artwork to see dashboard insights.
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}

export default function DashboardPage() {
    return (
        <RequireAuth>
            <DashboardContent />
        </RequireAuth>
    );
}