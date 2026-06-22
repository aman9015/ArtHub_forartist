"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  BarChart3,
  Bell,
  Compass,
  Flame,
  MessageCircle,
  Send,
} from "lucide-react";

import AuthStatus from "@/app/auth/AuthStatus";
import { createClient } from "@/app/lib/supabase";

type SidebarProps = {
  onUploadClick: () => void;
};

export default function Sidebar({ onUploadClick }: SidebarProps) {
  const supabase = createClient();

  const [profileUrl, setProfileUrl] = useState("/create-profile");
  const [initial, setInitial] = useState("A");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    async function loadSidebarData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("name, username, avatar_url")
        .eq("id", user.id)
        .single();

      if (profile) {
        setProfileUrl(`/profile/${profile.username}`);
        setInitial(profile.name?.charAt(0).toUpperCase() || "A");
        setAvatarUrl(profile.avatar_url || null);
      }

      const { count: notifications } = await supabase
        .from("notifications")
        .select("*", { count: "exact", head: true })
        .eq("user_id", user.id)
        .eq("is_read", false);

      setNotificationCount(notifications || 0);

      const { data: conversations } = await supabase
        .from("conversations")
        .select("id")
        .or(`user_one.eq.${user.id},user_two.eq.${user.id}`);

      const conversationIds = conversations?.map((item) => item.id) || [];

      if (conversationIds.length === 0) {
        setUnreadMessageCount(0);
        return;
      }

      const { count: unreadMessages } = await supabase
        .from("messages")
        .select("*", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      setUnreadMessageCount(unreadMessages || 0);
    }

    loadSidebarData();
  }, [supabase]);

  return (
    <aside className="sticky top-4 h-[calc(100vh-2rem)] overflow-y-auto pr-1">
      <div className="flex min-h-full flex-col items-center gap-5">
        <Link
          href={profileUrl}
          title="My profile"
          aria-label="My profile"
          className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold text-white transition hover:scale-105"
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

        <nav className="flex w-[76px] flex-col items-center gap-3 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-3">
          <Link
            href="/explore"
            title="Explore"
            aria-label="Explore"
            className="flex h-12 w-12 items-center justify-center rounded-2xl bg-zinc-800 text-white transition hover:bg-zinc-700"
          >
            <Compass size={22} />
          </Link>

          <Link
            href="/trending"
            title="Trending"
            aria-label="Trending"
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <Flame size={22} />
          </Link>

          <Link
            href="/dashboard"
            title="Dashboard"
            aria-label="Dashboard"
            className="flex h-12 w-12 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <BarChart3 size={22} />
          </Link>

          <Link
            href="/notifications"
            title="Notifications"
            aria-label="Notifications"
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <Bell size={22} />

            {notificationCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950">
                {notificationCount > 9 ? "9+" : notificationCount}
              </span>
            )}
          </Link>

          <Link
            href="/messages"
            title="Messages"
            aria-label="Messages"
            className="relative flex h-12 w-12 items-center justify-center rounded-2xl text-zinc-300 transition hover:bg-zinc-900 hover:text-white"
          >
            <MessageCircle size={22} />

            {unreadMessageCount > 0 && (
              <span className="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-red-500 px-1 text-[10px] font-bold text-white ring-2 ring-zinc-950">
                {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
              </span>
            )}
          </Link>
        </nav>

        <div className="w-[76px] space-y-4 pb-6">
          <button
            type="button"
            onClick={onUploadClick}
            title="Upload artwork"
            aria-label="Upload artwork"
            className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:scale-105 hover:bg-zinc-200"
          >
            <Send size={26} />
          </button>

          <div className="flex justify-center">
            <AuthStatus />
          </div>
        </div>
      </div>
    </aside>
  );
}