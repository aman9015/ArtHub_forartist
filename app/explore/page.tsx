"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import Feed from "../components/layout/Feed";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import Trending from "../components/layout/Trending";
import UploadModal from "../components/layout/UploadModel";
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

function ExploreContent() {
    const supabase = createClient();

    
const [isUploadOpen, setIsUploadOpen] = useState(false);
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
        const profile = profiles.find((p) => p.id === artwork.user_id);

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
    loadArtworks();
}, []);

async function handleCreateArtwork() {
    addNotification({
        type: "upload",
        user: "You",
        message: "uploaded a new artwork",
        artwork: "New artwork",
    });

    await loadArtworks();
    setIsUploadOpen(false);
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
    <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white md:px-6 lg:pb-6">
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_300px]">
            <div className="hidden lg:block">
                <Sidebar onUploadClick={() => setIsUploadOpen(true)} />
            </div>

            {loading ? (
                <section className="mx-auto w-full max-w-2xl rounded-3xl border border-zinc-800 bg-zinc-950 p-10 text-center">
                    <h2 className="text-xl font-bold">
                        Loading artworks...
                    </h2>
                </section>
            ) : (
                <Feed
                    onUploadClick={() => setIsUploadOpen(true)}
                    artworks={feedArtworks}
                    onDeleteArtwork={handleDeleteArtwork}
                />
            )}

            <div className="hidden lg:block">
                <Trending />
            </div>
        </div>

        <MobileNav onUploadClick={() => setIsUploadOpen(true)} />

        {isUploadOpen && (
            <UploadModal
                onClose={() => setIsUploadOpen(false)}
                onCreateArtwork={handleCreateArtwork}
            />
        )}
    </main>
);

}

export default function ExplorePage() {
    return (<RequireAuth> <ExploreContent /> </RequireAuth>
    );
}
