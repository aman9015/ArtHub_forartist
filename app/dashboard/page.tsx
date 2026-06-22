"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
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

type Artwork = {
    id: string;
    user_id: string;
    title: string;
    description: string | null;
    image_url: string;
    created_at: string;
};

function DashboardContent() {
    const supabase = createClient();

    const [loading, setLoading] = useState(true);
    const [myUserId, setMyUserId] = useState<string | null>(null);
    const [myArtworks, setMyArtworks] = useState<Artwork[]>([]);
    const [totalLikes, setTotalLikes] = useState(0);
    const [totalSaves, setTotalSaves] = useState(0);
    const [totalComments, setTotalComments] = useState(0);
    const [followers, setFollowers] = useState(0);
    const [following, setFollowing] = useState(0);

    useEffect(() => {
        async function loadDashboard() {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                setLoading(false);
                return;
            }

            setMyUserId(user.id);

            const { data: artworksData } = await supabase
                .from("artworks")
                .select("id, user_id, title, description, image_url, created_at")
                .eq("user_id", user.id)
                .order("created_at", { ascending: false });

            const artworks = (artworksData || []) as Artwork[];
            setMyArtworks(artworks);

            const artworkIds = artworks.map((artwork) => artwork.id);

            if (artworkIds.length > 0) {
                const { count: likesCount } = await supabase
                    .from("likes")
                    .select("*", { count: "exact", head: true })
                    .in("artwork_id", artworkIds);

                const { count: savesCount } = await supabase
                    .from("saves")
                    .select("*", { count: "exact", head: true })
                    .in("artwork_id", artworkIds);

                const { count: commentsCount } = await supabase
                    .from("comments")
                    .select("*", { count: "exact", head: true })
                    .in("artwork_id", artworkIds);

                setTotalLikes(likesCount || 0);
                setTotalSaves(savesCount || 0);
                setTotalComments(commentsCount || 0);
            }

            const { count: followersCount } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("following_id", user.id);

            const { count: followingCount } = await supabase
                .from("follows")
                .select("*", { count: "exact", head: true })
                .eq("follower_id", user.id);

            setFollowers(followersCount || 0);
            setFollowing(followingCount || 0);
            setLoading(false);
        }

        loadDashboard();
    }, [supabase]);

    const totalPosts = myArtworks.length;

    const engagementScore =
        totalPosts === 0
            ? 0
            : Math.min(
                Math.round(
                    ((totalLikes + totalSaves + totalComments + followers) /
                        totalPosts) *
                    10
                ),
                100
            );

    const mostPopularArtwork = useMemo(() => {
        if (myArtworks.length === 0) return null;
        return myArtworks[0];
    }, [myArtworks]);

    const stats = [
        { label: "Total Posts", value: totalPosts, icon: <ImageIcon size={22} /> },
        { label: "Likes Received", value: totalLikes, icon: <Heart size={22} /> },
        { label: "Saves Received", value: totalSaves, icon: <Bookmark size={22} /> },
        {
            label: "Comments Received",
            value: totalComments,
            icon: <MessageCircle size={22} />,
        },
        { label: "Followers", value: followers, icon: <Users size={22} /> },
        { label: "Following", value: following, icon: <UserPlus size={22} /> },
    ];

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <h1 className="text-xl font-bold">Loading dashboard...</h1>
                    <p className="mt-2 text-zinc-400">Fetching real Supabase stats.</p>
                </div>
            </main>
        );
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
                        className="flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold hover:bg-zinc-900"
                    >
                        <ArrowLeft size={17} />
                        Back to Explore
                    </Link>
                </div>

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
                            Based on real likes, saves, comments, followers, and posts.
                        </p>

                        <div className="mt-8">
                            <div className="flex items-end gap-3">
                                <p className="text-6xl font-black">{engagementScore}</p>
                                <p className="pb-2 text-zinc-400">/ 100</p>
                            </div>

                            <div className="mt-5 h-4 overflow-hidden rounded-full bg-zinc-900">
                                <div
                                    className="h-full rounded-full bg-white"
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

                        {mostPopularArtwork ? (
                            <div className="mt-6">
                                <div className="relative h-48 overflow-hidden rounded-3xl bg-zinc-900">
                                    <Image
                                        src={mostPopularArtwork.image_url}
                                        alt={mostPopularArtwork.title}
                                        fill
                                        unoptimized
                                        sizes="400px"
                                        className="object-cover"
                                    />
                                </div>

                                <h3 className="mt-5 text-xl font-bold">
                                    {mostPopularArtwork.title}
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