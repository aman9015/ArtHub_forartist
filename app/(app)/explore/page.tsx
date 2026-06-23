"use client";

import {
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";

import Feed from "@/app/components/layout/Feed";
import Trending from "@/app/components/layout/Trending";
import { createClient } from "@/app/lib/supabase";
import { addNotification } from "@/app/lib/storage";

const PAGE_SIZE = 12;
const FEED_CACHE_TTL_MS = 45_000;

type FeedType = "following" | "discover";
type DiscoverMode = "recent" | "trending";

type RepostedBy = {
    name: string;
    username: string;
    avatarUrl: string | null;
};

type FeedArtwork = {
    feedId: string;
    id: string;
    title: string;
    artist: string;
    username: string;
    bio: string;
    image: string;
    ownerId: string;
    avatarUrl: string | null;
    activityAt: string;
    repostedBy?: RepostedBy;

    likeCount: number;
    commentCount: number;
    repostCount: number;
    saveCount: number;

    viewerLiked: boolean;
    viewerSaved: boolean;
    viewerReposted: boolean;
    viewerFollowsArtist: boolean;
};

type FeedRow = {
    event_id: string;
    event_type: "upload" | "repost";
    event_created_at: string;

    actor_id: string;
    actor_name: string;
    actor_username: string;
    actor_avatar_url: string | null;

    artwork_id: string;
    artwork_title: string;
    artwork_description: string | null;
    artwork_image_url: string;

    artist_id: string;
    artist_name: string;
    artist_username: string;
    artist_about: string | null;
    artist_avatar_url: string | null;

    like_count: number | string | null;
    comment_count: number | string | null;
    repost_count: number | string | null;
    save_count: number | string | null;

    viewer_liked: boolean;
    viewer_saved: boolean;
    viewer_reposted: boolean;
    viewer_follows_artist: boolean;

    trending_score?: number | string | null;
};

type FeedCursor = {
    eventCreatedAt: string;
    eventId: string;
    trendingScore: number | null;
};

type FeedCacheEntry = {
    artworks: FeedArtwork[];
    cursor: FeedCursor | null;
    hasMore: boolean;
    savedAt: number;
};

type LoadPageOptions = {
    reset?: boolean;
    scrollToTop?: boolean;
    silent?: boolean;
};

function getTrendingScore(value: number | string | null | undefined) {
    if (value === null || value === undefined) return null;

    const score = Number(value);

    return Number.isFinite(score) ? score : null;
}

function getCount(value: number | string | null | undefined) {
    const count = Number(value);

    return Number.isFinite(count) ? count : 0;
}

export default function ExplorePage() {
    const supabase = useMemo(() => createClient(), []);

    const [activeFeed, setActiveFeed] = useState<FeedType>("following");
    const [discoverMode, setDiscoverMode] =
        useState<DiscoverMode>("recent");

    const [viewerUserId, setViewerUserId] = useState<string | null>(null);

    const [feedArtworks, setFeedArtworks] = useState<FeedArtwork[]>([]);
    const [initialLoading, setInitialLoading] = useState(true);
    const [loadingMore, setLoadingMore] = useState(false);
    const [hasMore, setHasMore] = useState(true);
    const [feedError, setFeedError] = useState<string | null>(null);

    const cursorRef = useRef<FeedCursor | null>(null);
    const requestVersionRef = useRef(0);

    const initialLoadingRef = useRef(true);
    const loadingMoreRef = useRef(false);
    const hasMoreRef = useRef(true);

    const feedArtworksRef = useRef<FeedArtwork[]>([]);
    const feedCacheRef = useRef<Map<string, FeedCacheEntry>>(new Map());
    const mountedRef = useRef(true);

    const scrollOnNextResetRef = useRef(false);

    const activeFeedKey =
        activeFeed === "following"
            ? "following"
            : `discover-${discoverMode}`;

    const commitFeed = useCallback(
        (
            cacheKey: string,
            nextArtworks: FeedArtwork[],
            cursor: FeedCursor | null,
            moreItemsExist: boolean
        ) => {
            feedArtworksRef.current = nextArtworks;

            feedCacheRef.current.set(cacheKey, {
                artworks: nextArtworks,
                cursor,
                hasMore: moreItemsExist,
                savedAt: Date.now(),
            });

            if (mountedRef.current) {
                setFeedArtworks(nextArtworks);
            }
        },
        []
    );

    useEffect(() => {
        mountedRef.current = true;

        return () => {
            mountedRef.current = false;
            requestVersionRef.current += 1;
        };
    }, []);

    useEffect(() => {
        let cancelled = false;

        async function loadViewer() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!cancelled && mountedRef.current) {
                setViewerUserId(user?.id || null);
            }
        }

        void loadViewer();

        return () => {
            cancelled = true;
        };
    }, [supabase]);

    const loadPage = useCallback(
        async ({
            reset = false,
            scrollToTop = false,
            silent = false,
        }: LoadPageOptions = {}) => {
            if (
                !reset &&
                (initialLoadingRef.current ||
                    loadingMoreRef.current ||
                    !hasMoreRef.current)
            ) {
                return;
            }

            const requestVersion = requestVersionRef.current + 1;
            requestVersionRef.current = requestVersion;

            const requestFeedKey = activeFeedKey;
            const requestedCursor = reset ? null : cursorRef.current;

            setFeedError(null);

            if (reset) {
                initialLoadingRef.current = true;
                loadingMoreRef.current = false;
                hasMoreRef.current = true;

                if (mountedRef.current) {
                    setLoadingMore(false);
                    setHasMore(true);

                    if (!silent) {
                        setInitialLoading(true);
                    }
                }
            } else {
                loadingMoreRef.current = true;

                if (mountedRef.current) {
                    setLoadingMore(true);
                }
            }

            try {
                const response =
                    activeFeed === "following"
                        ? await supabase.rpc("get_following_feed", {
                            p_limit: PAGE_SIZE,
                            p_before: requestedCursor?.eventCreatedAt ?? null,
                            p_before_id: requestedCursor?.eventId ?? null,
                        })
                        : await supabase.rpc("get_discover_feed", {
                            p_mode: discoverMode,
                            p_limit: PAGE_SIZE,
                            p_before: requestedCursor?.eventCreatedAt ?? null,
                            p_before_id: requestedCursor?.eventId ?? null,
                            p_before_score:
                                discoverMode === "trending"
                                    ? requestedCursor?.trendingScore ?? null
                                    : null,
                        });

                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                if (response.error) {
                    throw new Error(response.error.message);
                }

                const rawRows = (response.data || []) as FeedRow[];

                const formattedFeed: FeedArtwork[] = rawRows.map((item) => {
                    const isFollowingRepost =
                        activeFeed === "following" && item.event_type === "repost";

                    return {
                        feedId: item.event_id,
                        id: item.artwork_id,
                        title: item.artwork_title,
                        artist: item.artist_name || "Unknown Artist",
                        username: item.artist_username || "unknown",
                        bio: item.artwork_description || item.artist_about || "",
                        image: item.artwork_image_url,
                        ownerId: item.artist_id,
                        avatarUrl: item.artist_avatar_url || null,
                        activityAt: item.event_created_at,

                        likeCount: getCount(item.like_count),
                        commentCount: getCount(item.comment_count),
                        repostCount: getCount(item.repost_count),
                        saveCount: getCount(item.save_count),

                        viewerLiked: Boolean(item.viewer_liked),
                        viewerSaved: Boolean(item.viewer_saved),
                        viewerReposted: Boolean(item.viewer_reposted),
                        viewerFollowsArtist: Boolean(item.viewer_follows_artist),

                        repostedBy: isFollowingRepost
                            ? {
                                name: item.actor_name || "Unknown User",
                                username: item.actor_username || "unknown",
                                avatarUrl: item.actor_avatar_url || null,
                            }
                            : undefined,
                    };
                });

                const lastItem = rawRows.at(-1);

                const nextCursor = lastItem
                    ? {
                        eventCreatedAt: lastItem.event_created_at,
                        eventId: lastItem.event_id,
                        trendingScore: getTrendingScore(lastItem.trending_score),
                    }
                    : null;

                const moreItemsExist = rawRows.length === PAGE_SIZE;

                cursorRef.current = nextCursor;
                hasMoreRef.current = moreItemsExist;

                if (reset) {
                    commitFeed(
                        requestFeedKey,
                        formattedFeed,
                        nextCursor,
                        moreItemsExist
                    );

                    window.dispatchEvent(new Event("arthub:feed-refreshed"));
                } else {
                    const knownFeedIds = new Set(
                        feedArtworksRef.current.map((artwork) => artwork.feedId)
                    );

                    const newItems = formattedFeed.filter(
                        (artwork) => !knownFeedIds.has(artwork.feedId)
                    );

                    commitFeed(
                        requestFeedKey,
                        [...feedArtworksRef.current, ...newItems],
                        nextCursor,
                        moreItemsExist
                    );
                }

                if (mountedRef.current) {
                    setHasMore(moreItemsExist);
                }

                if (scrollToTop) {
                    window.requestAnimationFrame(() => {
                        window.scrollTo({
                            top: 0,
                            behavior: "smooth",
                        });
                    });
                }
            } catch (error) {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                const message =
                    error instanceof Error
                        ? error.message
                        : "We could not load this feed. Please try again.";

                setFeedError(message);
            } finally {
                if (
                    !mountedRef.current ||
                    requestVersion !== requestVersionRef.current
                ) {
                    return;
                }

                initialLoadingRef.current = false;
                loadingMoreRef.current = false;

                setInitialLoading(false);
                setLoadingMore(false);
            }
        },
        [
            activeFeed,
            activeFeedKey,
            commitFeed,
            discoverMode,
            supabase,
        ]
    );

    useEffect(() => {
        const shouldScrollToTop = scrollOnNextResetRef.current;
        scrollOnNextResetRef.current = false;

        const cachedFeed = feedCacheRef.current.get(activeFeedKey);

        const canUseCache =
            cachedFeed &&
            Date.now() - cachedFeed.savedAt < FEED_CACHE_TTL_MS;

        if (canUseCache && cachedFeed) {
            feedArtworksRef.current = cachedFeed.artworks;
            cursorRef.current = cachedFeed.cursor;
            hasMoreRef.current = cachedFeed.hasMore;

            setFeedArtworks(cachedFeed.artworks);
            setHasMore(cachedFeed.hasMore);
            setInitialLoading(false);
            setLoadingMore(false);
            setFeedError(null);

            // Shows the cached feed instantly, then quietly refreshes it.
            void loadPage({
                reset: true,
                scrollToTop: shouldScrollToTop,
                silent: true,
            });

            return;
        }

        cursorRef.current = null;
        feedArtworksRef.current = [];

        setFeedArtworks([]);
        setFeedError(null);

        void loadPage({
            reset: true,
            scrollToTop: shouldScrollToTop,
        });
    }, [activeFeedKey, loadPage]);

    useEffect(() => {
        function refreshFeedFromExploreIcon() {
            void loadPage({
                reset: true,
                scrollToTop: true,
                silent: feedArtworksRef.current.length > 0,
            });
        }

        window.addEventListener(
            "arthub:refresh-feed",
            refreshFeedFromExploreIcon
        );

        return () => {
            window.removeEventListener(
                "arthub:refresh-feed",
                refreshFeedFromExploreIcon
            );
        };
    }, [loadPage]);

    const handleLoadMore = useCallback(() => {
        void loadPage({ reset: false });
    }, [loadPage]);

    function handleFeedChange(nextFeed: FeedType) {
        if (nextFeed === activeFeed) {
            void loadPage({
                reset: true,
                scrollToTop: true,
                silent: feedArtworksRef.current.length > 0,
            });
            return;
        }

        scrollOnNextResetRef.current = true;
        setActiveFeed(nextFeed);
    }

    function handleDiscoverModeChange(nextMode: DiscoverMode) {
        if (nextMode === discoverMode) {
            void loadPage({
                reset: true,
                scrollToTop: true,
                silent: feedArtworksRef.current.length > 0,
            });
            return;
        }

        scrollOnNextResetRef.current = true;
        setDiscoverMode(nextMode);
    }

    function openGlobalUpload() {
        window.dispatchEvent(new Event("arthub:open-upload"));
    }

    async function handleDeleteArtwork(id: string) {
        const confirmed = window.confirm(
            "Are you sure you want to delete this artwork?"
        );

        if (!confirmed) return;

        const artworkToDelete = feedArtworksRef.current.find(
            (artwork) => artwork.id === id
        );

        const { error } = await supabase.from("artworks").delete().eq("id", id);

        if (error) {
            alert(error.message);
            return;
        }

        const remainingArtworks = feedArtworksRef.current.filter(
            (artwork) => artwork.id !== id
        );

        commitFeed(
            activeFeedKey,
            remainingArtworks,
            cursorRef.current,
            hasMoreRef.current
        );

        if (artworkToDelete) {
            addNotification({
                type: "delete",
                user: "You",
                message: "deleted an artwork",
                artwork: artworkToDelete.title,
            });
        }

        // Quietly sync with the server after the instant UI update.
        void loadPage({
            reset: true,
            silent: true,
        });
    }

    return (
        <div className="arthub-explore-layout">
            <section className="arthub-explore-feed">
                {feedError && (
                    <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
                        <p>{feedError}</p>

                        <button
                            type="button"
                            onClick={() =>
                                void loadPage({
                                    reset: true,
                                    silent: feedArtworksRef.current.length > 0,
                                })
                            }
                            className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
                        >
                            Try again
                        </button>
                    </div>
                )}

                <Feed
                    onUploadClick={openGlobalUpload}
                    artworks={feedArtworks}
                    onDeleteArtwork={handleDeleteArtwork}
                    viewerUserId={viewerUserId}
                    initialLoading={initialLoading}
                    loadingMore={loadingMore}
                    hasMore={hasMore}
                    activeFeed={activeFeed}
                    discoverMode={discoverMode}
                    onFeedChange={handleFeedChange}
                    onDiscoverModeChange={handleDiscoverModeChange}
                    onLoadMore={handleLoadMore}
                />
            </section>

            <aside className="arthub-explore-trending">
                <Trending />
            </aside>
        </div>
    );
}