"use client";

import { useState } from "react";
import { ImagePlus, X } from "lucide-react";

type Props = {
    artist: string;
    username: string;
    bio: string;
    avatar?: string;
    onClose: () => void;
    onSave: (
        artist: string,
        username: string,
        bio: string,
        avatar: string
    ) => void;
};

export default function EditProfileModal({
    artist,
    username,
    bio,
    avatar,
    onClose,
    onSave,
}: Props) {
    const [name, setName] = useState(artist);
    const [user, setUser] = useState(username);
    const [about, setAbout] = useState(bio);
    const [avatarPreview, setAvatarPreview] = useState(avatar || "");

    function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        const reader = new FileReader();

        reader.onloadend = () => {
            setAvatarPreview(reader.result as string);
        };

        reader.readAsDataURL(file);
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
            <div className="w-full max-w-lg rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <div className="mb-6 flex items-center justify-between">
                    <h2 className="text-2xl font-bold">Edit Profile</h2>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full p-2 text-zinc-400 hover:bg-zinc-900 hover:text-white"
                    >
                        <X size={24} />
                    </button>
                </div>

                <div className="mb-6 flex justify-center">
                    <label className="group relative flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full border-4 border-zinc-800 bg-zinc-900">
                        {avatarPreview ? (
                            <img
                                src={avatarPreview}
                                alt="Avatar preview"
                                className="h-full w-full object-cover"
                            />
                        ) : (
                            <div className="flex flex-col items-center text-zinc-500">
                                <ImagePlus size={26} />
                                <span className="mt-1 text-xs">Avatar</span>
                            </div>
                        )}

                        <div className="absolute inset-0 hidden items-center justify-center bg-black/60 text-sm font-semibold group-hover:flex">
                            Change
                        </div>

                        <input
                            type="file"
                            accept="image/*"
                            onChange={handleAvatarChange}
                            className="hidden"
                        />
                    </label>
                </div>

                <div className="space-y-4">
                    <input
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Name"
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 outline-none"
                    />

                    <input
                        value={user}
                        onChange={(e) => setUser(e.target.value)}
                        placeholder="Username"
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 p-4 outline-none"
                    />

                    <textarea
                        rows={4}
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        placeholder="Bio"
                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 p-4 outline-none"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => onSave(name, user, about, avatarPreview)}
                    className="mt-6 w-full rounded-full bg-white py-3 font-bold text-black hover:bg-zinc-200"
                >
                    Save Changes
                </button>
            </div>
        </div>
    );
}