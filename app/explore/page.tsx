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

type Notification = {
    id: number;
    type: "like" | "follow" | "bookmark" | "comment" | "upload" | "delete";
    user: string;
    message: string;
    artwork: string;
    time: string;
};

function addNotification(notification: Omit<Notification, "id" | "time">) {
    const oldNotifications: Notification[] = JSON.parse(
        localStorage.getItem("arthub_notifications") || "[]"
    );

    const newNotification: Notification = {
        id: Date.now(),
        time: "Just now",
        ...notification,
    };

    localStorage.setItem(
        "arthub_notifications",
        JSON.stringify([newNotification, ...oldNotifications])
    );
}

export default function ExplorePage() {
    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [feedArtworks, setFeedArtworks] = useState<Artwork[]>([]);

    useEffect(() => {
        const savedUploads = localStorage.getItem("arthub_uploads");
        const uploadedArtworks: Artwork[] = savedUploads
            ? JSON.parse(savedUploads)
            : [];

        setFeedArtworks([...uploadedArtworks, ...artworks]);
    }, []);

    function handleCreateArtwork(newArtwork: Artwork) {
        const savedUploads = localStorage.getItem("arthub_uploads");
        const oldUploads: Artwork[] = savedUploads ? JSON.parse(savedUploads) : [];

        const updatedUploads = [newArtwork, ...oldUploads];

        localStorage.setItem("arthub_uploads", JSON.stringify(updatedUploads));
        setFeedArtworks((prev) => [newArtwork, ...prev]);

        addNotification({
            type: "upload",
            user: "You",
            message: "uploaded a new artwork",
            artwork: newArtwork.title,
        });

        setIsUploadOpen(false);
    }

    function handleDeleteArtwork(id: number) {
        const artworkToDelete = feedArtworks.find((artwork) => artwork.id === id);

        const confirmDelete = confirm("Are you sure you want to delete this artwork?");
        if (!confirmDelete) return;

        const savedUploads = localStorage.getItem("arthub_uploads");
        const oldUploads: Artwork[] = savedUploads ? JSON.parse(savedUploads) : [];

        const updatedUploads = oldUploads.filter((artwork) => artwork.id !== id);

        localStorage.setItem("arthub_uploads", JSON.stringify(updatedUploads));
        setFeedArtworks((prev) => prev.filter((artwork) => artwork.id !== id));

        if (artworkToDelete) {
            addNotification({
                type: "delete",
                user: "You",
                message: "deleted an artwork",
                artwork: artworkToDelete.title,
            });
        }
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
                    onDeleteArtwork={handleDeleteArtwork}
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