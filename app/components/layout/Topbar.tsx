"use client";

import { useState } from "react";
import { Bell, Plus, Search, Heart, UserPlus, MessageCircle } from "lucide-react";

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
  const [showNotifications, setShowNotifications] = useState(false);

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

      {/* Notifications */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className="rounded-2xl border border-zinc-800 p-3 hover:bg-zinc-900"
        >
          <Bell size={20} />
        </button>

        {showNotifications && (
          <div className="absolute right-0 top-16 z-50 w-[340px] rounded-3xl border border-zinc-800 bg-zinc-950 p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
              <h3 className="text-lg font-bold">Notifications</h3>

              <span className="rounded-full bg-red-500 px-2 py-1 text-xs">
                3
              </span>
            </div>

            <div className="space-y-3">
              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900 p-3">
                <Heart
                  size={18}
                  className="mt-1 shrink-0 text-red-400"
                />

                <div>
                  <p className="font-medium">
                    Maya liked your artwork
                  </p>
                  <p className="text-xs text-zinc-500">
                    2 minutes ago
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900 p-3">
                <UserPlus
                  size={18}
                  className="mt-1 shrink-0 text-green-400"
                />

                <div>
                  <p className="font-medium">
                    Creative Soul followed you
                  </p>
                  <p className="text-xs text-zinc-500">
                    15 minutes ago
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-3 rounded-2xl bg-zinc-900 p-3">
                <MessageCircle
                  size={18}
                  className="mt-1 shrink-0 text-blue-400"
                />

                <div>
                  <p className="font-medium">
                    Pixel Master commented:
                  </p>

                  <p className="mt-1 text-sm text-zinc-400">
                    "Amazing composition!"
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    1 hour ago
                  </p>
                </div>
              </div>
            </div>

            <button
              type="button"
              className="mt-4 w-full rounded-2xl border border-zinc-800 py-3 hover:bg-zinc-900"
            >
              View All Notifications
            </button>
          </div>
        )}
      </div>

      <div className="flex h-11 w-11 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 font-bold">
        A
      </div>
    </header>
  );
}