"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Feed from "@/app/components/layout/Feed";
import Trending from "@/app/components/layout/Trending";
import { createClient } from "@/app/lib/supabase";
import { addNotification } from "@/app/lib/storage";

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
};

type LoadFeedOptions = {
  scrollToTop?: boolean;
};

export default function ExplorePage() {
  const supabase = useMemo(() => createClient(), []);

  const [activeFeed, setActiveFeed] = useState<FeedType>("following");
  const [discoverMode, setDiscoverMode] =
    useState<DiscoverMode>("recent");

  const [feedArtworks, setFeedArtworks] = useState<FeedArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  const loadFeed = useCallback(
    async ({ scrollToTop = false }: LoadFeedOptions = {}) => {
      setLoading(true);

      const response =
        activeFeed === "following"
          ? await supabase.rpc("get_following_feed", {
              p_limit: 30,
              p_before: null,
            })
          : await supabase.rpc("get_discover_feed", {
              p_mode: discoverMode,
              p_limit: 30,
              p_before: null,
            });

      const { data, error } = response;

      if (error) {
        alert(error.message);
        setLoading(false);
        return;
      }

      const formattedFeed: FeedArtwork[] = ((data || []) as FeedRow[]).map(
        (item) => {
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

            repostedBy: isFollowingRepost
              ? {
                  name: item.actor_name || "Unknown User",
                  username: item.actor_username || "unknown",
                  avatarUrl: item.actor_avatar_url || null,
                }
              : undefined,
          };
        }
      );

      setFeedArtworks(formattedFeed);
      setLoading(false);

      window.dispatchEvent(new Event("arthub:feed-refreshed"));

      if (scrollToTop) {
        window.requestAnimationFrame(() => {
          window.scrollTo({
            top: 0,
            behavior: "smooth",
          });
        });
      }
    },
    [activeFeed, discoverMode, supabase]
  );

  useEffect(() => {
    void loadFeed();

    function refreshFromExploreButton() {
      void loadFeed({ scrollToTop: true });
    }

    function refreshAfterArtworkActivity() {
      void loadFeed();
    }

    window.addEventListener("arthub:refresh-feed", refreshFromExploreButton);
    window.addEventListener(
      "arthub:artwork-created",
      refreshAfterArtworkActivity
    );
    window.addEventListener(
      "arthub:repost-changed",
      refreshAfterArtworkActivity
    );

    return () => {
      window.removeEventListener(
        "arthub:refresh-feed",
        refreshFromExploreButton
      );
      window.removeEventListener(
        "arthub:artwork-created",
        refreshAfterArtworkActivity
      );
      window.removeEventListener(
        "arthub:repost-changed",
        refreshAfterArtworkActivity
      );
    };
  }, [loadFeed]);

  function scrollToTop() {
    window.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  }

  function handleFeedChange(nextFeed: FeedType) {
    if (nextFeed === activeFeed) {
      void loadFeed({ scrollToTop: true });
      return;
    }

    setActiveFeed(nextFeed);
    scrollToTop();
  }

  function handleDiscoverModeChange(nextMode: DiscoverMode) {
    if (nextMode === discoverMode) {
      void loadFeed({ scrollToTop: true });
      return;
    }

    setDiscoverMode(nextMode);
    scrollToTop();
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

    await loadFeed({ scrollToTop: true });
  }

  return (
    <div className="arthub-explore-layout">
      <section className="arthub-explore-feed">
        <Feed
          onUploadClick={openGlobalUpload}
          artworks={feedArtworks}
          onDeleteArtwork={handleDeleteArtwork}
          loading={loading}
          activeFeed={activeFeed}
          discoverMode={discoverMode}
          onFeedChange={handleFeedChange}
          onDiscoverModeChange={handleDiscoverModeChange}
        />
      </section>

      <aside className="arthub-explore-trending">
        <Trending />
      </aside>
    </div>
  );
}