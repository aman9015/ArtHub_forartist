"use client";

import { useState } from "react";
import Image from "next/image";
import {
    X,
    Heart,
    MessageCircle,
    Repeat2,
    Bookmark,
    Share2,
    Send,
} from "lucide-react";

type ArtworkDetailModalProps = {
    image: string;
    title: string;
    artist: string;
    liked: boolean;
    likes: number;
    saved: boolean;
    onLike: () => void;
    onSave: () => void;
    onClose: () => void;
};

type Comment = {
    id: number;
    name: string;
    text: string;
};

export default function ArtworkDetailModal({
    image,
    title,
    artist,
    liked,
    likes,
    saved,
    onLike,
    onSave,
    onClose,
}: ArtworkDetailModalProps) {
    const [commentText, setCommentText] = useState("");

    const [comments, setComments] = useState<Comment[]>([
        {
            id: 1,
            name: "Aarav",
            text: "The lighting in this artwork is amazing.",
        },
        {
            id: 2,
            name: "Maya",
            text: "Love the mood and color palette.",
        },
    ]);

    function handleAddComment() {
        if (!commentText.trim()) return;

        const newComment: Comment = {
            id: Date.now(),
            name: "You",
            text: commentText,
        };

        setComments([newComment, ...comments]);
        setCommentText("");
    }

    return (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 px-4 backdrop-blur-md">
            <section className="relative grid max-h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-20 rounded-full bg-black/70 p-2 text-zinc-300 backdrop-blur hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="relative min-h-[360px] bg-zinc-900 lg:min-h-[650px]">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        sizes="(max-width: 1024px) 100vw, 60vw"
                        className="object-cover"
                    />
                </div>

                <div className="flex max-h-[90vh] flex-col overflow-hidden p-6">
                    <div className="shrink-0">
                        <h1 className="text-3xl font-bold">{title}</h1>
                        <p className="mt-2 text-zinc-400">by {artist}</p>

                        <p className="mt-6 leading-7 text-zinc-300">
                            A stunning digital artwork exploring color, emotion, light, and
                            atmosphere.
                        </p>

                        <div className="mt-8 grid grid-cols-4 gap-3">
                            <button
                                type="button"
                                onClick={onLike}
                                className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 hover:bg-zinc-900 ${liked ? "text-red-400" : ""
                                    }`}
                            >
                                <Heart size={22} fill={liked ? "currentColor" : "none"} />
                                <span className="text-sm">{likes}</span>
                            </button>

                            <button
                                type="button"
                                className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 hover:bg-zinc-900"
                            >
                                <MessageCircle size={22} />
                                <span className="text-sm">{comments.length}</span>
                            </button>

                            <button
                                type="button"
                                className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 hover:bg-zinc-900"
                            >
                                <Repeat2 size={22} />
                                <span className="text-sm">412</span>
                            </button>

                            <button
                                type="button"
                                onClick={onSave}
                                className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 hover:bg-zinc-900 ${saved ? "text-yellow-400" : ""
                                    }`}
                            >
                                <Bookmark size={22} fill={saved ? "currentColor" : "none"} />
                                <span className="text-sm">{saved ? "Saved" : "Save"}</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-800 py-3 font-semibold hover:bg-zinc-900"
                        >
                            <Share2 size={18} />
                            Share Artwork
                        </button>

                        <div className="mt-6 border-t border-zinc-800 pt-5">
                            <h3 className="font-bold">Comments</h3>

                            <div className="mt-4 flex gap-3">
                                <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") handleAddComment();
                                    }}
                                    placeholder="Write a comment..."
                                    className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none placeholder:text-zinc-500"
                                />

                                <button
                                    type="button"
                                    onClick={handleAddComment}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div className="mt-4 flex-1 space-y-3 overflow-y-auto pr-1">
                        {comments.map((comment) => (
                            <div key={comment.id} className="rounded-2xl bg-zinc-900 p-4">
                                <p className="font-semibold">{comment.name}</p>
                                <p className="mt-1 text-sm text-zinc-400">{comment.text}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </section>
        </div>
    );
}