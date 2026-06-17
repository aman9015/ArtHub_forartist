"use client";

import { useState } from "react";

type Props = {
  artworks: number;
  saved: number;
  liked: number;
};

export default function ProfileStats({ artworks, saved, liked }: Props) {
  const [followers, setFollowers] = useState(2400);
  const [isFollowing, setIsFollowing] = useState(false);

  function handleFollow() {
    setFollowers((prev) => (isFollowing ? prev - 1 : prev + 1));
    setIsFollowing(!isFollowing);
  }

  return (
    <div className="mt-8 flex flex-wrap items-center justify-between gap-6 border-b border-zinc-800 pb-6">
      <div className="flex gap-8">
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
      </div>

      <button
        onClick={handleFollow}
        className={`rounded-full px-6 py-3 font-semibold transition ${
          isFollowing
            ? "border border-zinc-700 bg-zinc-900 text-white hover:bg-zinc-800"
            : "bg-white text-black hover:bg-zinc-200"
        }`}
      >
        {isFollowing ? "Following" : "Follow"}
      </button>
    </div>
  );
}