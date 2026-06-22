"use client";

import { createNotification } from "@/app/lib/notifications";
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
import { createClient } from "@/app/lib/supabase";

type ArtworkCardProps = {
    id: string;
    image: string;
    title: string;
    artist: string;
    username: string;
    ownerId: string;
    avatarUrl: string | null;
    onDelete?: (id: string) => void;
};

export default function ArtworkCard({
    id,
    image,
    title,
    artist,
    username,
    ownerId,
    avatarUrl,
    onDelete,
}: ArtworkCardProps) {
    const supabase = createClient();

    const [isDetailOpen, setIsDetailOpen] = useState(false);
    const [liked, setLiked] = useState(false);
    const [saved, setSaved] = useState(false);
    const [following, setFollowing] = useState(false);
    const [likes, setLikes] = useState(0);
    const [saves, setSaves] = useState(0);
    const [currentUserId, setCurrentUserId] = useState<string | null>(null);

    const isOwner = currentUserId === ownerId;

    useEffect(() => {
        async function loadCardState() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            setCurrentUserId(user?.id || null);

            const { count: likeCount } = await supabase
                .from("likes")
                .select("*", { count: "exact", head: true })
                .eq("artwork_id", id);

            const { count: saveCount } = await supabase
                .from("saves")
                .select("*", { count: "exact", head: true })
                .eq("artwork_id", id);

            setLikes(likeCount || 0);
            setSaves(saveCount || 0);

            if (user) {
                const { data: existingLike } = await supabase
                    .from("likes")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("artwork_id", id)
                    .maybeSingle();

                const { data: existingSave } = await supabase
                    .from("saves")
                    .select("id")
                    .eq("user_id", user.id)
                    .eq("artwork_id", id)
                    .maybeSingle();

                const { data: existingFollow } = await supabase
                    .from("follows")
                    .select("id")
                    .eq("follower_id", user.id)
                    .eq("following_id", ownerId)
                    .maybeSingle();

                setLiked(Boolean(existingLike));
                setSaved(Boolean(existingSave));
                setFollowing(Boolean(existingFollow));
            }
        }

        loadCardState();
    }, [id, ownerId, supabase]);

    async function handleLike() {
        if (!currentUserId) return alert("Please login first.");

        if (liked) {
            const { error } = await supabase
                .from("likes")
                .delete()
                .eq("user_id", currentUserId)
                .eq("artwork_id", id);

            if (error) return alert(error.message);

            setLiked(false);
            setLikes((prev) => Math.max(prev - 1, 0));
            return;
        }

        const { error } = await supabase.from("likes").insert({
            user_id: currentUserId,
            artwork_id: id,
        });

        if (error) return alert(error.message);

        setLiked(true);
        setLikes((prev) => prev + 1);

        await createNotification({
            userId: ownerId,
            actorId: currentUserId,
            artworkId: id,
            type: "like",
            message: `liked your artwork "${title}"`,
        });
    }

    async function handleSave() {
        if (!currentUserId) return alert("Please login first.");

        if (saved) {
            const { error } = await supabase
                .from("saves")
                .delete()
                .eq("user_id", currentUserId)
                .eq("artwork_id", id);

            if (error) return alert(error.message);

            setSaved(false);
            setSaves((prev) => Math.max(prev - 1, 0));
            return;
        }

        const { error } = await supabase.from("saves").insert({
            user_id: currentUserId,
            artwork_id: id,
        });

        if (error) return alert(error.message);

        setSaved(true);
        setSaves((prev) => prev + 1);

        await createNotification({
            userId: ownerId,
            actorId: currentUserId,
            artworkId: id,
            type: "save",
            message: `saved your artwork "${title}"`,
        });
    }

    async function handleFollow() {
        if (!currentUserId) return alert("Please login first.");
        if (isOwner) return;

        if (following) {
            const { error } = await supabase
                .from("follows")
                .delete()
                .eq("follower_id", currentUserId)
                .eq("following_id", ownerId);

            if (error) return alert(error.message);

            setFollowing(false);
            return;
        }

        const { error } = await supabase.from("follows").insert({
            follower_id: currentUserId,
            following_id: ownerId,
        });

        if (error) return alert(error.message);

        setFollowing(true);

        await createNotification({
            userId: ownerId,
            actorId: currentUserId,
            type: "follow",
            message: "started following you",
        });
    }

    function handleDelete() {
        if (!onDelete) return;
        onDelete(id);
    }

    return (
        <>
            <article className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950">
                <div className="flex items-center justify-between gap-4 p-5">
                    <Link href={`/profile/${username}`} className="flex items-center gap-3">
                        {avatarUrl ? (
                            <img
                                src={avatarUrl}
                                alt={artist}
                                className="h-11 w-11 rounded-full border border-zinc-700 object-cover"
                            />
                        ) : (
                            <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-bold">
                                {artist.charAt(0)}
                            </div>
                        )}

                        <div>
                            <h2 className="text-lg font-bold">{artist}</h2>
                            <p className="text-sm text-zinc-400">@{username}</p>
                        </div>
                    </Link>

                    <div className="flex gap-2">
                        {!isOwner && (
                            <button
                                type="button"
                                onClick={handleFollow}
                                className={`rounded-full px-4 py-2 text-sm ${following
                                        ? "border border-zinc-700 bg-zinc-900 text-white"
                                        : "border border-zinc-700 hover:bg-zinc-800"
                                    }`}
                            >
                                {following ? "Following" : "Follow"}
                            </button>
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
                        <h2 className="text-2xl font-bold hover:underline">{title}</h2>
                    </button>

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
                                <span>0</span>
                            </button>

                            <button
                                type="button"
                                className="flex items-center gap-2 hover:text-green-400"
                            >
                                <Repeat2 size={21} />
                                <span>0</span>
                            </button>
                        </div>

                        <button
                            type="button"
                            onClick={handleSave}
                            className={`flex items-center gap-1 hover:text-yellow-400 ${saved ? "text-yellow-400" : ""
                                }`}
                        >
                            <Bookmark size={21} fill={saved ? "currentColor" : "none"} />
                            {saves > 0 && <span className="text-sm">{saves}</span>}
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