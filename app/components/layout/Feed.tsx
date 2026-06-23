"use client";

import {
  memo,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import ArtworkCard from "@/app/components/ArtworkCard";
import Topbar from "./Topbar";

type FeedType = "following" | "discover";
type DiscoverMode = "recent" | "trending";

type RepostedBy = {
  name: string;
  username: string;
  avatarUrl: string | null;
};

type Artwork = {
  feedId?: string;
  id: string;
  title: string;
  artist: string;
  username: string;
  bio: string;
  image: string;
  ownerId: string;
  avatarUrl: string | null;
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

type FeedProps = {
  onUploadClick: () => void;
  artworks: Artwork[];
  onDeleteArtwork: (id: string) => void;
  viewerUserId: string | null;

  initialLoading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;

  activeFeed?: FeedType;
  discoverMode?: DiscoverMode;

  onFeedChange?: (feed: FeedType) => void;
  onDiscoverModeChange?: (mode: DiscoverMode) => void;
  onLoadMore?: () => void;
};

type FeedArtworkCardProps = {
  artwork: Artwork;
  viewerUserId: string | null;
  onDeleteArtwork: (id: string) => void;
};

const FeedArtworkCard = memo(function FeedArtworkCard({
  artwork,
  viewerUserId,
  onDeleteArtwork,
}: FeedArtworkCardProps) {
  return (
    <ArtworkCard
      id={artwork.id}
      image={artwork.image}
      title={artwork.title}
      artist={artwork.artist}
      username={artwork.username}
      ownerId={artwork.ownerId}
      avatarUrl={artwork.avatarUrl}
      repostedBy={artwork.repostedBy}
      viewerUserId={viewerUserId}
      initialLikes={artwork.likeCount}
      initialComments={artwork.commentCount}
      initialReposts={artwork.repostCount}
      initialSaves={artwork.saveCount}
      initialLiked={artwork.viewerLiked}
      initialSaved={artwork.viewerSaved}
      initialReposted={artwork.viewerReposted}
      initialFollowing={artwork.viewerFollowsArtist}
      onDelete={onDeleteArtwork}
    />
  );
});

function FeedSkeleton() {
  return (
    <div className="space-y-6">
      {[0, 1, 2].map((item) => (
        <div
          key={item}
          className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
        >
          <div className="flex items-center gap-3 p-5">
            <div className="h-11 w-11 animate-pulse rounded-full bg-zinc-800" />

            <div className="space-y-2">
              <div className="h-4 w-32 animate-pulse rounded bg-zinc-800" />
              <div className="h-3 w-20 animate-pulse rounded bg-zinc-900" />
            </div>
          </div>

          <div className="h-[420px] animate-pulse bg-zinc-900 sm:h-[520px]" />

          <div className="space-y-4 p-5">
            <div className="h-6 w-48 animate-pulse rounded bg-zinc-800" />

            <div className="flex gap-5">
              <div className="h-5 w-12 animate-pulse rounded bg-zinc-800" />
              <div className="h-5 w-12 animate-pulse rounded bg-zinc-800" />
              <div className="h-5 w-12 animate-pulse rounded bg-zinc-800" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Feed({
  onUploadClick,
  artworks,
  onDeleteArtwork,
  viewerUserId,
  initialLoading = false,
  loadingMore = false,
  hasMore = false,
  activeFeed = "following",
  discoverMode = "recent",
  onFeedChange,
  onDiscoverModeChange,
  onLoadMore,
}: FeedProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const deferredSearchQuery = useDeferredValue(searchQuery);

  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);
  const loadMoreTriggeredRef = useRef(false);
  const onDeleteArtworkRef = useRef(onDeleteArtwork);

  useEffect(() => {
    onDeleteArtworkRef.current = onDeleteArtwork;
  }, [onDeleteArtwork]);

  const handleDeleteArtwork = useCallback((id: string) => {
    onDeleteArtworkRef.current(id);
  }, []);

  useEffect(() => {
    setSearchQuery("");
  }, [activeFeed, discoverMode]);

  useEffect(() => {
    if (!loadingMore) {
      loadMoreTriggeredRef.current = false;
    }
  }, [loadingMore]);

  useEffect(() => {
    const sentinel = loadMoreSentinelRef.current;

    if (
      !sentinel ||
      !hasMore ||
      initialLoading ||
      loadingMore ||
      !onLoadMore
    ) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const isVisible = entries[0]?.isIntersecting;

        if (!isVisible || loadMoreTriggeredRef.current) {
          return;
        }

        loadMoreTriggeredRef.current = true;
        onLoadMore();
      },
      {
        root: null,
        rootMargin: "700px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, initialLoading, loadingMore, onLoadMore]);

  const filteredArtworks = useMemo(() => {
    const query = deferredSearchQuery.toLowerCase().trim();

    if (!query) return artworks;

    return artworks.filter((artwork) => {
      const repostMatches = artwork.repostedBy
        ? artwork.repostedBy.name.toLowerCase().includes(query) ||
        artwork.repostedBy.username.toLowerCase().includes(query)
        : false;

      return (
        artwork.title.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        artwork.username.toLowerCase().includes(query) ||
        artwork.bio.toLowerCase().includes(query) ||
        repostMatches
      );
    });
  }, [artworks, deferredSearchQuery]);

  const heading =
    activeFeed === "following"
      ? "Following"
      : discoverMode === "recent"
        ? "Discover · Recent"
        : "Discover · Trending";

  const description =
    activeFeed === "following"
      ? "Artwork and reposts from you and people you follow."
      : discoverMode === "recent"
        ? "Fresh public artwork from artists across ArtHub."
        : "Popular public artwork ranked by engagement and freshness.";

  const emptyTitle =
    activeFeed === "following"
      ? "Your Following feed is empty"
      : searchQuery
        ? "No matching artwork found"
        : "No artwork found";

  const emptyDescription =
    activeFeed === "following"
      ? "Follow artists or upload your first artwork to build your feed."
      : searchQuery
        ? "Try another title, artist name, username, or keyword."
        : "Try switching between Recent and Trending.";

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Topbar
        onUploadClick={onUploadClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <div className="flex flex-col gap-4">
          <div>
            <h1 className="text-2xl font-bold">{heading}</h1>
            <p className="mt-1 text-zinc-400">{description}</p>
          </div>

          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex rounded-2xl bg-zinc-900 p-1">
              <button
                type="button"
                onClick={() => onFeedChange?.("following")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeFeed === "following"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                  }`}
              >
                Following
              </button>

              <button
                type="button"
                onClick={() => onFeedChange?.("discover")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${activeFeed === "discover"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                  }`}
              >
                Discover
              </button>
            </div>

            {activeFeed === "discover" && (
              <div className="flex rounded-2xl border border-zinc-800 bg-zinc-950 p-1">
                <button
                  type="button"
                  onClick={() => onDiscoverModeChange?.("recent")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${discoverMode === "recent"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white"
                    }`}
                >
                  Recent
                </button>

                <button
                  type="button"
                  onClick={() => onDiscoverModeChange?.("trending")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${discoverMode === "trending"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white"
                    }`}
                >
                  Trending
                </button>
              </div>
            )}
          </div>
        </div>

        {searchQuery && !initialLoading && (
          <p className="mt-4 text-sm text-zinc-500">
            Showing {filteredArtworks.length} result
            {filteredArtworks.length !== 1 ? "s" : ""} for &quot;
            {searchQuery}&quot;
          </p>
        )}
      </section>

      {initialLoading ? (
        <FeedSkeleton />
      ) : filteredArtworks.length > 0 ? (
        <>
          {filteredArtworks.map((artwork) => (
            <FeedArtworkCard
              key={artwork.feedId || artwork.id}
              artwork={artwork}
              viewerUserId={viewerUserId}
              onDeleteArtwork={handleDeleteArtwork}
            />
          ))}

          <div
            ref={loadMoreSentinelRef}
            className="flex min-h-16 items-center justify-center py-4"
            aria-live="polite"
          >
            {loadingMore ? (
              <span className="flex items-center gap-2 text-sm text-zinc-400">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-zinc-700 border-t-white" />
                Loading more artwork...
              </span>
            ) : hasMore ? (
              <span className="text-xs text-zinc-600">
                Keep scrolling for more
              </span>
            ) : (
              <span className="text-xs text-zinc-600">
                You&apos;re all caught up.
              </span>
            )}
          </div>
        </>
      ) : (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <h2 className="text-xl font-bold">{emptyTitle}</h2>
          <p className="mt-2 text-zinc-400">{emptyDescription}</p>
        </div>
      )}
    </section>
  );
}