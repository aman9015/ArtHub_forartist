"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import ProfileHeader from "@/app/components/profile/profileHeader";
import ProfileStats from "@/app/components/profile/ProfileStats";
import ProfileGallery from "@/app/components/profile/profileGallery";
import ProfileTabs from "@/app/components/profile/ProfileTabs";

const PROFILE_CACHE_TTL_MS = 45_000;

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

type ProfileCache = {
    profile: Profile;
    artistWorks: Artwork[];
    savedArtworks: Artwork[];
    likedArtworks: Artwork[];
    viewerUserId: string | null;
    isOwnProfile: boolean;
    savedAt: number;
};

type LoadProfileOptions = {
    force?: boolean;
    silent?: boolean;
};

const profileCache = new Map<string, ProfileCache>();

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

function ProfileSkeleton() {
    return (
        <main className="min-h-screen bg-black text-white">
            <div className="h-64 animate-pulse bg-zinc-900" />

            <div className="mx-auto max-w-6xl px-6">
                <div className="-mt-16 flex flex-col gap-6 md:flex-row md:items-end">
                    <div className="h-32 w-32 animate-pulse rounded-full border-4 border-black bg-zinc-800" />

                    <div className="space-y-4 pb-2">
                        <div className="h-10 w-56 animate-pulse rounded bg-zinc-800" />
                        <div className="h-5 w-36 animate-pulse rounded bg-zinc-900" />
                        <div className="h-5 w-80 max-w-full animate-pulse rounded bg-zinc-900" />
                    </div>
                </div>

                <div className="mt-12 space-y-6">
                    <div className="h-20 animate-pulse rounded-3xl bg-zinc-950" />

                    <div className="grid gap-5 md:grid-cols-3">
                        {[0, 1, 2].map((item) => (
                            <div
                                key={item}
                                className="aspect-[4/5] animate-pulse rounded-3xl bg-zinc-900"
                            />
                        ))}
                    </div>
                </div>
            </div>
        </main>
    );
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
    const [refreshing, setRefreshing] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const mountedRef = useRef(true);
    const requestVersionRef = useRef(0);
    const cacheKeyRef = useRef<string | null>(null);

    const applyCache = useCallback((cachedProfile: ProfileCache) => {
        setProfile(cachedProfile.profile);
        setArtistWorks(cachedProfile.artistWorks);
        setSavedArtworks(cachedProfile.savedArtworks);
        setLikedArtworks(cachedProfile.likedArtworks);
        setViewerUserId(cachedProfile.viewerUserId);
        setIsOwnProfile(cachedProfile.isOwnProfile);
    }, []);

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;
        };
    }, []);

    const loadProfilePage = useCallback(
        async ({
            force = false,
            silent = false,
        }: LoadProfileOptions = {}): Promise<boolean> => {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user || null;

            const cacheKey = `${user?.id || "guest"}:${username
                .trim()
                .toLowerCase()}`;

            cacheKeyRef.current = cacheKey;

            const cachedProfile = profileCache.get(cacheKey);

            const cacheIsFresh =
                cachedProfile &&
                Date.now() - cachedProfile.savedAt < PROFILE_CACHE_TTL_MS;

            if (cachedProfile && !force && cacheIsFresh) {
                applyCache(cachedProfile);
                setLoading(false);
                setRefreshing(false);
                setErrorMessage("");

                return true;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            if (cachedProfile) {
                applyCache(cachedProfile);
                setLoading(false);

                if (!silent) {
                    setRefreshing(true);
                }
            } else {
                setProfile(null);
                setArtistWorks([]);
                setSavedArtworks([]);
                setLikedArtworks([]);
                setViewerUserId(user?.id || null);
                setIsOwnProfile(false);
                setLoading(true);
            }

            setErrorMessage("");

            try {
                const { data: profileData, error: profileError } =
                    await supabase
                        .from("profiles")
                        .select(
                            "id, name, username, about, description, avatar_url, commissions_open"
                        )
                        .eq("username", username)
                        .single();

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

                if (profileError || !profileData) {
                    profileCache.delete(cacheKey);

                    setProfile(null);
                    setArtistWorks([]);
                    setSavedArtworks([]);
                    setLikedArtworks([]);

                    setErrorMessage(
                        profileError?.message || "Profile could not be found."
                    );

                    return false;
                }

                const currentProfile = profileData as Profile;

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

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

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

                const basicProfileCache: ProfileCache = {
                    profile: currentProfile,
                    artistWorks: [],
                    savedArtworks: [],
                    likedArtworks: [],
                    viewerUserId: user?.id || null,
                    isOwnProfile: user?.id === currentProfile.id,
                    savedAt: Date.now(),
                };

                if (allRelevantArtworkIds.length === 0) {
                    profileCache.set(cacheKey, basicProfileCache);
                    applyCache(basicProfileCache);

                    return false;
                }

                const { data: relatedArtworksData, error: relatedArtworksError } =
                    await supabase
                        .from("artworks")
                        .select("id, title, description, image_url, user_id")
                        .in("id", allRelevantArtworkIds);

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

                if (relatedArtworksError) {
                    throw new Error(relatedArtworksError.message);
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

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

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
                        initialReposted:
                            viewerRepostedArtworkIds.has(artwork.id),
                        initialFollowing: viewerFollowingIds.has(
                            artwork.user_id
                        ),
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

                const nextProfileCache: ProfileCache = {
                    profile: currentProfile,
                    artistWorks: formattedOwnWorks,
                    savedArtworks: formattedSavedWorks,
                    likedArtworks: formattedLikedWorks,
                    viewerUserId: user?.id || null,
                    isOwnProfile: user?.id === currentProfile.id,
                    savedAt: Date.now(),
                };

                profileCache.set(cacheKey, nextProfileCache);
                applyCache(nextProfileCache);

                return false;
            } catch (loadError) {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

                setErrorMessage(
                    loadError instanceof Error
                        ? loadError.message
                        : "Profile could not be loaded."
                );

                return false;
            } finally {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return false;
                }

                setLoading(false);
                setRefreshing(false);
            }
        },
        [applyCache, supabase, username]
    );

    useEffect(() => {
        let cancelled = false;
        let refreshTimer: number | null = null;

        async function loadInitialProfile() {
            const usedCache = await loadProfilePage();

            if (usedCache && !cancelled) {
                refreshTimer = window.setTimeout(() => {
                    void loadProfilePage({
                        force: true,
                        silent: true,
                    });
                }, 0);
            }
        }

        void loadInitialProfile();

        return () => {
            cancelled = true;

            if (refreshTimer) {
                window.clearTimeout(refreshTimer);
            }
        };
    }, [loadProfilePage]);

    const handleDeleteArtwork = useCallback(
        async (artworkId: string) => {
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

            if (cacheKeyRef.current) {
                profileCache.delete(cacheKeyRef.current);
            }
        },
        [artistWorks, isOwnProfile, profile, supabase]
    );

    const visibleArtworks = useMemo(() => {
        if (activeTab === "saved") return savedArtworks;
        if (activeTab === "liked") return likedArtworks;

        return artistWorks;
    }, [activeTab, artistWorks, likedArtworks, savedArtworks]);

    const emptyMessage =
        activeTab === "saved"
            ? "No saved artworks yet"
            : activeTab === "liked"
                ? "No liked artworks yet"
                : "No posts yet";

    if (loading && !profile) {
        return <ProfileSkeleton />;
    }

    if (!profile) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <div className="mx-auto max-w-3xl rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
                    <h1 className="text-3xl font-bold">Profile not found</h1>

                    <p className="mt-3 text-zinc-400">
                        {errorMessage ||
                            "This profile may have been deleted or its username changed."}
                    </p>

                    <button
                        type="button"
                        onClick={() => void loadProfilePage({ force: true })}
                        className="mt-6 rounded-full border border-zinc-700 px-5 py-3 font-semibold transition hover:bg-zinc-900"
                    >
                        Try again
                    </button>
                </div>
            </main>
        );
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
                {refreshing && (
                    <p className="mt-5 text-xs font-medium text-zinc-500">
                        Refreshing profile...
                    </p>
                )}

                {errorMessage && (
                    <div className="mt-5 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>{errorMessage}</p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadProfilePage({
                                    force: true,
                                })
                            }
                            className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
                        >
                            Try again
                        </button>
                    </div>
                )}

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