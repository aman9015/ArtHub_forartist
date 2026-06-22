"use client";

import Link from "next/link";
import { useState } from "react";
import { Inbox, Sparkles } from "lucide-react";
import EditProfileModal from "./EditProfileModal";

type Props = {
    artist: string;
    username: string;
    bio: string;
    avatar?: string | null;
    isOwnProfile: boolean;
    commissionsOpen: boolean;
};

export default function ProfileHeader({
    artist,
    username,
    bio,
    avatar,
    isOwnProfile,
    commissionsOpen,
}: Props) {
    const [showEdit, setShowEdit] = useState(false);

    return (
        <>
            <div className="h-64 bg-gradient-to-r from-purple-600 to-pink-600" />

            <div className="mx-auto max-w-6xl px-6">
                <div className="flex flex-col items-center md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col items-center md:flex-row md:gap-6">
                        <div className="relative -mt-16 flex h-32 w-32 overflow-hidden rounded-full border-4 border-black bg-zinc-800 text-4xl font-bold shadow-xl">
                            {avatar ? (
                                <img
                                    src={avatar}
                                    alt={artist}
                                    className="h-full w-full object-cover"
                                />
                            ) : (
                                <div className="flex h-full w-full items-center justify-center">
                                    {artist.charAt(0)}
                                </div>
                            )}
                        </div>

                        <div className="mt-4 text-center md:text-left">
                            <div className="flex flex-col items-center gap-3 md:flex-row">
                                <h1 className="text-4xl font-bold">{artist}</h1>

                                {commissionsOpen && (
                                    <span className="inline-flex items-center gap-2 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-4 py-2 text-sm font-semibold text-emerald-300">
                                        <Sparkles size={16} />
                                        Available for Commission
                                    </span>
                                )}
                            </div>

                            <p className="mt-2 text-zinc-400">@{username}</p>
                            <p className="mt-3 text-zinc-300">{bio}</p>
                        </div>
                    </div>

                    <div className="mt-6 flex flex-wrap items-center justify-center gap-3 md:mt-0">
                        {isOwnProfile ? (
                            <>
                                <Link
                                    href="/commissions/inbox"
                                    className="inline-flex items-center gap-2 rounded-full border border-purple-500/40 bg-purple-500/10 px-6 py-3 font-semibold text-purple-200 transition hover:bg-purple-500/20"
                                >
                                    <Inbox size={18} />
                                    Requests
                                </Link>

                                <Link
                                    href="/commissions/manage"
                                    className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white transition hover:bg-zinc-900"
                                >
                                    Manage Commissions
                                </Link>

                                <button
                                    type="button"
                                    onClick={() => setShowEdit(true)}
                                    className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
                                >
                                    Edit Profile
                                </button>
                            </>
                        ) : (
                            commissionsOpen && (
                                <Link
                                    href={`/commission/${username}`}
                                    className="rounded-full bg-white px-6 py-3 font-semibold text-black transition hover:bg-zinc-200"
                                >
                                    Hire Artist
                                </Link>
                            )
                        )}
                    </div>
                </div>
            </div>

            {showEdit && (
                <EditProfileModal
                    artist={artist}
                    username={username}
                    bio={bio}
                    avatar={avatar || ""}
                    commissionsOpen={commissionsOpen}
                    onClose={() => setShowEdit(false)}
                    onSave={() => {
                        setShowEdit(false);
                        window.location.reload();
                    }}
                />
            )}
        </>
    );
}