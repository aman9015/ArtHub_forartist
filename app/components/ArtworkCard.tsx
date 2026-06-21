"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useState } from "react";
import {
    Heart,
    MessageCircle,
    Repeat2,
    Bookmark,
    Trash2,
} from "lucide-react";
import ArtworkDetailModal from "./layout/ArtworkDetailModal";
import { addNotification, getStorage, toggleItem } from "../lib/storage";

type ArtworkCardProps = {
    id: number;
    image: string;
    title: string;
    artist: string;
    username: string;
    onDelete?: (id: number) => void;
};

export default function ArtworkCard({
    id,
    image,
    title,
    artist,
    username,
    onDelete,
}: ArtworkCardProps) {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [likes, setLikes] = useState(2300);

    useEffect(() => {
        const likedPosts = getStorage<number[]>("arthub_liked_posts", []);
        const savedPosts = getStorage<number[]>("arthub_saved_posts", []);

        setLiked(likedPosts.includes(id));
        setSaved(savedPosts.includes(id));
    }, [id]);

    function handleLike() {
        const updatedLikes = toggleItem("arthub_liked_posts", id);
        const isNowLiked = updatedLikes.includes(id);

        setLiked(isNowLiked);
        setLikes((prev) => (isNowLiked ? prev + 1 : Math.max(prev - 1, 0)));

        if (isNowLiked) {
            addNotification({
                type: "like",
                user: "You",
                message: "liked an artwork",
                artwork: title,
            });
        }
    }

    function handleSave() {
        const updatedSaved = toggleItem("arthub_saved_posts", id);
        const isNowSaved = updatedSaved.includes(id);

        setSaved(isNowSaved);

        if (isNowSaved) {
            addNotification({
                type: "bookmark",
                user: "You",
                message: "saved an artwork",
                artwork: title,
            });
        }
    }

    function handleDelete() {
        if (!onDelete) return;
        onDelete(id);
    }

    return (
        <>
            <article className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950 transition-all duration-300 hover:border-zinc-700">
                <button
                    type="button"
                    onClick={() => setIsDetailOpen(true)}
                    className="relative block h-[420px] w-full overflow-hidden text-left sm:h-[520px]"
                >
                    <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(max-width: 768px) 100vw, 672px"
                        className="object-cover transition-transform duration-500 group-hover:scale-105"
                    />
                </button>

                <div className="p-5">
                    <div className="flex items-start justify-between gap-4">
                        <div>
                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className="text-left"
                            >
                                <h2 className="text-2xl font-bold hover:underline">{title}</h2>
                            </button>

                            <Link
                                href={`/profile/${username}`}
                                className="mt-1 block text-zinc-400 hover:text-white"
                            >
                                by {artist}
                            </Link>
                        </div>

                        <div className="flex gap-2">
                            <button className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                                Follow
                            </button>

                            <button
                                type="button"
                                onClick={handleDelete}
                                className="rounded-full border border-red-900/60 px-3 py-2 text-red-400 hover:bg-red-950"
                            >
                                <Trash2 size={17} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 flex items-center justify-between">
                        <div className="flex gap-5 text-zinc-200">
                            <button
                                type="button"
                                onClick={handleLike}
                                className={`flex items-center gap-2 hover:text-red-400 ${liked ? "text-red-400" : ""
                                    }`}
                            >
                                <Heart size={21} fill={liked ? "currentColor" : "none"} />
                                <span>{likes}</span>
                            </button>

                            <button
                                type="button"
                                onClick={() => setIsDetailOpen(true)}
                                className="flex items-center gap-2 hover:text-blue-400"
                            >
                                <MessageCircle size={21} />
                                <span>184</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center gap-2 hover:text-green-400"
                            >
                                <Repeat2 size={21} />
                                <span>412</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            className={`hover:text-yellow-400 ${saved ? "text-yellow-400" : ""
                                }`}
                        >
                            <Bookmark size={21} fill={saved ? "currentColor" : "none"} />
                        </button>
                    </div>
                </div>
            </article>

            {isDetailOpen && (
                <ArtworkDetailModal
                    id={id}
                    image={image}
                    title={title}
                    artist={artist}
                    liked={liked}
                    likes={likes}
                    saved={saved}
                    onLike={handleLike}
                    onSave={handleSave}
                    onClose={() => setIsDetailOpen(false)}
                />
            )}
        </>
    );
}