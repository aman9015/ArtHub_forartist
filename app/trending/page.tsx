"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft, ImageIcon, Heart, Trophy, Users } from "lucide-react";

type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
  about: string | null;
};

type Artwork = {
  id: string;
  user_id: string;
};

type Follow = {
  following_id: string;
};

type LikeWithArtwork = {
  artwork_id: string;
  artworks: {
    user_id: string;
  } | null;
};

type TrendingArtist = Profile & {
  followerCount: number;
  artworkCount: number;
  totalLikes: number;
  score: number;
};

function TrendingContent() {
  const supabase = createClient();

  const [artists, setArtists] = useState<TrendingArtist[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrendingArtists() {
      setLoading(true);

      const { data: profilesData } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url, about");

      const { data: artworksData } = await supabase
        .from("artworks")
        .select("id, user_id");

      const { data: followsData } = await supabase
        .from("follows")
        .select("following_id");

      const { data: likesData } = await supabase
        .from("likes")
        .select("artwork_id, artworks(user_id)");

      const profiles = (profilesData || []) as Profile[];
      const artworks = (artworksData || []) as Artwork[];
      const follows = (followsData || []) as Follow[];
      const likes = (likesData || []) as LikeWithArtwork[];

      const trendingArtists: TrendingArtist[] = profiles
        .map((profile) => {
          const followerCount = follows.filter(
            (follow) => follow.following_id === profile.id
          ).length;

          const artworkCount = artworks.filter(
            (artwork) => artwork.user_id === profile.id
          ).length;

          const totalLikes = likes.filter(
            (like) => like.artworks?.user_id === profile.id
          ).length;

          const score = followerCount * 5 + artworkCount * 2 + totalLikes;

          return {
            ...profile,
            followerCount,
            artworkCount,
            totalLikes,
            score,
          };
        })
        .sort((a, b) => b.score - a.score)
        .slice(0, 50);

      setArtists(trendingArtists);
      setLoading(false);
    }

    loadTrendingArtists();
  }, [supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
          Loading trending artists...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center gap-4">
          <Link
            href="/explore"
            className="rounded-full border border-zinc-800 p-3 hover:bg-zinc-900"
          >
            <ArrowLeft size={20} />
          </Link>

          <div>
            <h1 className="text-3xl font-bold">Trending Artists</h1>
            <p className="text-sm text-zinc-400">
              Ranked by followers, artworks, and total likes.
            </p>
          </div>
        </div>

        {artists.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
            No artists found yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {artists.map((artist, index) => (
              <Link
                key={artist.id}
                href={`/profile/${artist.username}`}
                className="group rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-600 hover:bg-zinc-900"
              >
                <div className="flex items-center gap-4">
                  <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-zinc-900 text-lg font-bold text-zinc-300">
                    #{index + 1}
                  </div>

                  <div className="relative h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                    {artist.avatar_url ? (
                      <img
                        src={artist.avatar_url}
                        alt={artist.name}
                        className="h-full w-full object-cover"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-2xl font-bold">
                        {artist.name?.charAt(0).toUpperCase() || "A"}
                      </div>
                    )}
                  </div>

                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <h2 className="truncate text-xl font-bold group-hover:underline">
                        {artist.name}
                      </h2>

                      {index === 0 && (
                        <Trophy size={20} className="text-yellow-400" />
                      )}
                    </div>

                    <p className="text-sm text-zinc-400">@{artist.username}</p>

                    <p className="mt-1 line-clamp-1 text-sm text-zinc-500">
                      {artist.about || "No bio yet."}
                    </p>
                  </div>

                  <div className="hidden min-w-[260px] grid-cols-4 gap-3 text-center md:grid">
                    <div className="rounded-2xl bg-zinc-900 p-3">
                      <p className="text-lg font-bold">{artist.score}</p>
                      <p className="text-xs text-zinc-500">Score</p>
                    </div>

                    <div className="rounded-2xl bg-zinc-900 p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Users size={15} />
                        <p className="text-lg font-bold">
                          {artist.followerCount}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">Followers</p>
                    </div>

                    <div className="rounded-2xl bg-zinc-900 p-3">
                      <div className="flex items-center justify-center gap-1">
                        <ImageIcon size={15} />
                        <p className="text-lg font-bold">
                          {artist.artworkCount}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">Artworks</p>
                    </div>

                    <div className="rounded-2xl bg-zinc-900 p-3">
                      <div className="flex items-center justify-center gap-1">
                        <Heart size={15} />
                        <p className="text-lg font-bold">
                          {artist.totalLikes}
                        </p>
                      </div>
                      <p className="text-xs text-zinc-500">Likes</p>
                    </div>
                  </div>
                </div>

                <div className="mt-4 grid grid-cols-4 gap-2 text-center md:hidden">
                  <div className="rounded-2xl bg-zinc-900 p-3">
                    <p className="font-bold">{artist.score}</p>
                    <p className="text-xs text-zinc-500">Score</p>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 p-3">
                    <p className="font-bold">{artist.followerCount}</p>
                    <p className="text-xs text-zinc-500">Followers</p>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 p-3">
                    <p className="font-bold">{artist.artworkCount}</p>
                    <p className="text-xs text-zinc-500">Artworks</p>
                  </div>

                  <div className="rounded-2xl bg-zinc-900 p-3">
                    <p className="font-bold">{artist.totalLikes}</p>
                    <p className="text-xs text-zinc-500">Likes</p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </main>
  );
}

export default function TrendingPage() {
  return (
    <RequireAuth>
      <TrendingContent />
    </RequireAuth>
  );
}