"use client";

import { useEffect, useState } from "react";
import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";
import ProfileHeader from "@/app/components/profile/profileHeader";
import ProfileStats from "@/app/components/profile/ProfileStats";
import ProfileGallery from "@/app/components/profile/profileGallery";
import ProfileTabs from "@/app/components/profile/ProfileTabs";

type Tab = "posts" | "saved" | "liked";

type Artwork = {
    id: string;
    title: string;
    artist: string;
    username: string;
    bio: string;
    image: string;
};

type Profile = {
    id: string;
    name: string;
    username: string;
    about: string | null;
    description: string | null;
    avatar_url: string | null;
    commissions_open: boolean;
};

type SupabaseArtwork = {
    id: string;
    title: string;
    description: string | null;
    image_url: string;
    user_id: string;
};

type Props = {
    username: string;
    initialArtworks?: Artwork[];
};

function ProfileContent({ username }: Props) {
    const supabase = createClient();

    const [activeTab, setActiveTab] = useState<Tab>("posts");
    const [profile, setProfile] = useState<Profile | null>(null);
    const [artistWorks, setArtistWorks] = useState<Artwork[]>([]);
    const [savedArtworks, setSavedArtworks] = useState<Artwork[]>([]);
    const [likedArtworks, setLikedArtworks] = useState<Artwork[]>([]);
    const [isOwnProfile, setIsOwnProfile] = useState(false);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function loadProfilePage() {
            setLoading(true);

            const {
                data: { user },
            } = await supabase.auth.getUser();

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select(
                    "id, name, username, about, description, avatar_url, commissions_open"
                )
                .eq("username", username)
                .single();

            if (profileError || !profileData) {
                setProfile(null);
                setLoading(false);
                return;
            }

            const currentProfile = profileData as Profile;

            setProfile(currentProfile);
            setIsOwnProfile(user?.id === currentProfile.id);

            const { data: artworksData } = await supabase
                .from("artworks")
                .select("id, title, description, image_url, user_id")
                .eq("user_id", currentProfile.id)
                .order("created_at", { ascending: false });

            const formattedWorks: Artwork[] = (
                (artworksData || []) as SupabaseArtwork[]
            ).map((artwork) => ({
                id: artwork.id,
                title: artwork.title,
                artist: currentProfile.name,
                username: currentProfile.username,
                bio: artwork.description || currentProfile.about || "",
                image: artwork.image_url,
            }));

            const savedIds: string[] = JSON.parse(
                localStorage.getItem("arthub_saved_posts") || "[]"
            );

            const likedIds: string[] = JSON.parse(
                localStorage.getItem("arthub_liked_posts") || "[]"
            );

            setArtistWorks(formattedWorks);
            setSavedArtworks(
                formattedWorks.filter((artwork) => savedIds.includes(artwork.id))
            );
            setLikedArtworks(
                formattedWorks.filter((artwork) => likedIds.includes(artwork.id))
            );

            setLoading(false);
        }

        loadProfilePage();
    }, [username, supabase]);

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <h1 className="text-xl font-bold">Loading profile...</h1>
                    <p className="mt-2 text-zinc-400">
                        Fetching real profile from Supabase.
                    </p>
                </div>
            </main>
        );
    }

    if (!profile) {
        return (
            <main className="min-h-screen bg-black p-10 text-white">
                <h1 className="text-3xl font-bold">Profile not found</h1>
            </main>
        );
    }

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

    return (
        <main className="min-h-screen bg-black text-white">
            <ProfileHeader
                artist={profile.name}
                username={profile.username}
                bio={profile.about || profile.description || "ArtHub creator"}
                avatar={profile.avatar_url}
                isOwnProfile={isOwnProfile}
                commissionsOpen={profile.commissions_open}
            />

            <div className="mx-auto max-w-6xl px-6 pb-16">
                <ProfileStats
                    username={profile.username}
                    artworks={artistWorks.length}
                    saved={savedArtworks.length}
                    liked={likedArtworks.length}
                />

                <ProfileTabs
                    activeTab={activeTab}
                    onTabChange={setActiveTab}
                    postsCount={artistWorks.length}
                    savedCount={savedArtworks.length}
                    likedCount={likedArtworks.length}
                />

                <ProfileGallery artworks={visibleArtworks} emptyMessage={emptyMessage} />
            </div>
        </main>
    );
}

export default function ProfilePageClient(props: Props) {
    return (
        <RequireAuth>
            <ProfileContent {...props} />
        </RequireAuth>
    );
}