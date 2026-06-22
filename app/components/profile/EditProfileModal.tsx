"use client";

import { useState } from "react";
import { ImagePlus, Sparkles, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase";

type Props = {
    artist: string;
    username: string;
    bio: string;
    avatar?: string;
    commissionsOpen: boolean;
    onClose: () => void;
    onSave: () => void;
};

export default function EditProfileModal({
    artist,
    username,
    bio,
    avatar,
    commissionsOpen,
    onClose,
    onSave,
}: Props) {
    const supabase = createClient();

    const [name, setName] = useState(artist);
    const [user, setUser] = useState(username);
    const [about, setAbout] = useState(bio);
    const [openForCommissions, setOpenForCommissions] =
        useState(commissionsOpen);
    const [avatarPreview, setAvatarPreview] = useState(avatar || "");
    const [avatarFile, setAvatarFile] = useState<File | null>(null);
    const [loading, setLoading] = useState(false);

    function handleAvatarChange(event: React.ChangeEvent<HTMLInputElement>) {
        const file = event.target.files?.[0];

        if (!file) return;

        setAvatarFile(file);
        setAvatarPreview(URL.createObjectURL(file));
    }

    async function handleSaveProfile() {
        if (!name.trim()) {
            alert("Name is required.");
            return;
        }

        if (!user.trim()) {
            alert("Username is required.");
            return;
        }

        setLoading(true);

        const {
            data: { user: authUser },
        } = await supabase.auth.getUser();

        if (!authUser) {
            setLoading(false);
            alert("You must be logged in.");
            return;
        }

        let avatarUrl = avatar || null;

        if (avatarFile) {
            const fileExt = avatarFile.name.split(".").pop();
            const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
            const filePath = `${authUser.id}/${fileName}`;

            const { error: uploadError } = await supabase.storage
                .from("avatars")
                .upload(filePath, avatarFile, {
                    upsert: true,
                });

            if (uploadError) {
                setLoading(false);
                alert(uploadError.message);
                return;
            }

            const { data: publicUrlData } = supabase.storage
                .from("avatars")
                .getPublicUrl(filePath);

            avatarUrl = publicUrlData.publicUrl;
        }

        const { error } = await supabase
            .from("profiles")
            .update({
                name: name.trim(),
                username: user.trim().toLowerCase().replaceAll(" ", ""),
                about: about.trim() || null,
                avatar_url: avatarUrl,
                commissions_open: openForCommissions,
            })
            .eq("id", authUser.id);

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        onSave();
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/70 px-4 backdrop-blur-md">
            <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
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

                    <button
                        type="button"
                        onClick={() => setOpenForCommissions((prev) => !prev)}
                        className={`flex w-full items-center justify-between rounded-3xl border p-4 text-left transition ${openForCommissions
                                ? "border-emerald-500/40 bg-emerald-500/10"
                                : "border-zinc-800 bg-zinc-900"
                            }`}
                    >
                        <div className="flex items-center gap-3">
                            <div
                                className={`flex h-11 w-11 items-center justify-center rounded-2xl ${openForCommissions
                                        ? "bg-emerald-500 text-black"
                                        : "bg-zinc-800 text-zinc-400"
                                    }`}
                            >
                                <Sparkles size={20} />
                            </div>

                            <div>
                                <p className="font-bold">Open for commissions</p>
                                <p className="text-sm text-zinc-400">
                                    Show a Hire Artist button on your profile.
                                </p>
                            </div>
                        </div>

                        <div
                            className={`h-6 w-11 rounded-full p-1 transition ${openForCommissions ? "bg-emerald-500" : "bg-zinc-700"
                                }`}
                        >
                            <div
                                className={`h-4 w-4 rounded-full bg-white transition ${openForCommissions ? "translate-x-5" : "translate-x-0"
                                    }`}
                            />
                        </div>
                    </button>
                </div>

                <button
                    type="button"
                    onClick={handleSaveProfile}
                    disabled={loading}
                    className="mt-6 w-full rounded-full bg-white py-3 font-bold text-black hover:bg-zinc-200 disabled:opacity-60"
                >
                    {loading ? "Saving..." : "Save Changes"}
                </button>
            </div>
        </div>
    );
}