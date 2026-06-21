"use client";

import Link from "next/link";
import {
  BarChart3,
  Bell,
  Compass,
  Flame,
  Home,
  Send,
} from "lucide-react";

type SidebarProps = {
  onUploadClick: () => void;
};

export default function Sidebar({ onUploadClick }: SidebarProps) {
  const notificationCount = 4;

  return (
    <aside className="sticky top-6 flex h-[90vh] flex-col items-center justify-between">
      <Link
        href="/explore"
        className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold"
      >
        A
      </Link>

      <nav className="flex w-[190px] flex-col gap-4 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <Link
          href="/"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900"
        >
          <Home size={22} />
          Home
        </Link>

        <Link
          href="/explore"
          className="flex items-center gap-3 rounded-2xl bg-zinc-800 px-4 py-3"
        >
          <Compass size={22} />
          Explore
        </Link>

        <button className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900">
          <Flame size={22} />
          Trending
        </button>

        <Link
          href="/dashboard"
          className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900"
        >
          <BarChart3 size={22} />
          Dashboard
        </Link>

        <Link
          href="/notifications"
          className="relative flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900"
        >
          <Bell size={22} />
          Notifications

          {notificationCount > 0 && (
            <span className="absolute right-3 top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1.5 text-xs font-bold text-white">
              {notificationCount}
            </span>
          )}
        </Link>
      </nav>

      <button
        type="button"
        onClick={onUploadClick}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
      >
        <Send size={26} />
      </button>

      <p className="-mt-5 text-sm font-semibold text-zinc-300">Upload</p>
    </aside>
  );
}