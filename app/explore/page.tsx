"use client";

import { useEffect, useState } from "react";
import Feed from "../components/layout/Feed";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import Trending from "../components/layout/Trending";
import UploadModal from "../components/layout/UploadModel";
import { artworks } from "@/data/artwork";

type Artwork = {
    id: number;
    title: string;
    artist: string;
    username: string;
    bio: string;
    image: string;
};

export default function ExplorePage() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [feedArtworks, setFeedArtworks] = useState<Artwork[]>(artworks);

    useEffect(() => {
        const saved = localStorage.getItem("arthub_uploads");

        if (saved) {
            const uploadedArtworks = JSON.parse(saved);
            setFeedArtworks([...uploadedArtworks, ...artworks]);
        }
    }, []);

    function handleCreateArtwork(newArtwork: Artwork) {
        const saved = localStorage.getItem("arthub_uploads");
        const oldUploads = saved ? JSON.parse(saved) : [];

        const updatedUploads = [newArtwork, ...oldUploads];

        localStorage.setItem("arthub_uploads", JSON.stringify(updatedUploads));
        setFeedArtworks((prev) => [newArtwork, ...prev]);
        setIsUploadOpen(false);
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 pb-28 text-white md:px-6 lg:pb-6">
            <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_300px]">
                <div className="hidden lg:block">
                    <Sidebar onUploadClick={() => setIsUploadOpen(true)} />
                </div>

                <Feed
                    onUploadClick={() => setIsUploadOpen(true)}
                    artworks={feedArtworks}
                />

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