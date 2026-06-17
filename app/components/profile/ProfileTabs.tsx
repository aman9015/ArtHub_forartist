"use client";

import { Grid3X3, Bookmark, Heart } from "lucide-react";

type Tab = "posts" | "saved" | "liked";

type Props = {
  activeTab: Tab;
  onTabChange: (tab: Tab) => void;
};

export default function ProfileTabs({ activeTab, onTabChange }: Props) {
  return (
    <div className="mt-8 flex border-b border-zinc-800">
      <button
        onClick={() => onTabChange("posts")}
        className={`flex flex-1 items-center justify-center gap-2 py-4 font-semibold ${
          activeTab === "posts"
            ? "border-b-2 border-white text-white"
            : "text-zinc-500 hover:text-white"
        }`}
      >
        <Grid3X3 size={18} />
        Posts
      </button>

      <button
        onClick={() => onTabChange("saved")}
        className={`flex flex-1 items-center justify-center gap-2 py-4 font-semibold ${
          activeTab === "saved"
            ? "border-b-2 border-white text-white"
            : "text-zinc-500 hover:text-white"
        }`}
      >
        <Bookmark size={18} />
        Saved
      </button>

      <button
        onClick={() => onTabChange("liked")}
        className={`flex flex-1 items-center justify-center gap-2 py-4 font-semibold ${
          activeTab === "liked"
            ? "border-b-2 border-white text-white"
            : "text-zinc-500 hover:text-white"
        }`}
      >
        <Heart size={18} />
        Liked
      </button>
    </div>
  );
}