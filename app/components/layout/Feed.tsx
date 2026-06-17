"use client";

import { useMemo, useState } from "react";
import ArtworkCard from "@/app/components/ArtworkCard";
import Topbar from "./Topbar";

type Artwork = {
  id: number;
  title: string;
  artist: string;
  username: string;
  bio: string;
  image: string;
};

type FeedProps = {
  onUploadClick: () => void;
  artworks: Artwork[];
};

export default function Feed({ onUploadClick, artworks }: FeedProps) {
  const [searchQuery, setSearchQuery] = useState("");

  const filteredArtworks = useMemo(() => {
    const query = searchQuery.toLowerCase().trim();

    if (!query) return artworks;

    return artworks.filter((artwork) => {
      return (
        artwork.title.toLowerCase().includes(query) ||
        artwork.artist.toLowerCase().includes(query) ||
        artwork.username.toLowerCase().includes(query) ||
        artwork.bio.toLowerCase().includes(query)
      );
    });
  }, [searchQuery, artworks]);

  return (
    <section className="mx-auto flex w-full max-w-2xl flex-col gap-6">
      <Topbar
        onUploadClick={onUploadClick}
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
      />

      <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
        <h1 className="text-2xl font-bold">Explore Art</h1>
        <p className="mt-1 text-zinc-400">
          Discover fresh artwork from artists around the world.
        </p>

        {searchQuery && (
          <p className="mt-3 text-sm text-zinc-500">
            Showing {filteredArtworks.length} result
            {filteredArtworks.length !== 1 ? "s" : ""} for "{searchQuery}"
          </p>
        )}
      </div>

      {filteredArtworks.length > 0 ? (
        filteredArtworks.map((artwork) => (
          <ArtworkCard
            key={artwork.id}
            image={artwork.image}
            title={artwork.title}
            artist={artwork.artist}
            username={artwork.username}
          />
        ))
      ) : (
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
          <h2 className="text-xl font-bold">No artwork found</h2>
          <p className="mt-2 text-zinc-400">
            Try searching for another artwork or artist.
          </p>
        </div>
      )}
    </section>
  );
}