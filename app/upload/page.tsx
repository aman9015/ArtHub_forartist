"use client";

import { useRouter } from "next/navigation";
import UploadModal from "../components/layout/UploadModel";

export default function UploadPage() {
    const router = useRouter();

    return (
        <main className="min-h-screen bg-black text-white">
            <UploadModal
                onCreateArtwork={() => {
                    router.refresh();
                }}
                onClose={() => {
                    router.push("/explore");
                }}
            />
        </main>
    );
}