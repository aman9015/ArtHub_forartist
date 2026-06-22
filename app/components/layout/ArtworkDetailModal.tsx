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
    Trash2,
    Flag,
} from "lucide-react";
import { addNotification } from "@/app/lib/storage";
import { createClient } from "@/app/lib/supabase";
import ReportModal from "@/app/components/modals/ReportModal";

type ArtworkDetailModalProps = {
    id: string | number;
    image: string;
    title: string;
    artist: string;
    liked: boolean;
    likes: number;
    saved: boolean;
    reposted: boolean;
    reposts: number;
    onLike: () => void;
    onSave: () => void;
    onRepost: () => void;
    onCommentsChange: (count: number) => void;
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

type ReportTarget =
    | {
          type: "artwork";
          id: string | number;
          label: string;
      }
    | {
          type: "comment";
          id: number;
          label: string;
      };

function formatCommentTime(createdAt: string, now: number) {
    const createdTime = new Date(createdAt).getTime();

    if (Number.isNaN(createdTime)) return "";

    const differenceInSeconds = Math.max(
        0,
        Math.floor((now - createdTime) / 1000)
    );

    if (differenceInSeconds < 10) return "Just now";
    if (differenceInSeconds < 60) return `${differenceInSeconds}s ago`;

    const minutes = Math.floor(differenceInSeconds / 60);

    if (minutes < 60) {
        return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}h ago`;
    }

    const days = Math.floor(hours / 24);

    if (days === 1) return "Yesterday";
    if (days < 7) return `${days} days ago`;

    return new Intl.DateTimeFormat("en-IN", {
        day: "numeric",
        month: "short",
        year: "numeric",
    }).format(new Date(createdAt));
}

export default function ArtworkDetailModal({
    id,
    image,
    title,
    artist,
    liked,
    likes,
    saved,
    reposted,
    reposts,
    onLike,
    onSave,
    onRepost,
    onCommentsChange,
    onClose,
}: ArtworkDetailModalProps) {
    const supabase = createClient();

    const [commentText, setCommentText] = useState("");
    const [shared, setShared] = useState(false);
    const [comments, setComments] = useState<Comment[]>([]);
    const [commentLoading, setCommentLoading] = useState(false);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);
    const [deletingCommentId, setDeletingCommentId] = useState<number | null>(
        null
    );
    const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null);
    const [now, setNow] = useState(() => Date.now());

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

        const formattedComments: Comment[] = (
            (commentsData || []) as DbComment[]
        ).map((comment) => {
            const profile = profiles.find((item) => item.id === comment.user_id);

            return {
                id: comment.id,
                user_id: comment.user_id,
                content: comment.content,
                created_at: comment.created_at,
                authorName: profile?.name || "Unknown User",
            };
        });

        setComments(formattedComments);
        onCommentsChange(formattedComments.length);
    }

    useEffect(() => {
        void loadComments();

        const previousOverflow = document.body.style.overflow;
        document.body.style.overflow = "hidden";

        return () => {
            document.body.style.overflow = previousOverflow;
        };
    }, [id]);

    useEffect(() => {
        async function loadCurrentUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setCurrentUserId(user?.id || null);
        }

        void loadCurrentUser();
    }, []);

    useEffect(() => {
        const interval = window.setInterval(() => {
            setNow(Date.now());
        }, 60_000);

        return () => window.clearInterval(interval);
    }, []);

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
        setNow(Date.now());
        await loadComments();
    }

    async function handleDeleteComment(commentId: number) {
        if (!currentUserId) return;

        const confirmed = window.confirm(
            "Do you want to permanently delete this comment?"
        );

        if (!confirmed) return;

        setDeletingCommentId(commentId);

        const { error } = await supabase
            .from("comments")
            .delete()
            .eq("id", commentId)
            .eq("user_id", currentUserId);

        setDeletingCommentId(null);

        if (error) {
            alert(error.message);
            return;
        }

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
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/75 p-3 backdrop-blur-md sm:p-5">
            <section className="relative grid h-[calc(100dvh-1.5rem)] w-full max-w-5xl grid-rows-[30vh_minmax(0,1fr)] overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl lg:h-[90vh] lg:grid-cols-[1.2fr_0.8fr] lg:grid-rows-1">
                <button
                    type="button"
                    onClick={onClose}
                    className="absolute right-4 top-4 z-20 rounded-full bg-black/70 p-2 text-zinc-300 backdrop-blur transition hover:text-white"
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

                <div className="relative bg-zinc-900 lg:hidden">
                    <Image
                        src={image}
                        alt={title}
                        fill
                        unoptimized
                        sizes="100vw"
                        className="object-cover"
                    />
                </div>

                <div className="min-h-0 overflow-y-auto overscroll-contain p-5 pr-4 sm:p-6 sm:pr-5">
                    <h1 className="pr-12 text-3xl font-bold">{title}</h1>
                    <p className="mt-2 text-zinc-400">by {artist}</p>

                    <p className="mt-6 leading-7 text-zinc-300">
                        A stunning digital artwork exploring color, emotion, light, and
                        atmosphere.
                    </p>

                    <div className="mt-8 grid grid-cols-4 gap-3">
                        <button
                            type="button"
                            onClick={onLike}
                            className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 transition hover:bg-zinc-900 ${
                                liked ? "text-red-400" : ""
                            }`}
                        >
                            <Heart size={22} fill={liked ? "currentColor" : "none"} />
                            <span className="text-sm">{likes}</span>
                        </button>

                        <button
                            type="button"
                            className="flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 transition hover:bg-zinc-900"
                        >
                            <MessageCircle size={22} />
                            <span className="text-sm">{comments.length}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onRepost}
                            className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 transition hover:bg-zinc-900 hover:text-green-400 ${
                                reposted ? "text-green-400" : ""
                            }`}
                        >
                            <Repeat2 size={22} />
                            <span className="text-sm">{reposts}</span>
                        </button>

                        <button
                            type="button"
                            onClick={onSave}
                            className={`flex flex-col items-center gap-2 rounded-2xl border border-zinc-800 py-4 transition hover:bg-zinc-900 ${
                                saved ? "text-yellow-400" : ""
                            }`}
                        >
                            <Bookmark size={22} fill={saved ? "currentColor" : "none"} />
                            <span className="text-sm">{saved ? "Saved" : "Save"}</span>
                        </button>
                    </div>

                    <button
                        type="button"
                        onClick={handleShare}
                        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-800 py-3 font-semibold transition hover:bg-zinc-900"
                    >
                        {shared ? <Check size={18} /> : <Share2 size={18} />}
                        {shared ? "Shared / Link Copied" : "Share Artwork"}
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            setReportTarget({
                                type: "artwork",
                                id,
                                label: title,
                            })
                        }
                        className="mt-3 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-800 py-3 text-sm font-semibold text-zinc-300 transition hover:border-red-900/60 hover:bg-red-950/20 hover:text-red-300"
                    >
                        <Flag size={17} />
                        Report Artwork
                    </button>

                    <div className="mt-6 border-t border-zinc-800 pt-5">
                        <h3 className="font-bold">Comments ({comments.length})</h3>

                        <div className="mt-4 flex gap-3">
                            <input
                                type="text"
                                value={commentText}
                                onChange={(event) => setCommentText(event.target.value)}
                                onKeyDown={(event) => {
                                    if (event.key === "Enter") {
                                        void handleAddComment();
                                    }
                                }}
                                placeholder="Write a comment..."
                                className="min-w-0 flex-1 rounded-full border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none placeholder:text-zinc-500"
                            />

                            <button
                                type="button"
                                onClick={() => void handleAddComment()}
                                disabled={commentLoading}
                                className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-white text-black transition hover:bg-zinc-200 disabled:opacity-60"
                            >
                                <Send size={18} />
                            </button>
                        </div>
                    </div>

                    <div className="mt-5 space-y-3 border-t border-zinc-800 pt-4">
                        {comments.length > 0 ? (
                            comments.map((comment) => {
                                const isMyComment = comment.user_id === currentUserId;
                                const isDeleting = deletingCommentId === comment.id;

                                return (
                                    <div
                                        key={comment.id}
                                        className="rounded-2xl bg-zinc-900 p-4"
                                    >
                                        <div className="flex items-start justify-between gap-3">
                                            <div>
                                                <p className="font-semibold">
                                                    {comment.authorName}
                                                </p>

                                                <p className="mt-1 text-xs text-zinc-500">
                                                    {formatCommentTime(comment.created_at, now)}
                                                </p>
                                            </div>

                                            {isMyComment ? (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        void handleDeleteComment(comment.id)
                                                    }
                                                    disabled={isDeleting}
                                                    title="Delete comment"
                                                    aria-label="Delete comment"
                                                    className="rounded-full p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400 disabled:opacity-50"
                                                >
                                                    <Trash2 size={17} />
                                                </button>
                                            ) : (
                                                <button
                                                    type="button"
                                                    onClick={() =>
                                                        setReportTarget({
                                                            type: "comment",
                                                            id: comment.id,
                                                            label: `Comment by ${comment.authorName}`,
                                                        })
                                                    }
                                                    title="Report comment"
                                                    aria-label="Report comment"
                                                    className="rounded-full p-2 text-zinc-500 transition hover:bg-red-500/10 hover:text-red-400"
                                                >
                                                    <Flag size={17} />
                                                </button>
                                            )}
                                        </div>

                                        <p className="mt-3 break-words text-sm leading-6 text-zinc-300">
                                            {comment.content}
                                        </p>
                                    </div>
                                );
                            })
                        ) : (
                            <div className="rounded-2xl bg-zinc-900 p-4 text-sm text-zinc-500">
                                No comments yet. Be the first to comment.
                            </div>
                        )}
                    </div>
                </div>
            </section>

            {reportTarget && (
                <ReportModal
                    targetType={reportTarget.type}
                    targetId={reportTarget.id}
                    targetLabel={reportTarget.label}
                    onClose={() => setReportTarget(null)}
                />
            )}
        </div>
    );
}