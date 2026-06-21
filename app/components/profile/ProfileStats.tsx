"use client";

import { useEffect, useState } from "react";
import { addNotification } from "@/app/lib/storage";

type Props = {
  username: string;
  artworks: number;
  saved: number;
  liked: number;
};

export default function ProfileStats({
  username,
  artworks,
  saved,
  liked,
}: Props) {
  const [followers, setFollowers] = useState(2400);
  const [following, setFollowing] = useState(89);
  const [isFollowing, setIsFollowing] = useState(false);

  useEffect(() => {
    const followedUsers: string[] = JSON.parse(
      localStorage.getItem("arthub_following") || "[]"
    );

    const alreadyFollowing = followedUsers.includes(username);

    setIsFollowing(alreadyFollowing);

    const storedFollowers = localStorage.getItem(
      `arthub_followers_${username}`
    );

    const storedFollowing = localStorage.getItem(
      "arthub_total_following"
    );

    if (storedFollowers) {
      setFollowers(Number(storedFollowers));
    } else {
      setFollowers(alreadyFollowing ? 2401 : 2400);
    }

    if (storedFollowing) {
      setFollowing(Number(storedFollowing));
    }
  }, [username]);

  function handleFollow() {
    const followedUsers: string[] = JSON.parse(
      localStorage.getItem("arthub_following") || "[]"
    );

    let updatedUsers: string[];

    if (followedUsers.includes(username)) {
      updatedUsers = followedUsers.filter(
        (user) => user !== username
      );

      const newFollowers = Math.max(followers - 1, 0);
      const newFollowing = Math.max(following - 1, 0);

      setFollowers(newFollowers);
      setFollowing(newFollowing);
      setIsFollowing(false);

      localStorage.setItem(
        `arthub_followers_${username}`,
        String(newFollowers)
      );

      localStorage.setItem(
        "arthub_total_following",
        String(newFollowing)
      );
    } else {
      updatedUsers = [...followedUsers, username];

      const newFollowers = followers + 1;
      const newFollowing = following + 1;

      setFollowers(newFollowers);
      setFollowing(newFollowing);
      setIsFollowing(true);

      localStorage.setItem(
        `arthub_followers_${username}`,
        String(newFollowers)
      );

      localStorage.setItem(
        "arthub_total_following",
        String(newFollowing)
      );

      addNotification({
        type: "follow",
        user: "You",
        message: "started following",
        artwork: username,
      });
    }

    localStorage.setItem(
      "arthub_following",
      JSON.stringify(updatedUsers)
    );
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
          <p className="text-2xl font-bold">
            {(followers / 1000).toFixed(1)}k
          </p>
          <p className="text-zinc-400">Followers</p>
        </div>

        <div>
          <p className="text-2xl font-bold">{following}</p>
          <p className="text-zinc-400">Following</p>
        </div>
      </div>

      <button
        onClick={handleFollow}
        className={`rounded-full px-6 py-3 font-semibold transition ${isFollowing
            ? "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-white text-black hover:bg-zinc-200"
          }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}