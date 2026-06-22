"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Sparkles, BriefcaseBusiness } from "lucide-react";
import { createClient } from "@/app/lib/supabase";

type ProfileRow = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type ArtworkRow = {
    id: string;
    user_id: string;
};

type FollowRow = {
    following_id: string;
};

type LikeRow = {
    artwork_id: string;
};

type TopArtist = {
    id: string;
    name: string;
    username: string;
    avatarUrl: string | null;
    followers: number;
    totalLikes: number;
};

function formatCount(value: number) {
    if (value >= 1_000_000) {
        return `${(value / 1_000_000).toFixed(1).replace(".0", "")}M`;
    }

    if (value >= 1_000) {
        return `${(value / 1_000).toFixed(1).replace(".0", "")}k`;
    }

    return String(value);
}

function sortArtists(artists: TopArtist[]) {
    return [...artists].sort((first, second) => {
        if (second.followers !== first.followers) {
            return second.followers - first.followers;
        }

        if (second.totalLikes !== first.totalLikes) {
            return second.totalLikes - first.totalLikes;
        }

        return first.name.localeCompare(second.name);
    });
}

export default function Trending() {
    const supabase = useMemo(() => createClient(), []);

    const [artists, setArtists] = useState<TopArtist[]>([]);
    const [viewerUserId, setViewerUserId] = useState<string | null>(null);
    const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(true);
    const [followLoadingId, setFollowLoadingId] = useState<string | null>(null);

    const loadTopArtists = useCallback(async () => {
        setLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        const viewerFollowsPromise = user
            ? supabase
                  .from("follows")
                  .select("following_id")
                  .eq("follower_id", user.id)
            : Promise.resolve({
                  data: [] as FollowRow[],
                  error: null,
              });

        const [
            profilesResult,
            artworksResult,
            followsResult,
            likesResult,
            viewerFollowsResult,
        ] = await Promise.all([
            supabase
                .from("profiles")
                .select("id, name, username, avatar_url"),

            supabase.from("artworks").select("id, user_id"),

            supabase.from("follows").select("following_id"),

            supabase.from("likes").select("artwork_id"),

            viewerFollowsPromise,
        ]);

        const firstError = [
            profilesResult.error,
            artworksResult.error,
            followsResult.error,
            likesResult.error,
            viewerFollowsResult.error,
        ].find(Boolean);

        if (firstError) {
            console.log(firstError.message);
            setArtists([]);
            setLoading(false);
            return;
        }

        const profiles = (profilesResult.data || []) as ProfileRow[];
        const artworks = (artworksResult.data || []) as ArtworkRow[];
        const follows = (followsResult.data || []) as FollowRow[];
        const likes = (likesResult.data || []) as LikeRow[];
        const viewerFollows = (viewerFollowsResult.data || []) as FollowRow[];

        const artworkOwnerById = new Map<string, string>();
        const artistIdsWithArtwork = new Set<string>();

        for (const artwork of artworks) {
            artworkOwnerById.set(artwork.id, artwork.user_id);
            artistIdsWithArtwork.add(artwork.user_id);
        }

        const followerCounts = new Map<string, number>();

        for (const follow of follows) {
            followerCounts.set(
                follow.following_id,
                (followerCounts.get(follow.following_id) || 0) + 1
            );
        }

        const totalLikesByArtist = new Map<string, number>();

        for (const like of likes) {
            const artworkOwnerId = artworkOwnerById.get(like.artwork_id);

            if (!artworkOwnerId) continue;

            totalLikesByArtist.set(
                artworkOwnerId,
                (totalLikesByArtist.get(artworkOwnerId) || 0) + 1
            );
        }

        const rankedArtists = sortArtists(
            profiles
                .filter((profile) => artistIdsWithArtwork.has(profile.id))
                .map((profile) => ({
                    id: profile.id,
                    name: profile.name,
                    username: profile.username,
                    avatarUrl: profile.avatar_url,
                    followers: followerCounts.get(profile.id) || 0,
                    totalLikes: totalLikesByArtist.get(profile.id) || 0,
                }))
        ).slice(0, 3);

        setViewerUserId(user?.id || null);

        setFollowingIds(
            new Set(viewerFollows.map((follow) => follow.following_id))
        );

        setArtists(rankedArtists);
        setLoading(false);
    }, [supabase]);

    useEffect(() => {
        void loadTopArtists();
    }, [loadTopArtists]);

    async function handleFollow(artist: TopArtist) {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (artist.id === viewerUserId || followLoadingId) {
            return;
        }

        const isFollowing = followingIds.has(artist.id);

        setFollowLoadingId(artist.id);

        if (isFollowing) {
            const { error } = await supabase
                .from("follows")
                .delete()
                .eq("follower_id", viewerUserId)
                .eq("following_id", artist.id);

            setFollowLoadingId(null);

            if (error) {
                alert(error.message);
                return;
            }

            setFollowingIds((current) => {
                const next = new Set(current);
                next.delete(artist.id);
                return next;
            });

            setArtists((current) =>
                sortArtists(
                    current.map((item) =>
                        item.id === artist.id
                            ? {
                                  ...item,
                                  followers: Math.max(item.followers - 1, 0),
                              }
                            : item
                    )
                )
            );

            return;
        }

        const { error } = await supabase.from("follows").insert({
            follower_id: viewerUserId,
            following_id: artist.id,
        });

        setFollowLoadingId(null);

        if (error) {
            alert(error.message);
            return;
        }

        setFollowingIds((current) => new Set([...current, artist.id]));

        setArtists((current) =>
            sortArtists(
                current.map((item) =>
                    item.id === artist.id
                        ? {
                              ...item,
                              followers: item.followers + 1,
                          }
                        : item
                )
            )
        );
    }

    return (
        <aside className="sticky top-6 h-fit space-y-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h2 className="text-xl font-bold">Top Artists</h2>

                <div className="mt-5 space-y-4">
                    {loading ? (
                        <p className="text-sm text-zinc-500">
                            Loading top artists...
                        </p>
                    ) : artists.length === 0 ? (
                        <p className="text-sm text-zinc-500">
                            No artists to rank yet.
                        </p>
                    ) : (
                        artists.map((artist) => {
                            const isOwnProfile = artist.id === viewerUserId;
                            const isFollowing = followingIds.has(artist.id);
                            const isUpdating = followLoadingId === artist.id;

                            return (
                                <div
                                    key={artist.id}
                                    className="flex items-center justify-between gap-3"
                                >
                                    <div className="flex min-w-0 items-center gap-3">
                                        {artist.avatarUrl ? (
                                            <img
                                                src={artist.avatarUrl}
                                                alt={artist.name}
                                                className="h-11 w-11 shrink-0 rounded-full border border-zinc-700 object-cover"
                                            />
                                        ) : (
                                            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-zinc-800 font-bold">
                                                {artist.name.charAt(0).toUpperCase()}
                                            </div>
                                        )}

                                        <div className="min-w-0">
                                            <p className="truncate font-semibold">
                                                {artist.name}
                                            </p>

                                            <p className="truncate text-sm text-zinc-400">
                                                @{artist.username}
                                            </p>

                                            <p className="mt-0.5 text-xs text-zinc-500">
                                                {formatCount(artist.followers)} followers ·{" "}
                                                {formatCount(artist.totalLikes)} likes
                                            </p>
                                        </div>
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() => void handleFollow(artist)}
                                        disabled={isOwnProfile || isUpdating}
                                        className={`shrink-0 rounded-full px-3 py-1 text-sm font-semibold transition disabled:cursor-default disabled:opacity-70 ${
                                            isFollowing || isOwnProfile
                                                ? "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                                                : "bg-white text-black hover:bg-zinc-200"
                                        }`}
                                    >
                                        {isOwnProfile
                                            ? "You"
                                            : isUpdating
                                            ? "..."
                                            : isFollowing
                                            ? "Following"
                                            : "Follow"}
                                    </button>
                                </div>
                            );
                        })
                    )}
                </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="flex items-center gap-2">
                    <Sparkles size={20} className="text-yellow-400" />
                    <h2 className="text-xl font-bold">Features</h2>
                    <span className="rounded-full border border-zinc-700 bg-zinc-900 px-2 py-0.5 text-xs text-zinc-400">
                        Coming Soon
                    </span>
                </div>

                <div className="mt-5 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                    <div className="flex items-start gap-3">
                        <div className="rounded-xl bg-zinc-800 p-2 text-zinc-200">
                            <BriefcaseBusiness size={20} />
                        </div>

                        <div>
                            <h3 className="font-semibold">Hire Artists</h3>
                            <p className="mt-1 text-sm leading-6 text-zinc-400">
                                Soon, clients will be able to discover and hire
                                artists by skills like thumbnail design, animation,
                                sketch art, oil painting, and more.
                            </p>
                        </div>
                    </div>
                </div>
            </section>
        </aside>
    );
}