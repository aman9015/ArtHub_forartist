"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import Feed from "@/app/components/layout/Feed";
import Trending from "@/app/components/layout/Trending";
import { createClient } from "@/app/lib/supabase";
import { addNotification } from "@/app/lib/storage";

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

type DbArtwork = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
  created_at: string;
};

type DbRepost = {
  id: string;
  user_id: string;
  artwork_id: string;
  created_at: string;
};

type Profile = {
  id: string;
  name: string;
  username: string;
  about: string | null;
  avatar_url: string | null;
};

type LoadArtworksOptions = {
  scrollToTop?: boolean;
};

export default function ExplorePage() {
  const supabase = useMemo(() => createClient(), []);

  const [feedArtworks, setFeedArtworks] = useState<FeedArtwork[]>([]);
  const [loading, setLoading] = useState(true);

  const loadArtworks = useCallback(
    async ({ scrollToTop = false }: LoadArtworksOptions = {}) => {
      setLoading(true);

      const [
        { data: artworksData, error: artworksError },
        { data: profilesData, error: profilesError },
        { data: repostsData, error: repostsError },
      ] = await Promise.all([
        supabase
          .from("artworks")
          .select("id, user_id, title, description, image_url, created_at")
          .order("created_at", { ascending: false }),

        supabase
          .from("profiles")
          .select("id, name, username, about, avatar_url"),

        supabase
          .from("reposts")
          .select("id, user_id, artwork_id, created_at")
          .order("created_at", { ascending: false }),
      ]);

      if (artworksError || profilesError || repostsError) {
        alert(
          artworksError?.message ||
            profilesError?.message ||
            repostsError?.message
        );

        setLoading(false);
        return;
      }

      const artworks = (artworksData || []) as DbArtwork[];
      const profiles = (profilesData || []) as Profile[];
      const reposts = (repostsData || []) as DbRepost[];

      const profileById = new Map(
        profiles.map((profile) => [profile.id, profile])
      );

      const artworkById = new Map(
        artworks.map((artwork) => [artwork.id, artwork])
      );

      function createFeedArtwork(
        artwork: DbArtwork,
        feedId: string,
        activityAt: string,
        repostedBy?: RepostedBy
      ): FeedArtwork {
        const artistProfile = profileById.get(artwork.user_id);

        return {
          feedId,
          id: artwork.id,
          title: artwork.title,
          artist: artistProfile?.name || "Unknown Artist",
          username: artistProfile?.username || "unknown",
          bio: artwork.description || artistProfile?.about || "",
          image: artwork.image_url,
          ownerId: artwork.user_id,
          avatarUrl: artistProfile?.avatar_url || null,
          activityAt,
          repostedBy,
        };
      }

      const originalArtworkItems = artworks.map((artwork) =>
        createFeedArtwork(
          artwork,
          `artwork-${artwork.id}`,
          artwork.created_at
        )
      );

      const repostedArtworkItems = reposts.flatMap((repost) => {
        const originalArtwork = artworkById.get(repost.artwork_id);

        if (!originalArtwork) return [];

        const reposterProfile = profileById.get(repost.user_id);

        return [
          createFeedArtwork(
            originalArtwork,
            `repost-${repost.id}`,
            repost.created_at,
            {
              name: reposterProfile?.name || "Unknown User",
              username: reposterProfile?.username || "unknown",
              avatarUrl: reposterProfile?.avatar_url || null,
            }
          ),
        ];
      });

      const combinedFeed = [...originalArtworkItems, ...repostedArtworkItems];

      combinedFeed.sort(
        (first, second) =>
          new Date(second.activityAt).getTime() -
          new Date(first.activityAt).getTime()
      );

      setFeedArtworks(combinedFeed);
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
    [supabase]
  );

  useEffect(() => {
    void loadArtworks();

    function handleManualFeedRefresh() {
      void loadArtworks({ scrollToTop: true });
    }

    window.addEventListener("arthub:refresh-feed", handleManualFeedRefresh);

    return () => {
      window.removeEventListener(
        "arthub:refresh-feed",
        handleManualFeedRefresh
      );
    };
  }, [loadArtworks]);

  function openGlobalUpload() {
    window.dispatchEvent(new Event("arthub:open-upload"));
  }

  async function handleDeleteArtwork(id: string) {
    const confirmDelete = confirm(
      "Are you sure you want to delete this artwork?"
    );

    if (!confirmDelete) return;

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

    await loadArtworks({ scrollToTop: true });
  }

  return (
    <div className="arthub-explore-layout">
      <section className="arthub-explore-feed">
        {loading ? (
          <div className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
            <h2 className="text-xl font-bold">Loading artworks...</h2>
          </div>
        ) : (
          <Feed
            onUploadClick={openGlobalUpload}
            artworks={feedArtworks}
            onDeleteArtwork={handleDeleteArtwork}
          />
        )}
      </section>

      <aside className="arthub-explore-trending">
        <Trending />
      </aside>
    </div>
  );
}