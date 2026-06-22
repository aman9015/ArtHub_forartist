"use client";

import { useEffect, useState } from "react";

import Feed from "@/app/components/layout/Feed";
import Trending from "@/app/components/layout/Trending";
import { createClient } from "@/app/lib/supabase";
import { addNotification } from "@/app/lib/storage";

type Artwork = {
  id: string;
  title: string;
  artist: string;
  username: string;
  bio: string;
  image: string;
  ownerId: string;
  avatarUrl: string | null;
};

type DbArtwork = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  image_url: string;
};

type Profile = {
  id: string;
  name: string;
  username: string;
  about: string | null;
  avatar_url: string | null;
};

export default function ExplorePage() {
  const supabase = createClient();

  const [feedArtworks, setFeedArtworks] = useState<Artwork[]>([]);
  const [loading, setLoading] = useState(true);

  async function loadArtworks() {
    setLoading(true);

    const { data: artworksData, error: artworksError } = await supabase
      .from("artworks")
      .select("id, user_id, title, description, image_url")
      .order("created_at", { ascending: false });

    const { data: profilesData, error: profilesError } = await supabase
      .from("profiles")
      .select("id, name, username, about, avatar_url");

    if (artworksError || profilesError) {
      alert(artworksError?.message || profilesError?.message);
      setLoading(false);
      return;
    }

    const profiles = (profilesData || []) as Profile[];

    const formattedArtworks: Artwork[] = (
      (artworksData || []) as DbArtwork[]
    ).map((artwork) => {
      const profile = profiles.find((item) => item.id === artwork.user_id);

      return {
        id: artwork.id,
        title: artwork.title,
        artist: profile?.name || "Unknown Artist",
        username: profile?.username || "unknown",
        bio: artwork.description || profile?.about || "",
        image: artwork.image_url,
        ownerId: artwork.user_id,
        avatarUrl: profile?.avatar_url || null,
      };
    });

    setFeedArtworks(formattedArtworks);
    setLoading(false);
  }

  useEffect(() => {
    void loadArtworks();

    function refreshFeedAfterUpload() {
      void loadArtworks();
    }

    window.addEventListener("arthub:artwork-created", refreshFeedAfterUpload);

    return () => {
      window.removeEventListener(
        "arthub:artwork-created",
        refreshFeedAfterUpload
      );
    };
  }, []);

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

    await loadArtworks();
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