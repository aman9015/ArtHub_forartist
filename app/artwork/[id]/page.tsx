"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import { ArrowLeft, LockKeyhole } from "lucide-react";
import { createClient } from "@/app/lib/supabase";

type PublicArtwork = {
  artwork_id: string;
  artwork_title: string;
  artwork_description: string | null;
  artwork_image_url: string;
  artwork_created_at: string;
  artist_id: string | null;
  artist_name: string;
  artist_username: string;
  artist_avatar_url: string | null;
};

export default function PublicArtworkPage() {
  const params = useParams();
  const artworkId = params.id as string;

  const supabase = useMemo(() => createClient(), []);

  const [artwork, setArtwork] = useState<PublicArtwork | null>(null);
  const [isSignedIn, setIsSignedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function loadArtwork() {
      if (!artworkId) return;

      setLoading(true);

      const [
        {
          data: { user },
        },
        { data, error },
      ] = await Promise.all([
        supabase.auth.getUser(),
        supabase.rpc("get_public_artwork", {
          p_artwork_id: artworkId,
        }),
      ]);

      if (cancelled) return;

      setIsSignedIn(Boolean(user));

      if (error || !data || data.length === 0) {
        setArtwork(null);
        setLoading(false);
        return;
      }

      setArtwork(data[0] as PublicArtwork);
      setLoading(false);
    }

    void loadArtwork();

    return () => {
      cancelled = true;
    };
  }, [artworkId, supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <h1 className="text-xl font-bold">Loading artwork...</h1>
          <p className="mt-2 text-zinc-400">
            Preparing this shared artwork.
          </p>
        </div>
      </main>
    );
  }

  if (!artwork) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <h1 className="text-2xl font-bold">Artwork not found</h1>

          <p className="mt-3 text-zinc-400">
            This artwork may have been deleted or the shared link is invalid.
          </p>

          <button
            type="button"
            onClick={() => window.history.back()}
            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-5 py-3 font-semibold text-black transition hover:bg-zinc-200"
          >
            <ArrowLeft size={17} />
            Go Back
          </button>
        </div>
      </main>
    );
  }

  const artistInfo = (
    <div className="flex items-center gap-3">
      {artwork.artist_avatar_url ? (
        <img
          src={artwork.artist_avatar_url}
          alt={artwork.artist_name}
          className="h-12 w-12 rounded-full border border-zinc-700 object-cover"
        />
      ) : (
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-bold">
          {artwork.artist_name.charAt(0).toUpperCase()}
        </div>
      )}

      <div>
        <p className="font-bold">{artwork.artist_name}</p>
        <p className="text-sm text-zinc-400">@{artwork.artist_username}</p>
      </div>
    </div>
  );

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white sm:px-6">
      <section className="mx-auto max-w-6xl">
        <button
          type="button"
          onClick={() => window.history.back()}
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900"
        >
          <ArrowLeft size={17} />
          Back
        </button>

        <div className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 lg:grid lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[420px] bg-zinc-900 lg:min-h-[720px]">
            <Image
              src={artwork.artwork_image_url}
              alt={artwork.artwork_title}
              fill
              unoptimized
              priority
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>

          <div className="flex flex-col p-6 lg:p-8">
            {isSignedIn && artwork.artist_id ? (
              <Link
                href={`/profile/${artwork.artist_username}`}
                className="mb-8 rounded-2xl transition hover:bg-zinc-900"
              >
                {artistInfo}
              </Link>
            ) : (
              <div className="mb-8">{artistInfo}</div>
            )}

            <h1 className="text-3xl font-black sm:text-4xl">
              {artwork.artwork_title}
            </h1>

            <p className="mt-5 leading-7 text-zinc-300">
              {artwork.artwork_description || "No description added."}
            </p>

            <p className="mt-8 text-sm text-zinc-500">
              Uploaded on{" "}
              {new Intl.DateTimeFormat("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              }).format(new Date(artwork.artwork_created_at))}
            </p>

            {!isSignedIn && (
              <div className="mt-auto pt-10">
                <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-5">
                  <div className="flex items-start gap-3">
                    <div className="rounded-xl bg-zinc-800 p-2 text-zinc-300">
                      <LockKeyhole size={19} />
                    </div>

                    <div>
                      <p className="font-semibold">
                        Discover more on ArtHub
                      </p>

                      <p className="mt-1 text-sm leading-6 text-zinc-400">
                        Sign in to view artist profiles, interact with
                        artworks, and join the community.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </section>
    </main>
  );
}