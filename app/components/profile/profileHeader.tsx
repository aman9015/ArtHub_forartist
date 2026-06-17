"use client";

import { useEffect, useState } from "react";
import EditProfileModal from "./EditProfileModal";

type Profile = {
    artist: string;
    username: string;
    bio: string;
    avatar?: string;
};

type Props = {
    artist: string;
    username: string;
    bio: string;
};

export default function ProfileHeader({ artist, username, bio }: Props) {
    const [showEdit, setShowEdit] = useState(false);

    const [profile, setProfile] = useState<Profile>({
        artist,
        username,
        bio,
        avatar: "",
    });

    useEffect(() => {
        const saved = localStorage.getItem("arthub_profile");

        if (saved) {
            setProfile(JSON.parse(saved));
        }
    }, []);

    function handleSave(
        artist: string,
        username: string,
        bio: string,
        avatar: string
    ) {
        const updated: Profile = {
            artist,
            username,
            bio,
            avatar,
        };

        localStorage.setItem("arthub_profile", JSON.stringify(updated));
        setProfile(updated);
        setShowEdit(false);
    }

    return (
        <>
            <div className="h-64 bg-gradient-to-r from-purple-600 to-pink-600" />

            <div className="mx-auto max-w-6xl px-6">
                <div className="-mt-16 flex flex-col items-center md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col items-center md:flex-row md:gap-6">
                        <div className="flex h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-800 text-4xl font-bold">
                            {profile.avatar ? (
                                <img
                                    src={profile.avatar}
                                    alt={profile.artist}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    {profile.artist.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center md:text-left">
                            <h1 className="text-4xl font-bold">{profile.artist}</h1>
                            <p className="mt-2 text-zinc-400">@{profile.username}</p>
                            <p className="mt-3 text-zinc-300">{profile.bio}</p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setShowEdit(true)}
                        className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200 md:mt-0"
                    >
                        Edit Profile
                    </button>
                </div>
            </div>

            {showEdit && (
                <EditProfileModal
                    artist={profile.artist}
                    username={profile.username}
                    bio={profile.bio}
                    avatar={profile.avatar}
                    onClose={() => setShowEdit(false)}
                    onSave={handleSave}
                />
            )}
        </>
    );
}