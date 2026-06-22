
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

type LoadPageOptions = {
  reset?: boolean;
  scrollToTop?: boolean;
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

  const cursorRef = useRef<FeedCursor | null>(null);
  const requestVersionRef = useRef(0);

  const initialLoadingRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const hasMoreRef = useRef(true);

  const scrollOnNextResetRef = useRef(false);

  const activeFeedKey =
    activeFeed === "following"
      ? "following"
      : `discover-${discoverMode}`;

  useEffect(() => {
    let isMounted = true;

    async function loadViewer() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (isMounted) {
        setViewerUserId(user?.id || null);
      }
    }

    void loadViewer();

    return () => {
      isMounted = false;
    };
  }, [supabase]);

  const loadPage = useCallback(
    async ({
      reset = false,
      scrollToTop = false,
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

      const requestedCursor = reset ? null : cursorRef.current;

      if (reset) {
        initialLoadingRef.current = true;
        loadingMoreRef.current = false;
        hasMoreRef.current = true;

        setInitialLoading(true);
        setLoadingMore(false);
        setHasMore(true);
      } else {
        loadingMoreRef.current = true;
        setLoadingMore(true);
      }

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

      if (requestVersion !== requestVersionRef.current) {
        return;
      }

      const { data, error } = response;

      if (error) {
        alert(error.message);

        initialLoadingRef.current = false;
        loadingMoreRef.current = false;

        setInitialLoading(false);
        setLoadingMore(false);

        return;
      }

      const rawRows = (data || []) as FeedRow[];

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

      cursorRef.current = lastItem
        ? {
            eventCreatedAt: lastItem.event_created_at,
            eventId: lastItem.event_id,
            trendingScore: getTrendingScore(lastItem.trending_score),
          }
        : null;

      const moreItemsExist = rawRows.length === PAGE_SIZE;

      hasMoreRef.current = moreItemsExist;
      setHasMore(moreItemsExist);

      if (reset) {
        setFeedArtworks(formattedFeed);
        window.dispatchEvent(new Event("arthub:feed-refreshed"));
      } else {
        setFeedArtworks((previous) => {
          const knownFeedIds = new Set(
            previous.map((artwork) => artwork.feedId)
          );

          const newItems = formattedFeed.filter(
            (artwork) => !knownFeedIds.has(artwork.feedId)
          );

          return [...previous, ...newItems];
        });
      }

      if (scrollToTop) {
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        });
      }

      initialLoadingRef.current = false;
      loadingMoreRef.current = false;

      setInitialLoading(false);
      setLoadingMore(false);
    },
    [activeFeed, discoverMode, supabase]
  );

  useEffect(() => {
    const shouldScrollToTop = scrollOnNextResetRef.current;
    scrollOnNextResetRef.current = false;

    cursorRef.current = null;

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

    const artworkToDelete = feedArtworks.find(
      (artwork) => artwork.id === id
    );

    const { error } = await supabase.from("artworks").delete().eq("id", id);

    if (error) {
      alert(error.message);
      return;
    }

    if (artworkToDelete) {
      addNotification({
        type: "delete",
        user: "You",
        message: "deleted an artwork",
        artwork: artworkToDelete.title,
      });
    }

    await loadPage({
      reset: true,
      scrollToTop: true,
    });
  }

  return (
    <div className="arthub-explore-layout">
      <section className="arthub-explore-feed">
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

