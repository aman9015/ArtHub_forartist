"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { Heart, MessageCircle, Repeat2, Bookmark } from "lucide-react";
import ArtworkDetailModal from "./layout/ArtworkDetailModal";

type ArtworkCardProps = {
    image: string;
    title: string;
    artist: string;
    username: string;
};

export default function ArtworkCard({
    image,
    title,
    artist,
    username,
}: ArtworkCardProps) {
    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [likes, setLikes] = useState(2300);
    const [saved, setSaved] = useState(false);

    function handleLike() {
        setLiked((prev) => !prev);
        setLikes((prev) => (liked ? prev - 1 : prev + 1));
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
                                <h2 className="text-2xl font-bold hover:underline">
                                    {title}
                                </h2>
                            </button>

                            <Link
                                href={`/profile/${username}`}
                                className="mt-1 block text-zinc-400 hover:text-white"
                            >
                                by {artist}
                            </Link>
                        </div>

                        <button className="rounded-full border border-zinc-700 px-4 py-2 text-sm hover:bg-zinc-800">
                            Follow
                        </button>
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
                            onClick={() => setSaved((prev) => !prev)}
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
                    image={image}
                    title={title}
                    artist={artist}
                    liked={liked}
                    likes={likes}
                    saved={saved}
                    onLike={handleLike}
                    onSave={() => setSaved((prev) => !prev)}
                    onClose={() => setIsDetailOpen(false)}
                />
            )}
        </>
    );
}