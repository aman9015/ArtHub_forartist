
"use client";

import { useEffect, useMemo, useRef, useState } from "react";
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
};

type FeedProps = {
  onUploadClick: () => void;
  artworks: Artwork[];
  onDeleteArtwork: (id: string) => void;

  initialLoading?: boolean;
  loadingMore?: boolean;
  hasMore?: boolean;

  activeFeed?: FeedType;
  discoverMode?: DiscoverMode;

  onFeedChange?: (feed: FeedType) => void;
  onDiscoverModeChange?: (mode: DiscoverMode) => void;
  onLoadMore?: () => void;
};

export default function Feed({
  onUploadClick,
  artworks,
  onDeleteArtwork,
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
  const loadMoreSentinelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSearchQuery("");
  }, [activeFeed, discoverMode]);

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
        if (entries[0]?.isIntersecting) {
          onLoadMore();
        }
      },
      {
        root: null,
        rootMargin: "650px 0px",
        threshold: 0.01,
      }
    );

    observer.observe(sentinel);

    return () => {
      observer.disconnect();
    };
  }, [hasMore, initialLoading, loadingMore, onLoadMore]);

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

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
  }, [searchQuery, artworks]);

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
      : "No artwork found";

  const emptyDescription =
    activeFeed === "following"
      ? "Follow artists or upload your first artwork to build your feed."
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
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeFeed === "following"
                    ? "bg-white text-black"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                Following
              </button>

              <button
                type="button"
                onClick={() => onFeedChange?.("discover")}
                className={`rounded-xl px-4 py-2 text-sm font-semibold transition ${
                  activeFeed === "discover"
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
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    discoverMode === "recent"
                      ? "bg-zinc-800 text-white"
                      : "text-zinc-500 hover:text-white"
                  }`}
                >
                  Recent
                </button>

                <button
                  type="button"
                  onClick={() => onDiscoverModeChange?.("trending")}
                  className={`rounded-xl px-3 py-2 text-xs font-semibold transition ${
                    discoverMode === "trending"
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
            {filteredArtworks.length !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        )}
      </section>

      {initialLoading ? (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <h2 className="text-xl font-bold">Loading artwork...</h2>
          <p className="mt-2 text-sm text-zinc-500">
            Curating your ArtHub feed.
          </p>
        </div>
      ) : filteredArtworks.length > 0 ? (
        <>
          {filteredArtworks.map((artwork) => (
            <ArtworkCard
              key={`${activeFeed}-${artwork.feedId || artwork.id}`}
              id={artwork.id}
              image={artwork.image}
              title={artwork.title}
              artist={artwork.artist}
              username={artwork.username}
              ownerId={artwork.ownerId}
              avatarUrl={artwork.avatarUrl}
              repostedBy={artwork.repostedBy}
              onDelete={onDeleteArtwork}
            />
          ))}

          <div
            ref={loadMoreSentinelRef}
            className="flex min-h-16 items-center justify-center py-4"
            aria-live="polite"
          >
            {loadingMore ? (
              <span className="text-sm text-zinc-400">
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

