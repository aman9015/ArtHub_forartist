"use client";

import { useEffect, useState } from "react";
import Image from "next/image";
import {
    X,
    Heart,
    MessageCircle,
    Repeat2,
    Bookmark,
    Share2,
    Send,
    Check,
} from "lucide-react";
import { addNotification } from "@/app/lib/storage";
import { createClient } from "@/app/lib/supabase";

type ArtworkDetailModalProps = {
    id: string | number;
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
    user_id: string;
    content: string;
    created_at: string;
    authorName: string;
};

type DbComment = {
    id: number;
    user_id: string;
    content: string;
    created_at: string;
};

type Profile = {
    id: string;
    name: string;
    username: string;
};

export default function ArtworkDetailModal({
    id,
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
    const supabase = createClient();

    const [commentText, setCommentText] = useState("");
    const [shared, setShared] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentLoading, setCommentLoading] = useState(false);

    async function loadComments() {
        const { data: commentsData, error: commentsError } = await supabase
            .from("comments")
            .select("id, user_id, content, created_at")
            .eq("artwork_id", String(id))
            .order("created_at", { ascending: false });

        if (commentsError) {
            console.log(commentsError.message);
            return;
        }

        const { data: profilesData } = await supabase
            .from("profiles")
            .select("id, name, username");

        const profiles = (profilesData || []) as Profile[];

        const formattedComments: Comment[] = ((commentsData || []) as DbComment[]).map(
            (comment) => {
                const profile = profiles.find((p) => p.id === comment.user_id);

                return {
                    id: comment.id,
                    user_id: comment.user_id,
                    content: comment.content,
                    created_at: comment.created_at,
                    authorName: profile?.name || "Unknown User",
                };
            }
        );

        setComments(formattedComments);
    }

    useEffect(() => {
        loadComments();

        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = "";
        };
    }, [id]);

    async function handleAddComment() {
        if (!commentText.trim()) return;

        setCommentLoading(true);

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setCommentLoading(false);
            alert("Please login first.");
            return;
        }

        const { error } = await supabase.from("comments").insert({
            user_id: user.id,
            artwork_id: String(id),
            content: commentText.trim(),
        });

        setCommentLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        addNotification({
            type: "comment",
            user: "You",
            message: "commented on",
            artwork: title,
        });

        setCommentText("");
        await loadComments();
    }

    async function handleShare() {
        const shareUrl = `${window.location.origin}/artwork/${id}`;

        try {
            if (navigator.share) {
                await navigator.share({
                    title,
                    text: `Check out "${title}" by ${artist} on ArtHub.`,
                    url: shareUrl,
                });
            } else {
                await navigator.clipboard.writeText(shareUrl);
            }

            setShared(true);
            setTimeout(() => setShared(false), 1800);
        } catch {
            await navigator.clipboard.writeText(shareUrl);
            setShared(true);
            setTimeout(() => setShared(false), 1800);
        }
    }

    return (
        <div
            className="fixed inset-0 z-[120] flex items-center justify-center overflow-hidden bg-black/75 px-4 backdrop-blur-md"
            onWheel={(e) => e.stopPropagation()}
            onTouchMove={(e) => e.stopPropagation()}
        >
            <section className="relative grid h-[90vh] w-full max-w-5xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl lg:grid-cols-[1.2fr_0.8fr]">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-20 rounded-full bg-black/70 p-2 text-zinc-300 backdrop-blur hover:text-white"
                >
                    <X size={24} />
                </button>

                <div className="relative hidden bg-zinc-900 lg:block">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        unoptimized
                        sizes="60vw"
                        className="object-cover"
                    />
                </div>

                <div className="relative min-h-[280px] bg-zinc-900 lg:hidden">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                    />
                </div>

                <div className="flex h-full min-h-0 flex-col overflow-hidden p-6">
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
                                <span className="text-sm">0</span>
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
                            onClick={handleShare}
                            className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-800 py-3 font-semibold hover:bg-zinc-900"
                        >
                            {shared ? <Check size={18} /> : <Share2 size={18} />}
                            {shared ? "Shared / Link Copied" : "Share Artwork"}
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
                                    disabled={commentLoading}
                                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black hover:bg-zinc-200 disabled:opacity-60"
                                >
                                    <Send size={18} />
                                </button>
                            </div>
                        </div>
                    </div>

                    <div
                        className="mt-4 min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain border-t border-zinc-800 pt-4 pr-1"
                        onWheel={(e) => e.stopPropagation()}
                        onTouchMove={(e) => e.stopPropagation()}
                    >
                        {comments.length > 0 ? (
                            comments.map((comment) => (
                                <div key={comment.id} className="rounded-2xl bg-zinc-900 p-4">
                                    <p className="font-semibold">{comment.authorName}</p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        {comment.content}
                                    </p>
                                </div>
                            ))
                        ) : (
                            <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-500">
                                No comments yet. Be the first to comment.
                            </div>
                        )}
                    </div>
                </div>
            </section>
        </div>
    );
}