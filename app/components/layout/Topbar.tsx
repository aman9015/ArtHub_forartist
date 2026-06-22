"use client";

import NotificationDropdown from "./NotificationDropdown";
import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";

import { createClient } from "@/app/lib/supabase";

type TopbarProps = {
  onUploadClick: () => void;
  searchQuery: string;
  onSearchChange: (value: string) => void;
};

export default function Topbar({
  onUploadClick,
  searchQuery,
  onSearchChange,
}: TopbarProps) {
  const supabase = createClient();

  const [profileUrl, setProfileUrl] = useState("/create-profile");
  const [initial, setInitial] = useState("A");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  useEffect(() => {
    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, username, avatar_url")
        .eq("id", user.id)
        .single();

      if (!profile) return;

      setProfileUrl(`/profile/${profile.username}`);
      setInitial(profile.name?.charAt(0).toUpperCase() || "A");
      setAvatarUrl(profile.avatar_url || null);
    }

    loadProfile();
  }, [supabase]);

  return (
    <header className="relative mb-6 flex items-center justify-between gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex flex-1 items-center gap-3 rounded-2xl bg-zinc-900 px-4 py-3">
        <Search size={20} className="text-zinc-400" />

        <input
          type="text"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          placeholder="Search artwork, artists, tags..."
          className="w-full bg-transparent text-sm outline-none placeholder:text-zinc-500"
        />
      </div>

      <button
        type="button"
        onClick={onUploadClick}
        className="hidden items-center gap-2 rounded-2xl bg-white px-4 py-3 font-semibold text-black md:flex"
      >
        <Plus size={18} />
        Upload
      </button>

      <NotificationDropdown />

      <Link
        href={profileUrl}
        className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-bold text-white"
      >
        {avatarUrl ? (
          <img
            src={avatarUrl}
            alt="Profile"
            className="h-full w-full object-cover"
          />
        ) : (
          initial
        )}
      </Link>
    </header>
  );
}