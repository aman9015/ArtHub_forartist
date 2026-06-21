"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import {
    ArrowLeft,
    BarChart3,
    Bookmark,
    Eye,
    Heart,
    ImageIcon,
    MessageCircle,
    Star,
    TrendingUp,
    Users,
} from "lucide-react";
import { artworks } from "@/data/artwork";

type Artwork = {
    id: number;
    title: string;
    artist: string;
    username: string;
    bio: string;
    image: string;
};

type Comment = {
    id: number;
    name: string;
    text: string;
};

export default function DashboardPage() {
    const [allArtworks, setAllArtworks] = useState<Artwork[]>([]);
    const [likedIds, setLikedIds] = useState<number[]>([]);
    const [savedIds, setSavedIds] = useState<number[]>([]);
    const [commentsMap, setCommentsMap] = useState<Record<string, Comment[]>>({});
    const [following, setFollowing] = useState(0);

    useEffect(() => {
        const uploaded: Artwork[] = JSON.parse(
            localStorage.getItem("arthub_uploads") || "[]"
        );

        const liked: number[] = JSON.parse(
            localStorage.getItem("arthub_liked_posts") || "[]"
        );

        const saved: number[] = JSON.parse(
            localStorage.getItem("arthub_saved_posts") || "[]"
        );

        const comments: Record<string, Comment[]> = JSON.parse(
            localStorage.getItem("arthub_comments") || "{}"
        );

        const followedUsers: string[] = JSON.parse(
            localStorage.getItem("arthub_following") || "[]"
        );

        setAllArtworks([...uploaded, ...artworks]);
        setLikedIds(liked);
        setSavedIds(saved);
        setCommentsMap(comments);
        setFollowing(followedUsers.length);
    }, []);

    const totalPosts = allArtworks.length;
    const totalLikes = likedIds.length;
    const totalSaves = savedIds.length;
    const totalComments = Object.values(commentsMap).reduce(
        (sum, comments) => sum + comments.length,
        0
    );

    const totalViews = totalPosts * 327 + totalLikes * 41 + totalSaves * 24;
    const followers = 2400 + following;
    const engagementScore =
        totalPosts === 0
            ? 0
            : Math.round(((totalLikes + totalSaves + totalComments) / totalPosts) * 10);

    const mostPopularArtwork = useMemo(() => {
        if (allArtworks.length === 0) return null;

        return [...allArtworks].sort((a, b) => {
            const scoreA =
                (likedIds.includes(a.id) ? 2 : 0) +
                (savedIds.includes(a.id) ? 3 : 0) +
                (commentsMap[String(a.id)]?.length || 0);

            const scoreB =
                (likedIds.includes(b.id) ? 2 : 0) +
                (savedIds.includes(b.id) ? 3 : 0) +
                (commentsMap[String(b.id)]?.length || 0);

            return scoreB - scoreA;
        })[0];
    }, [allArtworks, likedIds, savedIds, commentsMap]);

    const stats = [
        {
            label: "Total Posts",
            value: totalPosts,
            icon: <ImageIcon size={22} />,
        },
        {
            label: "Total Likes",
            value: totalLikes,
            icon: <Heart size={22} />,
        },
        {
            label: "Total Saves",
            value: totalSaves,
            icon: <Bookmark size={22} />,
        },
        {
            label: "Comments",
            value: totalComments,
            icon: <MessageCircle size={22} />,
        },
        {
            label: "Followers",
            value: `${(followers / 1000).toFixed(1)}k`,
            icon: <Users size={22} />,
        },
        {
            label: "Views",
            value: totalViews,
            icon: <Eye size={22} />,
        },
    ];

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
                            Track your ArtHub growth, engagement, and artwork performance.
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
                            Based on likes, saves, comments, and total artwork activity.
                        </p>

                        <div className="mt-8">
                            <div className="flex items-end gap-3">
                                <p className="text-6xl font-black">{engagementScore}</p>
                                <p className="pb-2 text-zinc-400">/ 100</p>
                            </div>

                            <div className="mt-5 h-4 overflow-hidden rounded-full bg-zinc-900">
                                <div
                                    className="h-full rounded-full bg-white"
                                    style={{ width: `${Math.min(engagementScore, 100)}%` }}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                        <h2 className="flex items-center gap-2 text-2xl font-bold">
                            <Star size={24} />
                            Most Popular Artwork
                        </h2>

                        {mostPopularArtwork ? (
                            <div className="mt-6">
                                <div className="h-48 rounded-3xl bg-gradient-to-br from-purple-500 to-pink-500" />

                                <h3 className="mt-5 text-xl font-bold">
                                    {mostPopularArtwork.title}
                                </h3>

                                <p className="mt-1 text-zinc-400">
                                    by {mostPopularArtwork.artist}
                                </p>

                                <p className="mt-4 text-sm text-zinc-500">
                                    This artwork currently has the strongest engagement based on
                                    likes, saves, and comments.
                                </p>
                            </div>
                        ) : (
                            <p className="mt-6 text-zinc-400">
                                Upload artwork to see your top performer.
                            </p>
                        )}
                    </div>
                </div>
            </section>
        </main>
    );
}