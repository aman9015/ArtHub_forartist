"use client";

import { useEffect, useState } from "react";
import ProfileHeader from "@/app/components/profile/profileHeader";
import ProfileStats from "@/app/components/profile/ProfileStats";
import ProfileGallery from "@/app/components/profile/profileGallery";
import ProfileTabs from "@/app/components/profile/ProfileTabs";

type Tab = "posts" | "saved" | "liked";

type Artwork = {
    id: number;
    title: string;
    artist: string;
    username: string;
    bio: string;
    image: string;
};

type Props = {
    username: string;
    initialArtworks: Artwork[];
};

export default function ProfilePageClient({
    username,
    initialArtworks,
}: Props) {
    const [allArtworks, setAllArtworks] = useState<Artwork[]>(initialArtworks);
    const [activeTab, setActiveTab] = useState<Tab>("posts");

    useEffect(() => {
        const saved = localStorage.getItem("arthub_uploads");

        if (saved) {
            const uploadedArtworks: Artwork[] = JSON.parse(saved);
            setAllArtworks([...uploadedArtworks, ...initialArtworks]);
        }
    }, [initialArtworks]);

    const artistWorks = allArtworks.filter(
        (artwork) => artwork.username === username
    );

    const artistProfile = artistWorks[0];

    const savedArtworks = allArtworks.slice(0, 2);
    const likedArtworks = allArtworks.slice(1, 3);

    let visibleArtworks = artistWorks;
    let emptyMessage = "No posts yet";

    if (activeTab === "saved") {
        visibleArtworks = savedArtworks;
        emptyMessage = "No saved artworks yet";
    }

    if (activeTab === "liked") {
        visibleArtworks = likedArtworks;
        emptyMessage = "No liked artworks yet";
    }

    if (!artistProfile) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <h1 className="text-3xl font-bold">Profile not found</h1>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black text-white">
            <ProfileHeader
                artist={artistProfile.artist}
                username={artistProfile.username}
                bio={artistProfile.bio}
            />

            <div className="mx-auto max-w-6xl px-6 pb-16">
                <ProfileStats
                    artworks={artistWorks.length}
                    saved={savedArtworks.length}
                    liked={likedArtworks.length}
                />

                <ProfileTabs activeTab={activeTab} onTabChange={setActiveTab} />

                <ProfileGallery
                    artworks={visibleArtworks}
                    emptyMessage={emptyMessage}
                />
            </div>
        </main>
    );
}