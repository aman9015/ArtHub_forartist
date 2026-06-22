"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { addNotification } from "@/app/lib/storage";
import { createClient } from "@/app/lib/supabase";

type Props = {
  username: string;
  artworks: number;
  saved: number;
  liked: number;
};

type Profile = {
  id: string;
  username: string;
};

export default function ProfileStats({
  username,
  artworks,
  saved,
  liked,
}: Props) {
  const supabase = createClient();
  const router = useRouter();

  const [followers, setFollowers] = useState(0);
  const [following, setFollowing] = useState(0);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isFollowedByViewedUser, setIsFollowedByViewedUser] = useState(false);
  const [isOwnProfile, setIsOwnProfile] = useState(false);
  const [myProfileId, setMyProfileId] = useState<string | null>(null);
  const [viewedProfileId, setViewedProfileId] = useState<string | null>(null);

  const isMutualFollow = isFollowing && isFollowedByViewedUser;

  async function loadFollowState() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) return;

    const { data: myProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("id", user.id)
      .single();

    const { data: viewedProfile } = await supabase
      .from("profiles")
      .select("id, username")
      .eq("username", username)
      .single();

    if (!myProfile || !viewedProfile) return;

    const my = myProfile as Profile;
    const viewed = viewedProfile as Profile;

    setMyProfileId(my.id);
    setViewedProfileId(viewed.id);
    setIsOwnProfile(my.id === viewed.id);

    const { count: followersCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("following_id", viewed.id);

    const { count: followingCount } = await supabase
      .from("follows")
      .select("*", { count: "exact", head: true })
      .eq("follower_id", viewed.id);

    const { data: myFollowRow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", my.id)
      .eq("following_id", viewed.id)
      .maybeSingle();

    const { data: theirFollowRow } = await supabase
      .from("follows")
      .select("id")
      .eq("follower_id", viewed.id)
      .eq("following_id", my.id)
      .maybeSingle();

    setFollowers(followersCount || 0);
    setFollowing(followingCount || 0);
    setIsFollowing(Boolean(myFollowRow));
    setIsFollowedByViewedUser(Boolean(theirFollowRow));
  }

  useEffect(() => {
    loadFollowState();
  }, [username]);

  async function handleFollow() {
    if (!myProfileId || !viewedProfileId || isOwnProfile) return;

    if (isFollowing) {
      const { error } = await supabase
        .from("follows")
        .delete()
        .eq("follower_id", myProfileId)
        .eq("following_id", viewedProfileId);

      if (error) {
        alert(error.message);
        return;
      }

      setIsFollowing(false);
      setFollowers((prev) => Math.max(prev - 1, 0));
      return;
    }

    const { error } = await supabase.from("follows").insert({
      follower_id: myProfileId,
      following_id: viewedProfileId,
    });

    if (error) {
      alert(error.message);
      return;
    }

    setIsFollowing(true);
    setFollowers((prev) => prev + 1);

    addNotification({
      type: "follow",
      user: "You",
      message: "started following",
      artwork: username,
    });

    await loadFollowState();
  }

  async function handleMessage() {
    if (!myProfileId || !viewedProfileId || isOwnProfile || !isMutualFollow) {
      return;
    }

    const { data: existingConversation } = await supabase
      .from("conversations")
      .select("id")
      .or(
        `and(user_one.eq.${myProfileId},user_two.eq.${viewedProfileId}),and(user_one.eq.${viewedProfileId},user_two.eq.${myProfileId})`
      )
      .maybeSingle();

    if (existingConversation) {
      router.push(`/messages/${existingConversation.id}`);
      return;
    }

    const { data: newConversation, error } = await supabase
      .from("conversations")
      .insert({
        user_one: myProfileId,
        user_two: viewedProfileId,
      })
      .select("id")
      .single();

    if (error) {
      alert(error.message);
      return;
    }

    router.push(`/messages/${newConversation.id}`);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-b border-zinc-800 pb-6">
      <div className="flex flex-wrap gap-8">
        <div>
          <p className="text-2xl font-bold">{artworks}</p>
          <p className="text-zinc-400">Posts</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{saved}</p>
          <p className="text-zinc-400">Saved</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{liked}</p>
          <p className="text-zinc-400">Liked</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{followers}</p>
          <p className="text-zinc-400">Followers</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{following}</p>
          <p className="text-zinc-400">Following</p>
        </div>
      </div>

      {!isOwnProfile && (
        <div className="flex flex-wrap gap-3">
          {isMutualFollow && (
            <button
              type="button"
              onClick={handleMessage}
              className="rounded-full border border-zinc-700 px-6 py-3 font-semibold text-white hover:bg-zinc-900"
            >
              Message
            </button>
          )}

          <button
            type="button"
            onClick={handleFollow}
            className={`rounded-full px-6 py-3 font-semibold transition ${isFollowing
                ? "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
                : "bg-white text-black hover:bg-zinc-200"
              }`}
          >
            {isFollowing ? "Following" : "Follow"}
          </button>
        </div>
      )}
    </div>
  );
}