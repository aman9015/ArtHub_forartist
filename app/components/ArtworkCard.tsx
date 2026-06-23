"use client";

import dynamic from "next/dynamic";
import Image from "next/image";
import Link from "next/link";
import {
    memo,
    useCallback,
    useEffect,
    useRef,
    useState,
} from "react";
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

import { createNotification } from "@/app/lib/notifications";
import { createClient } from "@/app/lib/supabase";

const ArtworkDetailModal = dynamic(
    () => import("./layout/ArtworkDetailModal"),
    {
        ssr: false,
        loading: () => null,
    }
);

const ReportModal = dynamic(
    () => import("@/app/components/modals/ReportModal"),
    {
        ssr: false,
        loading: () => null,
    }
);

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

    onDelete?: (id: string) => void | Promise<void>;

    variant?: "feed" | "profile";
};

type ArtistAvatarProps = {
    imageUrl: string | null;
    label: string;
    sizeClass: string;
    isCreator: boolean;
    small?: boolean;
};

function ArtistAvatar({
    imageUrl,
    label,
    sizeClass,
    isCreator,
    small = false,
}: ArtistAvatarProps) {
    const ringClass = small
        ? "rounded-full bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 p-[2px] shadow-[0_0_12px_rgba(245,158,11,0.55)]"
        : "rounded-full bg-gradient-to-br from-yellow-100 via-amber-400 to-yellow-700 p-[3px] shadow-[0_0_18px_rgba(245,158,11,0.6)]";

    const avatarBorder = isCreator
        ? "border-2 border-zinc-950"
        : "border border-zinc-700";

    return (
        <div className={isCreator ? ringClass : "shrink-0"}>
            {imageUrl ? (
                <img
                    src={imageUrl}
                    alt={label}
                    className={`${sizeClass} rounded-full object-cover ${avatarBorder}`}
                />
            ) : (
                <div
                    className={`flex ${sizeClass} items-center justify-center rounded-full bg-zinc-800 font-bold text-zinc-200 ${isCreator ? "border-2 border-zinc-950" : ""
                        }`}
                >
                    {label.charAt(0).toUpperCase()}
                </div>
            )}
        </div>
    );
}

