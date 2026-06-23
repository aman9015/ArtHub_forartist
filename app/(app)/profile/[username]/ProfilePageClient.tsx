"use client";

import { useEffect, useMemo, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import ProfileHeader from "@/app/components/profile/profileHeader";
import ProfileStats from "@/app/components/profile/ProfileStats";
import ProfileGallery from "@/app/components/profile/profileGallery";
import ProfileTabs from "@/app/components/profile/ProfileTabs";

type Tab = "posts" | "saved" | "liked";

type Artwork = {
    id: string;
    title: string;
    artist: string;
    username: string;
    image: string;
    ownerId: string;
    avatarUrl: string | null;

    initialLikes: number;
    initialComments: number;
    initialReposts: number;
    initialSaves: number;

    initialLiked: boolean;
    initialSaved: boolean;
    initialReposted: boolean;
    initialFollowing: boolean;
};

type Profile = {
    id: string;
    name: string;
    username: string;
    about: string | null;
    description: string | null;
    avatar_url: string | null;
    commissions_open: boolean;
};

type ProfileSummary = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type SupabaseArtwork = {
    id: string;
    title: string;
    description: string | null;
    image_url: string;
    user_id: string;
};

type ArtworkReference = {
    artwork_id: string;
};

type FollowReference = {
    following_id: string;
};

type Props = {
    username: string;
    initialArtworks?: Artwork[];
};

function buildArtworkCountMap(rows: ArtworkReference[] | null | undefined) {
    const counts = new Map<string, number>();

    for (const row of rows || []) {
        counts.set(row.artwork_id, (counts.get(row.artwork_id) || 0) + 1);
    }

    return counts;
}

function buildArtworkIdSet(rows: ArtworkReference[] | null | undefined) {
    return new Set((rows || []).map((row) => row.artwork_id));
}

function uniqueIds(ids: string[]) {
    return [...new Set(ids)];
}

function ProfileContent({ username }: Props) {
    const supabase = useMemo(() => createClient(), []);

    const [activeTab, setActiveTab] = useState<Tab>("posts");
    const [profile, setProfile] = useState<Profile | null>(null);

    const [artistWorks, setArtistWorks] = useState<Artwork[]>([]);
    const [savedArtworks, setSavedArtworks] = useState<Artwork[]>([]);
    const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);

    const [viewerUserId, setViewerUserId] = useState<string | null>(null);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let cancelled = false;

        async function loadProfilePage() {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select(
                    "id, name, username, about, description, avatar_url, commissions_open"
                )
                .eq("username", username)
                .single();

            if (cancelled) return;

            if (profileError || !profileData) {
                setProfile(null);
                setArtistWorks([]);
                setSavedArtworks([]);
                setLikedArtworks([]);
                setLoading(false);
                return;
            }

            const currentProfile = profileData as Profile;

            setProfile(currentProfile);
            setViewerUserId(user?.id || null);
            setIsOwnProfile(user?.id === currentProfile.id);

            const [
                ownArtworksResult,
                profileLikesResult,
                profileSavesResult,
            ] = await Promise.all([
                supabase
                    .from("artworks")
                    .select("id, title, description, image_url, user_id")
                    .eq("user_id", currentProfile.id)
                    .order("created_at", { ascending: false }),

                supabase
                    .from("likes")
                    .select("artwork_id")
                    .eq("user_id", currentProfile.id),

                supabase
                    .from("saves")
                    .select("artwork_id")
                    .eq("user_id", currentProfile.id),
            ]);

            if (cancelled) return;

            if (ownArtworksResult.error) {
                console.log(ownArtworksResult.error.message);
            }

            if (profileLikesResult.error) {
                console.log(profileLikesResult.error.message);
            }

            if (profileSavesResult.error) {
                console.log(profileSavesResult.error.message);
            }

            const ownArtworks = (ownArtworksResult.data ||
                []) as SupabaseArtwork[];

            const profileLikedIds = buildArtworkIdSet(
                profileLikesResult.data as ArtworkReference[] | null
            );

            const profileSavedIds = buildArtworkIdSet(
                profileSavesResult.data as ArtworkReference[] | null
            );

            const allRelevantArtworkIds = uniqueIds([
                ...ownArtworks.map((artwork) => artwork.id),
                ...profileLikedIds,
                ...profileSavedIds,
            ]);

            if (allRelevantArtworkIds.length === 0) {
                setArtistWorks([]);
                setSavedArtworks([]);
                setLikedArtworks([]);
                setLoading(false);
                return;
            }

            const { data: relatedArtworksData, error: relatedArtworksError } =
                await supabase
                    .from("artworks")
                    .select("id, title, description, image_url, user_id")
                    .in("id", allRelevantArtworkIds);

            if (cancelled) return;

            if (relatedArtworksError) {
                console.log(relatedArtworksError.message);
                setArtistWorks([]);
                setSavedArtworks([]);
                setLikedArtworks([]);
                setLoading(false);
                return;
            }

            const relatedArtworks = (relatedArtworksData ||
                []) as SupabaseArtwork[];

            const artworkOwnerIds = uniqueIds(
                relatedArtworks.map((artwork) => artwork.user_id)
            );

            const [
                ownersResult,
                likesResult,
                commentsResult,
                repostsResult,
                savesResult,
                viewerLikesResult,
                viewerSavesResult,
                viewerRepostsResult,
                followsResult,
            ] = await Promise.all([
                supabase
                    .from("profiles")
                    .select("id, name, username, avatar_url")
                    .in("id", artworkOwnerIds),

                supabase
                    .from("likes")
                    .select("artwork_id")
                    .in("artwork_id", allRelevantArtworkIds),

                supabase
                    .from("comments")
                    .select("artwork_id")
                    .in("artwork_id", allRelevantArtworkIds),

                supabase
                    .from("reposts")
                    .select("artwork_id")
                    .in("artwork_id", allRelevantArtworkIds),

                supabase
                    .from("saves")
                    .select("artwork_id")
                    .in("artwork_id", allRelevantArtworkIds),

                user
                    ? supabase
                        .from("likes")
                        .select("artwork_id")
                        .eq("user_id", user.id)
                        .in("artwork_id", allRelevantArtworkIds)
                    : Promise.resolve({
                        data: [] as ArtworkReference[],
                        error: null,
                    }),

                user
                    ? supabase
                        .from("saves")
                        .select("artwork_id")
                        .eq("user_id", user.id)
                        .in("artwork_id", allRelevantArtworkIds)
                    : Promise.resolve({
                        data: [] as ArtworkReference[],
                        error: null,
                    }),

                user
                    ? supabase
                        .from("reposts")
                        .select("artwork_id")
                        .eq("user_id", user.id)
                        .in("artwork_id", allRelevantArtworkIds)
                    : Promise.resolve({
                        data: [] as ArtworkReference[],
                        error: null,
                    }),

                user && artworkOwnerIds.length > 0
                    ? supabase
                        .from("follows")
                        .select("following_id")
                        .eq("follower_id", user.id)
                        .in("following_id", artworkOwnerIds)
                    : Promise.resolve({
                        data: [] as FollowReference[],
                        error: null,
                    }),
            ]);

            if (cancelled) return;

            if (ownersResult.error) {
                console.log(ownersResult.error.message);
            }

            const owners = (ownersResult.data || []) as ProfileSummary[];

            const ownerById = new Map<string, ProfileSummary>();

            ownerById.set(currentProfile.id, {
                id: currentProfile.id,
                name: currentProfile.name,
                username: currentProfile.username,
                avatar_url: currentProfile.avatar_url,
            });

            for (const owner of owners) {
                ownerById.set(owner.id, owner);
            }

            const likesByArtwork = buildArtworkCountMap(
                likesResult.data as ArtworkReference[] | null
            );

            const commentsByArtwork = buildArtworkCountMap(
                commentsResult.data as ArtworkReference[] | null
            );

            const repostsByArtwork = buildArtworkCountMap(
                repostsResult.data as ArtworkReference[] | null
            );

            const savesByArtwork = buildArtworkCountMap(
                savesResult.data as ArtworkReference[] | null
            );

            const viewerLikedArtworkIds = buildArtworkIdSet(
                viewerLikesResult.data as ArtworkReference[] | null
            );

            const viewerSavedArtworkIds = buildArtworkIdSet(
                viewerSavesResult.data as ArtworkReference[] | null
            );

            const viewerRepostedArtworkIds = buildArtworkIdSet(
                viewerRepostsResult.data as ArtworkReference[] | null
            );

            const viewerFollowingIds = new Set(
                ((followsResult.data || []) as FollowReference[]).map(
                    (follow) => follow.following_id
                )
            );

            function formatArtwork(artwork: SupabaseArtwork): Artwork {
                const owner = ownerById.get(artwork.user_id);

                return {
                    id: artwork.id,
                    title: artwork.title,
                    artist: owner?.name || "Unknown Artist",
                    username: owner?.username || "unknown",
                    image: artwork.image_url,
                    ownerId: artwork.user_id,
                    avatarUrl: owner?.avatar_url || null,

                    initialLikes: likesByArtwork.get(artwork.id) || 0,
                    initialComments: commentsByArtwork.get(artwork.id) || 0,
                    initialReposts: repostsByArtwork.get(artwork.id) || 0,
                    initialSaves: savesByArtwork.get(artwork.id) || 0,

                    initialLiked: viewerLikedArtworkIds.has(artwork.id),
                    initialSaved: viewerSavedArtworkIds.has(artwork.id),
                    initialReposted: viewerRepostedArtworkIds.has(artwork.id),
                    initialFollowing: viewerFollowingIds.has(artwork.user_id),
                };
            }

            const formattedByArtworkId = new Map<string, Artwork>();

            for (const artwork of relatedArtworks) {
                formattedByArtworkId.set(artwork.id, formatArtwork(artwork));
            }

            const formattedOwnWorks = ownArtworks
                .map((artwork) => formattedByArtworkId.get(artwork.id))
                .filter((artwork): artwork is Artwork => Boolean(artwork));

            const formattedSavedWorks = [...profileSavedIds]
                .map((artworkId) => formattedByArtworkId.get(artworkId))
                .filter((artwork): artwork is Artwork => Boolean(artwork));

            const formattedLikedWorks = [...profileLikedIds]
                .map((artworkId) => formattedByArtworkId.get(artworkId))
                .filter((artwork): artwork is Artwork => Boolean(artwork));

            setArtistWorks(formattedOwnWorks);
            setSavedArtworks(formattedSavedWorks);
            setLikedArtworks(formattedLikedWorks);
            setLoading(false);
        }

        void loadProfilePage();

        return () => {
            cancelled = true;
        };
    }, [username, supabase]);

    async function handleDeleteArtwork(artworkId: string) {
        if (!profile || !isOwnProfile) return;

        const artwork = artistWorks.find((item) => item.id === artworkId);

        if (!artwork) return;

        const confirmed = window.confirm(
            `Delete "${artwork.title}" permanently? This cannot be undone.`
        );

        if (!confirmed) return;

        const { error } = await supabase
            .from("artworks")
            .delete()
            .eq("id", artworkId)
            .eq("user_id", profile.id);

        if (error) {
            alert(error.message);
            return;
        }

        setArtistWorks((current) =>
            current.filter((artworkItem) => artworkItem.id !== artworkId)
        );

        setSavedArtworks((current) =>
            current.filter((artworkItem) => artworkItem.id !== artworkId)
        );

        setLikedArtworks((current) =>
            current.filter((artworkItem) => artworkItem.id !== artworkId)
        );
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <h1 className="text-xl font-bold">Loading profile...</h1>
                    <p className="mt-2 text-zinc-400">
                        Fetching profile artwork activity.
                    </p>
                </div>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <h1 className="text-3xl font-bold">Profile not found</h1>
            </main>
        );
    }

    let visibleArtworks = artistWorks;
    let emptyMessage = "No posts yet";

    if (activeTab === "saved") {
        visibleArtworks = savedArtworks;
        emptyMessage = "No saved artworks yet";
    }

    if (activeTab === "liked") {
        visibleArtworks = likedArtworks;
        emptyMessage = "No liked artworks yet";
    }

    const isCreator =
        profile.username.trim().toLowerCase() === "the_creator";

    return (
        <main className="min-h-screen bg-black text-white">
            <ProfileHeader
                artist={profile.name}
                username={profile.username}
                bio={profile.about || profile.description || "ArtHub creator"}
                avatar={profile.avatar_url}
                isOwnProfile={isOwnProfile}
                commissionsOpen={profile.commissions_open}
                isCreator={isCreator}
            />

            <div className="mx-auto max-w-6xl px-6 pb-16">
                <ProfileStats
                    username={profile.username}
                    artworks={artistWorks.length}
                    saved={savedArtworks.length}
                    liked={likedArtworks.length}
                />

                <ProfileTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    postsCount={artistWorks.length}
                    savedCount={savedArtworks.length}
                    likedCount={likedArtworks.length}
                />

                <ProfileGallery
                    artworks={visibleArtworks}
                    emptyMessage={emptyMessage}
                    viewerUserId={viewerUserId}
                    onDelete={handleDeleteArtwork}
                />
            </div>
        </main>
    );
}

export default function ProfilePageClient(props: Props) {
    return (
        <RequireAuth>
            <ProfileContent {...props} />
        </RequireAuth>
    );
}