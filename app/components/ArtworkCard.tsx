"use client";

import { createNotification } from "@/app/lib/notifications";
import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
    Ban,
    Bookmark,
    Flag,
    Heart,
    MessageCircle,
    MoreHorizontal,
    Repeat2,
    Trash2,
} from "lucide-react";

import ArtworkDetailModal from "./layout/ArtworkDetailModal";
import ReportModal from "@/app/components/modals/ReportModal";
import { createClient } from "@/app/lib/supabase";

type RepostedBy = {
    name: string;
    username: string;
    avatarUrl: string | null;
};

type ArtworkCardProps = {
    id: string;
    image: string;
    title: string;
    artist: string;
    username: string;
    ownerId: string;
    avatarUrl: string | null;
    repostedBy?: RepostedBy;

    viewerUserId: string | null;

    initialLikes: number;
    initialComments: number;
    initialReposts: number;
    initialSaves: number;

    initialLiked: boolean;
    initialSaved: boolean;
    initialReposted: boolean;
    initialFollowing: boolean;

    onDelete?: (id: string) => void;

    variant?: "feed" | "profile";
};

export default function ArtworkCard({
    id,
    image,
    title,
    artist,
    username,
    ownerId,
    avatarUrl,
    repostedBy,
    viewerUserId,
    initialLikes,
    initialComments,
    initialReposts,
    initialSaves,
    initialLiked,
    initialSaved,
    initialReposted,
    initialFollowing,
    onDelete,
    variant = "feed",
}: ArtworkCardProps) {
    const supabase = useMemo(() => createClient(), []);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSafetyMenuOpen, setIsSafetyMenuOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const [hiddenByBlock, setHiddenByBlock] = useState(false);

    const [liked, setLiked] = useState(initialLiked);
    const [saved, setSaved] = useState(initialSaved);
    const [following, setFollowing] = useState(initialFollowing);
    const [reposted, setReposted] = useState(initialReposted);

    const [likes, setLikes] = useState(initialLikes);
    const [saves, setSaves] = useState(initialSaves);
    const [commentCount, setCommentCount] = useState(initialComments);
    const [repostCount, setRepostCount] = useState(initialReposts);

    const [repostLoading, setRepostLoading] = useState(false);

    const isOwner = viewerUserId === ownerId;
    const isCreator = username.trim().toLowerCase() === "the_creator";
    const isRepostedByCreator =
        repostedBy?.username.trim().toLowerCase() === "the_creator";

    useEffect(() => {
        setLiked(initialLiked);
        setSaved(initialSaved);
        setFollowing(initialFollowing);
        setReposted(initialReposted);

        setLikes(initialLikes);
        setSaves(initialSaves);
        setCommentCount(initialComments);
        setRepostCount(initialReposts);

        setHiddenByBlock(false);
        setIsSafetyMenuOpen(false);
    }, [
        id,
        initialLiked,
        initialSaved,
        initialFollowing,
        initialReposted,
        initialLikes,
        initialSaves,
        initialComments,
        initialReposts,
    ]);

    async function handleLike() {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (liked) {
            const { error } = await supabase
                .from("likes")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id);

            if (error) {
                alert(error.message);
                return;
            }

            setLiked(false);
            setLikes((previous) => Math.max(previous - 1, 0));
            return;
        }

        const { error } = await supabase.from("likes").insert({
            user_id: viewerUserId,
            artwork_id: id,
        });

        if (error) {
            alert(error.message);
            return;
        }

        setLiked(true);
        setLikes((previous) => previous + 1);

        if (ownerId !== viewerUserId) {
            await createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "like",
                message: `liked your artwork "${title}"`,
            });
        }
    }

    async function handleSave() {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (saved) {
            const { error } = await supabase
                .from("saves")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id);

            if (error) {
                alert(error.message);
                return;
            }

            setSaved(false);
            setSaves((previous) => Math.max(previous - 1, 0));
            return;
        }

        const { error } = await supabase.from("saves").insert({
            user_id: viewerUserId,
            artwork_id: id,
        });

        if (error) {
            alert(error.message);
            return;
        }

        setSaved(true);
        setSaves((previous) => previous + 1);

        if (ownerId !== viewerUserId) {
            await createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "save",
                message: `saved your artwork "${title}"`,
            });
        }
    }

    async function handleRepost() {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (repostLoading) return;

        setRepostLoading(true);

        if (reposted) {
            const { error } = await supabase
                .from("reposts")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id);

            setRepostLoading(false);

            if (error) {
                alert(error.message);
                return;
            }

            setReposted(false);
            setRepostCount((previous) => Math.max(previous - 1, 0));

            window.dispatchEvent(new Event("arthub:repost-changed"));
            return;
        }

        const { error } = await supabase.from("reposts").insert({
            user_id: viewerUserId,
            artwork_id: id,
        });

        setRepostLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        setReposted(true);
        setRepostCount((previous) => previous + 1);

        if (ownerId !== viewerUserId) {
            await createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "repost",
                message: `reposted your artwork "${title}"`,
            });
        }

        window.dispatchEvent(new Event("arthub:repost-changed"));
    }

    async function handleFollow() {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (isOwner) return;

        const { data: usersBlocked, error: blockedError } = await supabase.rpc(
            "are_users_blocked",
            {
                p_first_user_id: viewerUserId,
                p_second_user_id: ownerId,
            }
        );

        if (blockedError) {
            alert(blockedError.message);
            return;
        }

        if (usersBlocked) {
            alert(
                "You cannot follow this artist because one of you has blocked the other."
            );
            return;
        }

        if (following) {
            const { error } = await supabase
                .from("follows")
                .delete()
                .eq("follower_id", viewerUserId)
                .eq("following_id", ownerId);

            if (error) {
                alert(error.message);
                return;
            }

            setFollowing(false);
            return;
        }

        const { error } = await supabase.from("follows").insert({
            follower_id: viewerUserId,
            following_id: ownerId,
        });

        if (error) {
            alert(error.message);
            return;
        }

        setFollowing(true);

        await createNotification({
            userId: ownerId,
            actorId: viewerUserId,
            type: "follow",
            message: "started following you",
        });
    }

    async function handleBlockArtist() {
        if (!viewerUserId || isOwner || blockLoading) return;

        const confirmed = window.confirm(
            `Block @${username}?\n\nYou will no longer see their posts, both follow relationships will be removed, and neither of you will be able to message or interact with the other.`
        );

        if (!confirmed) return;

        setBlockLoading(true);

        const { error } = await supabase.rpc("block_user", {
            p_blocked_id: ownerId,
        });

        setBlockLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        setIsSafetyMenuOpen(false);
        setHiddenByBlock(true);

        alert(`@${username} has been blocked.`);
    }

    function handleDelete() {
        if (!onDelete) return;
        onDelete(id);
    }

    const detailModal = isDetailOpen ? (
        <ArtworkDetailModal
            id={id}
            image={image}
            title={title}
            artist={artist}
            liked={liked}
            likes={likes}
            saved={saved}
            reposted={reposted}
            reposts={repostCount}
            onLike={handleLike}
            onSave={handleSave}
            onRepost={handleRepost}
            onCommentsChange={setCommentCount}
            onClose={() => setIsDetailOpen(false)}
        />
    ) : null;

    if (hiddenByBlock) {
        return null;
    }

    if (variant === "profile") {
        return (
            <>
                <article className="group relative aspect-[4/5] overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                    <button
                        type="button"
                        onClick={() => setIsDetailOpen(true)}
                        className="absolute inset-0 block w-full text-left"
                        aria-label={`Open ${title}`}
                    >
                        <Image
                            src={image}
                            alt={title}
                            fill
                            unoptimized
                            sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                            className="object-cover transition duration-300 group-hover:scale-105"
                        />
                    </button>

                    <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black via-black/20 to-transparent" />

                    {isOwner && (
                        <button
                            type="button"
                            onClick={handleDelete}
                            title="Delete artwork"
                            aria-label="Delete artwork"
                            className="absolute right-3 top-3 z-10 rounded-full border border-red-900/60 bg-black/60 p-2 text-red-400 opacity-100 backdrop-blur transition hover:bg-red-950 sm:opacity-0 sm:group-hover:opacity-100"
                        >
                            <Trash2 size={17} />
                        </button>
                    )}

                    <div className="absolute inset-x-0 bottom-0 z-10 p-4">
                        <button
                            type="button"
                            onClick={() => setIsDetailOpen(true)}
                            className="max-w-full text-left"
                        >
                            <h2 className="truncate text-lg font-bold text-white hover:underline">
                                {title}
                            </h2>
                        </button>

                        <div className="mt-3 flex items-center justify-between gap-2">
                            <div className="flex min-w-0 items-center gap-3 text-sm text-zinc-100">
                                <button
                                    type="button"
                                    onClick={() => void handleLike()}
                                    className={`flex items-center gap-1.5 transition hover:text-red-400 ${liked ? "text-red-400" : ""
                                        }`}
                                    title="Like"
                                >
                                    <Heart
                                        size={18}
                                        fill={liked ? "currentColor" : "none"}
                                    />
                                    <span>{likes}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsDetailOpen(true)}
                                    className="flex items-center gap-1.5 transition hover:text-blue-400"
                                    title="Comments"
                                >
                                    <MessageCircle size={18} />
                                    <span>{commentCount}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleRepost()}
                                    disabled={repostLoading}
                                    className={`flex items-center gap-1.5 transition hover:text-green-400 disabled:opacity-50 ${reposted ? "text-green-400" : ""
                                        }`}
                                    title="Repost"
                                >
                                    <Repeat2 size={18} />
                                    <span>{repostCount}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                className={`shrink-0 transition hover:text-yellow-400 ${saved ? "text-yellow-400" : "text-zinc-100"
                                    }`}
                                title={saved ? "Unsave artwork" : "Save artwork"}
                            >
                                <Bookmark
                                    size={19}
                                    fill={saved ? "currentColor" : "none"}
                                />
                            </button>
                        </div>
                    </div>
                </article>

                {detailModal}
            </>
        );
    }

    return (
        <>
            <div className="space-y-2">
                {repostedBy && (
                    <Link
                        href={`/profile/${repostedBy.username}`}
                        className="flex items-center gap-2 px-2 text-sm font-semibold text-zinc-400 transition hover:text-zinc-200"
                    >
                        <div
                            className={
                                isRepostedByCreator
                                    ? "rounded-full bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 p-[2px] shadow-[0_0_12px_rgba(245,158,11,0.55)]"
                                    : ""
                            }
                        >
                            {repostedBy.avatarUrl ? (
                                <img
                                    src={repostedBy.avatarUrl}
                                    alt={repostedBy.name}
                                    className={`h-6 w-6 rounded-full object-cover ${isRepostedByCreator
                                            ? "border border-zinc-950"
                                            : "border border-zinc-700"
                                        }`}
                                />
                            ) : (
                                <div
                                    className={`flex h-6 w-6 items-center justify-center rounded-full bg-zinc-800 text-[10px] font-bold text-zinc-200 ${isRepostedByCreator
                                            ? "border border-zinc-950"
                                            : ""
                                        }`}
                                >
                                    {repostedBy.name.charAt(0).toUpperCase()}
                                </div>
                            )}
                        </div>

                        <Repeat2 size={16} className="text-green-400" />

                        <span>
                            {repostedBy.name} reposted
                            <span className="ml-1 font-normal text-zinc-600">
                                @{repostedBy.username}
                            </span>
                        </span>
                    </Link>
                )}

                <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                    <div className="flex items-center justify-between gap-4 p-5">
                        <Link
                            href={`/profile/${username}`}
                            className="flex items-center gap-3"
                        >
                            <div
                                className={
                                    isCreator
                                        ? "rounded-full bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 p-[3px] shadow-[0_0_18px_rgba(245,158,11,0.6)]"
                                        : ""
                                }
                            >
                                {avatarUrl ? (
                                    <img
                                        src={avatarUrl}
                                        alt={artist}
                                        className={`h-11 w-11 rounded-full object-cover ${isCreator
                                                ? "border-2 border-zinc-950"
                                                : "border border-zinc-700"
                                            }`}
                                    />
                                ) : (
                                    <div
                                        className={`flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-bold ${isCreator
                                                ? "border-2 border-zinc-950"
                                                : ""
                                            }`}
                                    >
                                        {artist.charAt(0)}
                                    </div>
                                )}
                            </div>

                            <div>
                                <h2 className="text-lg font-bold">{artist}</h2>
                                <p className="text-sm text-zinc-400">@{username}</p>
                            </div>
                        </Link>

                        <div className="flex items-center gap-2">
                            {!isOwner && (
                                <button
                                    type="button"
                                    onClick={() => void handleFollow()}
                                    className={`rounded-full px-4 py-2 text-sm ${following
                                            ? "border border-zinc-700 bg-zinc-900 text-white"
                                            : "border border-zinc-700 hover:bg-zinc-800"
                                        }`}
                                >
                                    {following ? "Following" : "Follow"}
                                </button>
                            )}

                            {!isOwner && (
                                <div className="relative">
                                    <button
                                        type="button"
                                        onClick={() =>
                                            setIsSafetyMenuOpen((current) => !current)
                                        }
                                        className="rounded-full border border-zinc-800 p-2 text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
                                        aria-label="Post safety actions"
                                    >
                                        <MoreHorizontal size={18} />
                                    </button>

                                    {isSafetyMenuOpen && (
                                        <div className="absolute right-0 top-12 z-30 w-52 overflow-hidden rounded-2xl border border-zinc-800 bg-zinc-950 p-1 shadow-2xl">
                                            <button
                                                type="button"
                                                onClick={() => {
                                                    setIsSafetyMenuOpen(false);
                                                    setIsReportOpen(true);
                                                }}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-zinc-200 transition hover:bg-zinc-900"
                                            >
                                                <Flag size={16} />
                                                Report artwork
                                            </button>

                                            <button
                                                type="button"
                                                onClick={() => void handleBlockArtist()}
                                                disabled={blockLoading}
                                                className="flex w-full items-center gap-2 rounded-xl px-3 py-2.5 text-left text-sm text-red-400 transition hover:bg-red-500/10 disabled:opacity-50"
                                            >
                                                <Ban size={16} />
                                                {blockLoading
                                                    ? "Blocking..."
                                                    : `Block @${username}`}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {isOwner && (
                                <button
                                    type="button"
                                    onClick={handleDelete}
                                    className="rounded-full border border-red-900/60 px-3 py-2 text-red-400 hover:bg-red-950"
                                >
                                    <Trash2 size={17} />
                                </button>
                            )}
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setIsDetailOpen(true)}
                        className="relative block h-[420px] w-full overflow-hidden text-left sm:h-[520px]"
                    >
                        <Image
                            src={image}
                            alt={title}
                            fill
                            unoptimized
                            sizes="(max-width: 768px) 100vw, 672px"
                            className="object-cover"
                        />
                    </button>

                    <div className="p-5">
                        <button
                            type="button"
                            onClick={() => setIsDetailOpen(true)}
                            className="text-left"
                        >
                            <h2 className="text-2xl font-bold hover:underline">
                                {title}
                            </h2>
                        </button>

                        <div className="mt-5 flex items-center justify-between">
                            <div className="flex gap-5 text-zinc-200">
                                <button
                                    type="button"
                                    onClick={() => void handleLike()}
                                    className={`flex items-center gap-2 hover:text-red-400 ${liked ? "text-red-400" : ""
                                        }`}
                                >
                                    <Heart
                                        size={21}
                                        fill={liked ? "currentColor" : "none"}
                                    />
                                    <span>{likes}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => setIsDetailOpen(true)}
                                    className="flex items-center gap-2 hover:text-blue-400"
                                >
                                    <MessageCircle size={21} />
                                    <span>{commentCount}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleRepost()}
                                    disabled={repostLoading}
                                    className={`flex items-center gap-2 transition hover:text-green-400 disabled:opacity-50 ${reposted ? "text-green-400" : ""
                                        }`}
                                >
                                    <Repeat2 size={21} />
                                    <span>{repostCount}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                className={`flex items-center gap-1 hover:text-yellow-400 ${saved ? "text-yellow-400" : ""
                                    }`}
                            >
                                <Bookmark
                                    size={21}
                                    fill={saved ? "currentColor" : "none"}
                                />

                                {saves > 0 && (
                                    <span className="text-sm">{saves}</span>
                                )}
                            </button>
                        </div>
                    </div>
                </article>
            </div>

            {detailModal}

            {isReportOpen && (
                <ReportModal
                    targetType="artwork"
                    targetId={id}
                    targetLabel={title}
                    onClose={() => setIsReportOpen(false)}
                />
            )}
        </>
    );
}