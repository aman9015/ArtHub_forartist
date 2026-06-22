"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import { ArrowLeft } from "lucide-react";

type Artwork = {
  id: string;
  title: string;
  description: string | null;
  image_url: string;
  user_id: string;
  created_at: string;
};

type Profile = {
  id: string;
  name: string;
  username: string;
  avatar_url: string | null;
};

function ArtworkPageContent() {
  const params = useParams();
  const artworkId = params.id as string;

  const supabase = createClient();

  const [artwork, setArtwork] = useState<Artwork | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadArtwork() {
      setLoading(true);

      const { data: artworkData, error: artworkError } = await supabase
        .from("artworks")
        .select("id, title, description, image_url, user_id, created_at")
        .eq("id", artworkId)
        .single();

      if (artworkError || !artworkData) {
        setArtwork(null);
        setLoading(false);
        return;
      }

      setArtwork(artworkData as Artwork);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("id, name, username, avatar_url")
        .eq("id", artworkData.user_id)
        .single();

      setProfile((profileData as Profile) || null);
      setLoading(false);
    }

    if (artworkId) {
      loadArtwork();
    }
  }, [artworkId, supabase]);

  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <h1 className="text-xl font-bold">Loading artwork...</h1>
          <p className="mt-2 text-zinc-400">Fetching artwork from Supabase.</p>
        </div>
      </main>
    );
  }

  if (!artwork) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
          <h1 className="text-2xl font-bold">Artwork not found</h1>
          <Link
            href="/explore"
            className="mt-5 inline-flex rounded-full bg-white px-5 py-3 font-semibold text-black"
          >
            Back to Explore
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <section className="mx-auto max-w-6xl">
        <Link
          href="/explore"
          className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold hover:bg-zinc-900"
        >
          <ArrowLeft size={17} />
          Back to Explore
        </Link>

        <div className="grid overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 lg:grid-cols-[1.2fr_0.8fr]">
          <div className="relative min-h-[420px] bg-zinc-900 lg:min-h-[720px]">
            <Image
              src={artwork.image_url}
              alt={artwork.title}
              fill
              unoptimized
              sizes="(max-width: 1024px) 100vw, 60vw"
              className="object-cover"
            />
          </div>

          <div className="p-6 lg:p-8">
            {profile && (
              <Link
                href={`/profile/${profile.username}`}
                className="mb-8 flex items-center gap-3"
              >
                {profile.avatar_url ? (
                  <img
                    src={profile.avatar_url}
                    alt={profile.name}
                    className="h-12 w-12 rounded-full border border-zinc-700 object-cover"
                  />
                ) : (
                  <div className="flex h-12 w-12 items-center justify-center rounded-full bg-zinc-800 font-bold">
                    {profile.name.charAt(0)}
                  </div>
                )}

                <div>
                  <p className="font-bold">{profile.name}</p>
                  <p className="text-sm text-zinc-400">@{profile.username}</p>
                </div>
              </Link>
            )}

            <h1 className="text-4xl font-black">{artwork.title}</h1>

            <p className="mt-5 leading-7 text-zinc-300">
              {artwork.description || "No description added."}
            </p>

            <p className="mt-8 text-sm text-zinc-500">
              Uploaded on {new Date(artwork.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}

export default function ArtworkPage() {
  return (
    <RequireAuth>
      <ArtworkPageContent />
    </RequireAuth>
  );
}