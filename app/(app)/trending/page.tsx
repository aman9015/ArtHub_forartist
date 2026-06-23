"use client";

import Link from "next/link";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import {
  ArrowLeft,
  Heart,
  ImageIcon,
  Trophy,
  Users,
} from "lucide-react";

const TRENDING_CACHE_TTL_MS = 60_000;

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

type ArtworkRelation =
  | {
    user_id: string;
  }
  | {
    user_id: string;
  }[]
  | null;

type LikeWithArtwork = {
  artwork_id: string;
  artworks: ArtworkRelation;
};

type TrendingArtist = Profile & {
  followerCount: number;
  artworkCount: number;
  totalLikes: number;
  score: number;
};

type TrendingCache = {
  artists: TrendingArtist[];
  savedAt: number;
};

let trendingCache: TrendingCache | null = null;

function increaseCount(map: Map<string, number>, id: string) {
  map.set(id, (map.get(id) || 0) + 1);
}

function getArtworkOwnerId(like: LikeWithArtwork) {
  if (Array.isArray(like.artworks)) {
    return like.artworks[0]?.user_id || null;
  }

  return like.artworks?.user_id || null;
}

function TrendingSkeleton() {
  return (
    <div className="grid gap-4">
      {[0, 1, 2, 3, 4].map((item) => (
        <div
          key={item}
          className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5"
        >
          <div className="flex items-center gap-4">
            <div className="h-12 w-12 animate-pulse rounded-2xl bg-zinc-800" />

            <div className="h-16 w-16 animate-pulse rounded-full bg-zinc-800" />

            <div className="min-w-0 flex-1 space-y-3">
              <div className="h-5 w-40 animate-pulse rounded bg-zinc-800" />
              <div className="h-4 w-28 animate-pulse rounded bg-zinc-900" />
              <div className="h-3 w-64 max-w-full animate-pulse rounded bg-zinc-900" />
            </div>

            <div className="hidden gap-3 md:grid md:grid-cols-4">
              {[0, 1, 2, 3].map((stat) => (
                <div
                  key={stat}
                  className="h-16 w-16 animate-pulse rounded-2xl bg-zinc-900"
                />
              ))}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function TrendingContent() {
  const supabase = useMemo(() => createClient(), []);

  const [artists, setArtists] = useState<TrendingArtist[]>(
    () => trendingCache?.artists || []
  );
  const [initialLoading, setInitialLoading] = useState(
    () => !trendingCache
  );
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const mountedRef = useRef(true);
  const requestVersionRef = useRef(0);

  useEffect(() => {
    mountedRef.current = true;

    return () => {
      mountedRef.current = false;
      requestVersionRef.current += 1;
    };
  }, []);

  const loadTrendingArtists = useCallback(
    async (forceRefresh = false) => {
      const cached = trendingCache;
      const cacheIsFresh =
        cached &&
        Date.now() - cached.savedAt < TRENDING_CACHE_TTL_MS;

      if (cached && cacheIsFresh && !forceRefresh) {
        setArtists(cached.artists);
        setInitialLoading(false);
        setRefreshing(false);
        setError(null);
        return;
      }

      const requestVersion = requestVersionRef.current + 1;
      requestVersionRef.current = requestVersion;

      if (cached) {
        setArtists(cached.artists);
        setInitialLoading(false);
        setRefreshing(true);
      } else {
        setInitialLoading(true);
        setRefreshing(false);
      }

      setError(null);

      try {
        const [
          profilesResult,
          artworksResult,
          followsResult,
          likesResult,
        ] = await Promise.all([
          supabase
            .from("profiles")
            .select("id, name, username, avatar_url, about"),

          supabase.from("artworks").select("id, user_id"),

          supabase.from("follows").select("following_id"),

          supabase.from("likes").select("artwork_id, artworks(user_id)"),
        ]);

        if (
          !mountedRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        const firstError =
          profilesResult.error ||
          artworksResult.error ||
          followsResult.error ||
          likesResult.error;

        if (firstError) {
          throw new Error(firstError.message);
        }

        const profiles = (profilesResult.data || []) as Profile[];
        const artworks = (artworksResult.data || []) as Artwork[];
        const follows = (followsResult.data || []) as Follow[];
        const likes = (likesResult.data || []) as LikeWithArtwork[];

        const followerCounts = new Map<string, number>();
        const artworkCounts = new Map<string, number>();
        const likeCounts = new Map<string, number>();
        const artworkOwnerById = new Map<string, string>();

        for (const follow of follows) {
          increaseCount(followerCounts, follow.following_id);
        }

        for (const artwork of artworks) {
          artworkOwnerById.set(artwork.id, artwork.user_id);
          increaseCount(artworkCounts, artwork.user_id);
        }

        for (const like of likes) {
          const ownerId =
            getArtworkOwnerId(like) ||
            artworkOwnerById.get(like.artwork_id);

          if (ownerId) {
            increaseCount(likeCounts, ownerId);
          }
        }

        const rankedArtists = profiles
          .map((profile) => {
            const followerCount = followerCounts.get(profile.id) || 0;
            const artworkCount = artworkCounts.get(profile.id) || 0;
            const totalLikes = likeCounts.get(profile.id) || 0;

            return {
              ...profile,
              followerCount,
              artworkCount,
              totalLikes,
              score: followerCount * 5 + artworkCount * 2 + totalLikes,
            };
          })
          .sort(
            (first, second) =>
              second.score - first.score ||
              second.totalLikes - first.totalLikes ||
              second.followerCount - first.followerCount ||
              second.artworkCount - first.artworkCount ||
              first.name.localeCompare(second.name)
          )
          .slice(0, 50);

        trendingCache = {
          artists: rankedArtists,
          savedAt: Date.now(),
        };

        setArtists(rankedArtists);
      } catch (loadError) {
        if (
          !mountedRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        setError(
          loadError instanceof Error
            ? loadError.message
            : "Trending artists could not be loaded."
        );

        if (!trendingCache) {
          setArtists([]);
        }
      } finally {
        if (
          !mountedRef.current ||
          requestVersion !== requestVersionRef.current
        ) {
          return;
        }

        setInitialLoading(false);
        setRefreshing(false);
      }
    },
    [supabase]
  );

  useEffect(() => {
    void loadTrendingArtists();
  }, [loadTrendingArtists]);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <section className="mx-auto max-w-5xl">
        <div className="mb-6 flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4">
            <Link
              href="/explore"
              prefetch
              className="shrink-0 rounded-full border border-zinc-800 p-3 transition hover:bg-zinc-900"
              aria-label="Back to Explore"
            >
              <ArrowLeft size={20} />
            </Link>

            <div className="min-w-0">
              <h1 className="text-3xl font-bold">Trending Artists</h1>
              <p className="text-sm text-zinc-400">
                Ranked by followers, artworks, and total likes.
              </p>
            </div>
          </div>

          {refreshing && (
            <span className="hidden shrink-0 rounded-full border border-zinc-800 bg-zinc-950 px-3 py-1.5 text-xs font-semibold text-zinc-400 sm:inline-flex">
              Refreshing ranking...
            </span>
          )}
        </div>

        {error && (
          <div className="mb-4 flex flex-col gap-3 rounded-2xl border border-red-500/25 bg-red-500/10 p-4 text-sm text-red-100 sm:flex-row sm:items-center sm:justify-between">
            <p>{error}</p>

            <button
              type="button"
              onClick={() => void loadTrendingArtists(true)}
              className="rounded-full border border-red-300/30 px-4 py-2 font-semibold transition hover:bg-red-500/15"
            >
              Try again
            </button>
          </div>
        )}

        {initialLoading ? (
          <TrendingSkeleton />
        ) : artists.length === 0 ? (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center text-zinc-500">
            No artists found yet.
          </div>
        ) : (
          <div className="grid gap-4">
            {artists.map((artist, index) => (
              <Link
                key={artist.id}
                href={`/profile/${artist.username}`}
                prefetch
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
                        <Trophy size={20} className="shrink-0 text-yellow-400" />
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