function ArtworkCard({
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
    const supabaseRef = useRef<ReturnType<typeof createClient> | null>(null);

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [isSafetyMenuOpen, setIsSafetyMenuOpen] = useState(false);
    const [isReportOpen, setIsReportOpen] = useState(false);

    const [hiddenByBlock, setHiddenByBlock] = useState(false);

    const [liked, setLiked] = useState(initialLiked);
    const [saved, setSaved] = useState(initialSaved);
    const [following, setFollowing] = useState(initialFollowing);
    const [reposted, setReposted] = useState(initialReposted);

    const [likes, setLikes] = useState(initialLikes);
    const [saves, setSaves] = useState(initialSaves);
    const [commentCount, setCommentCount] = useState(initialComments);
    const [repostCount, setRepostCount] = useState(initialReposts);

    const [likeLoading, setLikeLoading] = useState(false);
    const [saveLoading, setSaveLoading] = useState(false);
    const [followLoading, setFollowLoading] = useState(false);
    const [repostLoading, setRepostLoading] = useState(false);
    const [blockLoading, setBlockLoading] = useState(false);
    const [deleteLoading, setDeleteLoading] = useState(false);

    const isOwner = viewerUserId === ownerId;
    const isCreator = username.trim().toLowerCase() === "the_creator";
    const isRepostedByCreator =
        repostedBy?.username.trim().toLowerCase() === "the_creator";

    const getSupabase = useCallback(() => {
        if (!supabaseRef.current) {
            supabaseRef.current = createClient();
        }

        return supabaseRef.current;
    }, []);

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
        setIsDetailOpen(false);
        setIsReportOpen(false);

        setLikeLoading(false);
        setSaveLoading(false);
        setFollowLoading(false);
        setRepostLoading(false);
        setBlockLoading(false);
        setDeleteLoading(false);
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

    const handleLike = useCallback(async () => {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (likeLoading) return;

        const wasLiked = liked;
        const change = wasLiked ? -1 : 1;

        setLikeLoading(true);
        setLiked(!wasLiked);
        setLikes((current) => Math.max(current + change, 0));

        const supabase = getSupabase();

        const { error } = wasLiked
            ? await supabase
                .from("likes")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id)
            : await supabase.from("likes").insert({
                user_id: viewerUserId,
                artwork_id: id,
            });

        if (error) {
            setLiked(wasLiked);
            setLikes((current) => Math.max(current - change, 0));
            alert(error.message);
            setLikeLoading(false);
            return;
        }

        if (!wasLiked && ownerId !== viewerUserId) {
            void createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "like",
                message: `liked your artwork "${title}"`,
            });
        }

        setLikeLoading(false);
    }, [
        getSupabase,
        id,
        likeLoading,
        liked,
        ownerId,
        title,
        viewerUserId,
    ]);

    const handleSave = useCallback(async () => {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (saveLoading) return;

        const wasSaved = saved;
        const change = wasSaved ? -1 : 1;

        setSaveLoading(true);
        setSaved(!wasSaved);
        setSaves((current) => Math.max(current + change, 0));

        const supabase = getSupabase();

        const { error } = wasSaved
            ? await supabase
                .from("saves")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id)
            : await supabase.from("saves").insert({
                user_id: viewerUserId,
                artwork_id: id,
            });

        if (error) {
            setSaved(wasSaved);
            setSaves((current) => Math.max(current - change, 0));
            alert(error.message);
            setSaveLoading(false);
            return;
        }

        if (!wasSaved && ownerId !== viewerUserId) {
            void createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "save",
                message: `saved your artwork "${title}"`,
            });
        }

        setSaveLoading(false);
    }, [
        getSupabase,
        id,
        ownerId,
        saveLoading,
        saved,
        title,
        viewerUserId,
    ]);

    const handleRepost = useCallback(async () => {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (repostLoading) return;

        const wasReposted = reposted;
        const change = wasReposted ? -1 : 1;

        setRepostLoading(true);
        setReposted(!wasReposted);
        setRepostCount((current) => Math.max(current + change, 0));

        const supabase = getSupabase();

        const { error } = wasReposted
            ? await supabase
                .from("reposts")
                .delete()
                .eq("user_id", viewerUserId)
                .eq("artwork_id", id)
            : await supabase.from("reposts").insert({
                user_id: viewerUserId,
                artwork_id: id,
            });

        if (error) {
            setReposted(wasReposted);
            setRepostCount((current) => Math.max(current - change, 0));
            alert(error.message);
            setRepostLoading(false);
            return;
        }

        if (!wasReposted && ownerId !== viewerUserId) {
            void createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                artworkId: id,
                type: "repost",
                message: `reposted your artwork "${title}"`,
            });
        }

        window.dispatchEvent(new Event("arthub:repost-changed"));
        setRepostLoading(false);
    }, [
        getSupabase,
        id,
        ownerId,
        repostLoading,
        reposted,
        title,
        viewerUserId,
    ]);

    const handleFollow = useCallback(async () => {
        if (!viewerUserId) {
            alert("Please login first.");
            return;
        }

        if (isOwner || followLoading) return;

        setFollowLoading(true);

        const supabase = getSupabase();

        const { data: usersBlocked, error: blockedError } = await supabase.rpc(
            "are_users_blocked",
            {
                p_first_user_id: viewerUserId,
                p_second_user_id: ownerId,
            }
        );

        if (blockedError) {
            alert(blockedError.message);
            setFollowLoading(false);
            return;
        }

        if (usersBlocked) {
            alert(
                "You cannot follow this artist because one of you has blocked the other."
            );
            setFollowLoading(false);
            return;
        }

        const wasFollowing = following;

        setFollowing(!wasFollowing);

        const { error } = wasFollowing
            ? await supabase
                .from("follows")
                .delete()
                .eq("follower_id", viewerUserId)
                .eq("following_id", ownerId)
            : await supabase.from("follows").insert({
                follower_id: viewerUserId,
                following_id: ownerId,
            });

        if (error) {
            setFollowing(wasFollowing);
            alert(error.message);
            setFollowLoading(false);
            return;
        }

        if (!wasFollowing) {
            void createNotification({
                userId: ownerId,
                actorId: viewerUserId,
                type: "follow",
                message: "started following you",
            });
        }

        setFollowLoading(false);
    }, [
        followLoading,
        following,
        getSupabase,
        isOwner,
        ownerId,
        viewerUserId,
    ]);

    const handleBlockArtist = useCallback(async () => {
        if (!viewerUserId || isOwner || blockLoading) return;

        const confirmed = window.confirm(
            `Block @${username}?\n\nYou will no longer see their posts, both follow relationships will be removed, and neither of you will be able to message or interact with the other.`
        );

        if (!confirmed) return;

        setBlockLoading(true);

        const { error } = await getSupabase().rpc("block_user", {
            p_blocked_id: ownerId,
        });

        if (error) {
            alert(error.message);
            setBlockLoading(false);
            return;
        }

        setIsSafetyMenuOpen(false);
        setHiddenByBlock(true);
        setBlockLoading(false);

        alert(`@${username} has been blocked.`);
    }, [
        blockLoading,
        getSupabase,
        isOwner,
        ownerId,
        username,
        viewerUserId,
    ]);

    const handleDelete = useCallback(async () => {
        if (!onDelete || deleteLoading) return;

        setDeleteLoading(true);

        try {
            await onDelete(id);
        } finally {
            setDeleteLoading(false);
        }
    }, [deleteLoading, id, onDelete]);

    if (hiddenByBlock) {
        return null;
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
                            onClick={() => void handleDelete()}
                            disabled={deleteLoading}
                            title="Delete artwork"
                            aria-label="Delete artwork"
                            className="absolute right-3 top-3 z-10 rounded-full border border-red-900/60 bg-black/60 p-2 text-red-400 opacity-100 backdrop-blur transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50 sm:opacity-0 sm:group-hover:opacity-100"
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
                                    disabled={likeLoading}
                                    className={`flex items-center gap-1.5 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50 ${liked ? "text-red-400" : ""
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
                                    className={`flex items-center gap-1.5 transition hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-50 ${reposted ? "text-green-400" : ""
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
                                disabled={saveLoading}
                                className={`shrink-0 transition hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 ${saved ? "text-yellow-400" : "text-zinc-100"
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
                        <ArtistAvatar
                            imageUrl={repostedBy.avatarUrl}
                            label={repostedBy.name}
                            sizeClass="h-6 w-6"
                            isCreator={isRepostedByCreator}
                            small
                        />

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
                            className="flex min-w-0 items-center gap-3"
                        >
                            <ArtistAvatar
                                imageUrl={avatarUrl}
                                label={artist}
                                sizeClass="h-11 w-11"
                                isCreator={isCreator}
                            />

                            <div className="min-w-0">
                                <h2 className="truncate text-lg font-bold">
                                    {artist}
                                </h2>
                                <p className="truncate text-sm text-zinc-400">
                                    @{username}
                                </p>
                            </div>
                        </Link>

                        <div className="flex shrink-0 items-center gap-2">
                            {!isOwner && (
                                <button
                                    type="button"
                                    onClick={() => void handleFollow()}
                                    disabled={followLoading}
                                    className={`rounded-full px-4 py-2 text-sm transition disabled:cursor-not-allowed disabled:opacity-60 ${following
                                            ? "border border-zinc-700 bg-zinc-900 text-white"
                                            : "border border-zinc-700 hover:bg-zinc-800"
                                        }`}
                                >
                                    {followLoading
                                        ? "Working..."
                                        : following
                                            ? "Following"
                                            : "Follow"}
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
                                                onClick={() =>
                                                    void handleBlockArtist()
                                                }
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
                                    onClick={() => void handleDelete()}
                                    disabled={deleteLoading}
                                    className="rounded-full border border-red-900/60 px-3 py-2 text-red-400 transition hover:bg-red-950 disabled:cursor-not-allowed disabled:opacity-50"
                                    title="Delete artwork"
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
                        aria-label={`Open ${title}`}
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
                                    disabled={likeLoading}
                                    className={`flex items-center gap-2 transition hover:text-red-400 disabled:cursor-not-allowed disabled:opacity-50 ${liked ? "text-red-400" : ""
                                        }`}
                                    title="Like"
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
                                    className="flex items-center gap-2 transition hover:text-blue-400"
                                    title="Comments"
                                >
                                    <MessageCircle size={21} />
                                    <span>{commentCount}</span>
                                </button>

                                <button
                                    type="button"
                                    onClick={() => void handleRepost()}
                                    disabled={repostLoading}
                                    className={`flex items-center gap-2 transition hover:text-green-400 disabled:cursor-not-allowed disabled:opacity-50 ${reposted ? "text-green-400" : ""
                                        }`}
                                    title="Repost"
                                >
                                    <Repeat2 size={21} />
                                    <span>{repostCount}</span>
                                </button>
                            </div>

                            <button
                                type="button"
                                onClick={() => void handleSave()}
                                disabled={saveLoading}
                                className={`flex items-center gap-1 transition hover:text-yellow-400 disabled:cursor-not-allowed disabled:opacity-50 ${saved ? "text-yellow-400" : ""
                                    }`}
                                title={saved ? "Unsave artwork" : "Save artwork"}
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

export default memo(ArtworkCard);