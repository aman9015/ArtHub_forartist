"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import {
  BarChart3,
  Bell,
  Compass,
  Flame,
  LogOut,
  Menu,
  MessageCircle,
  Send,
} from "lucide-react";

import { createClient } from "@/app/lib/supabase";

type MobileNavProps = {
  onUploadClick: () => void;
};

export default function MobileNav({ onUploadClick }: MobileNavProps) {
  const pathname = usePathname();

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState("/create-profile");
  const [initial, setInitial] = useState("A");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  useEffect(() => {
    async function loadMobileNavData() {
      const supabase = createClient();

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

    void loadMobileNavData();
  }, []);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  async function handleLogout() {
    const supabase = createClient();

    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    window.location.href = "/login";
  }

  function itemClass(active: boolean) {
    return `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[10px] font-medium transition ${
      active
        ? "bg-zinc-800 text-white"
        : "text-zinc-400 hover:bg-zinc-900 hover:text-white"
    }`;
  }

  const exploreActive = pathname === "/explore";
  const trendingActive = pathname === "/trending";
  const notificationsActive = pathname.startsWith("/notifications");
  const messagesActive = pathname.startsWith("/messages");

  const moreActive =
    pathname.startsWith("/dashboard") || pathname.startsWith("/profile");

  return (
    <>
      {isMoreOpen && (
        <>
          <button
            type="button"
            aria-label="Close menu"
            onClick={() => setIsMoreOpen(false)}
            className="fixed inset-0 z-[80] cursor-default bg-black/35"
          />

          <section className="fixed bottom-24 left-4 right-4 z-[85] mx-auto max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-3 shadow-2xl">
            <Link
              href="/dashboard"
              onClick={() => setIsMoreOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                pathname.startsWith("/dashboard")
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <BarChart3 size={21} />
              <span className="font-semibold">Dashboard</span>
            </Link>

            <Link
              href={profileUrl}
              onClick={() => setIsMoreOpen(false)}
              className={`mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition ${
                pathname.startsWith("/profile")
                  ? "bg-zinc-800 text-white"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
              }`}
            >
              <span className="flex h-8 w-8 items-center justify-center overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-sm font-bold text-white">
                {avatarUrl ? (
                  <img
                    src={avatarUrl}
                    alt="Profile"
                    className="h-full w-full object-cover"
                  />
                ) : (
                  initial
                )}
              </span>

              <span className="font-semibold">My Profile</span>
            </Link>

            <button
              type="button"
              onClick={() => void handleLogout()}
              className="mt-1 flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-red-300 transition hover:bg-red-500/10"
            >
              <LogOut size={21} />
              <span className="font-semibold">Logout</span>
            </button>
          </section>
        </>
      )}

      <nav className="fixed bottom-3 left-1/2 z-[90] grid w-[calc(100%-1.5rem)] max-w-md -translate-x-1/2 grid-cols-6 gap-1 rounded-3xl border border-zinc-800 bg-zinc-950/95 px-2 py-2 shadow-2xl backdrop-blur">
        <Link
          href="/explore"
          aria-label="Explore"
          className={itemClass(exploreActive)}
        >
          <Compass size={20} />
          <span>Explore</span>
        </Link>

        <Link
          href="/trending"
          aria-label="Trending"
          className={itemClass(trendingActive)}
        >
          <Flame size={20} />
          <span>Trending</span>
        </Link>

        <button
          type="button"
          onClick={() => {
            setIsMoreOpen(false);
            onUploadClick();
          }}
          aria-label="Upload artwork"
          className="flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl bg-white py-1 text-[10px] font-bold text-black transition hover:bg-zinc-200"
        >
          <Send size={20} />
          <span>Upload</span>
        </button>

        <Link
          href="/notifications"
          aria-label="Notifications"
          className={itemClass(notificationsActive)}
        >
          <Bell size={20} />

          {notificationCount > 0 && (
            <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-zinc-950">
              {notificationCount > 9 ? "9+" : notificationCount}
            </span>
          )}

          <span>Alerts</span>
        </Link>

        <Link
          href="/messages"
          aria-label="Messages"
          className={itemClass(messagesActive)}
        >
          <MessageCircle size={20} />

          {unreadMessageCount > 0 && (
            <span className="absolute right-1 top-0 flex h-4 min-w-4 items-center justify-center rounded-full bg-red-500 px-1 text-[9px] font-bold text-white ring-2 ring-zinc-950">
              {unreadMessageCount > 9 ? "9+" : unreadMessageCount}
            </span>
          )}

          <span>Messages</span>
        </Link>

        <button
          type="button"
          onClick={() => setIsMoreOpen((current) => !current)}
          aria-label="More navigation options"
          className={itemClass(isMoreOpen || moreActive)}
        >
          <Menu size={20} />
          <span>More</span>
        </button>
      </nav>
    </>
  );
}