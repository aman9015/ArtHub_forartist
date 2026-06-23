"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
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
  hasNewFeed?: boolean;
  onExploreClick?: () => void;
};

const ROUTES_TO_WARM = [
  "/explore",
  "/trending",
  "/dashboard",
  "/notifications",
  "/messages",
];

export default function MobileNav({
  onUploadClick,
  hasNewFeed = false,
  onExploreClick,
}: MobileNavProps) {
  const pathname = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);

  const [isMoreOpen, setIsMoreOpen] = useState(false);
  const [profileUrl, setProfileUrl] = useState("/create-profile");
  const [initial, setInitial] = useState("A");
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);
  const [notificationCount, setNotificationCount] = useState(0);
  const [unreadMessageCount, setUnreadMessageCount] = useState(0);

  const prefetchRoute = useCallback(
    (href: string) => {
      router.prefetch(href);
    },
    [router]
  );

  useEffect(() => {
    let cancelled = false;

    async function loadMobileNavData() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || cancelled) return;

      const [profileResult, notificationsResult, conversationsResult] =
        await Promise.all([
          supabase
            .from("profiles")
            .select("name, username, avatar_url")
            .eq("id", user.id)
            .single(),

          supabase
            .from("notifications")
            .select("id", { count: "exact", head: true })
            .eq("user_id", user.id)
            .eq("is_read", false),

          supabase
            .from("conversations")
            .select("id")
            .or(`user_one.eq.${user.id},user_two.eq.${user.id}`),
        ]);

      if (cancelled) return;

      const profile = profileResult.data;

      if (profile?.username?.trim()) {
        setProfileUrl(`/profile/${profile.username}`);
        setInitial(profile.name?.charAt(0).toUpperCase() || "A");
        setAvatarUrl(profile.avatar_url || null);
      } else {
        setProfileUrl("/create-profile");
        setInitial(profile?.name?.charAt(0).toUpperCase() || "A");
        setAvatarUrl(profile?.avatar_url || null);
      }

      setNotificationCount(notificationsResult.count || 0);

      const conversationIds =
        conversationsResult.data?.map((conversation) => conversation.id) || [];

      if (conversationIds.length === 0) {
        setUnreadMessageCount(0);
        return;
      }

      const { count: unreadMessages } = await supabase
        .from("messages")
        .select("id", { count: "exact", head: true })
        .in("conversation_id", conversationIds)
        .neq("sender_id", user.id)
        .eq("is_read", false);

      if (!cancelled) {
        setUnreadMessageCount(unreadMessages || 0);
      }
    }

    void loadMobileNavData();

    return () => {
      cancelled = true;
    };
  }, [supabase]);

  useEffect(() => {
    setIsMoreOpen(false);
  }, [pathname]);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      ROUTES_TO_WARM.forEach(prefetchRoute);

      if (profileUrl !== "/create-profile") {
        prefetchRoute(profileUrl);
      }
    }, 800);

    return () => {
      window.clearTimeout(timer);
    };
  }, [prefetchRoute, profileUrl]);

  async function handleLogout() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      alert(error.message);
      return;
    }

    router.replace("/login");
  }

  function itemClass(active: boolean) {
    return `relative flex min-w-0 flex-col items-center justify-center gap-1 rounded-2xl py-1 text-[10px] font-medium transition ${active
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
              prefetch
              onMouseEnter={() => prefetchRoute("/dashboard")}
              onFocus={() => prefetchRoute("/dashboard")}
              onTouchStart={() => prefetchRoute("/dashboard")}
              onClick={() => setIsMoreOpen(false)}
              className={`flex items-center gap-3 rounded-2xl px-4 py-3 transition ${pathname.startsWith("/dashboard")
                ? "bg-zinc-800 text-white"
                : "text-zinc-300 hover:bg-zinc-900 hover:text-white"
                }`}
            >
              <BarChart3 size={21} />
              <span className="font-semibold">Dashboard</span>
            </Link>

            <Link
              href={profileUrl}
              prefetch
              onMouseEnter={() => prefetchRoute(profileUrl)}
              onFocus={() => prefetchRoute(profileUrl)}
              onTouchStart={() => prefetchRoute(profileUrl)}
              onClick={() => setIsMoreOpen(false)}
              className={`mt-1 flex items-center gap-3 rounded-2xl px-4 py-3 transition ${pathname.startsWith("/profile")
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
          prefetch
          onMouseEnter={() => prefetchRoute("/explore")}
          onFocus={() => prefetchRoute("/explore")}
          onTouchStart={() => prefetchRoute("/explore")}
          aria-label="Explore"
          onClick={(event) => {
            if (!onExploreClick) return;

            event.preventDefault();
            onExploreClick();
          }}
          className={itemClass(exploreActive)}
        >
          <Compass size={20} />

          {hasNewFeed && (
            <span className="absolute right-1 top-0.5 h-2.5 w-2.5 rounded-full bg-red-500 ring-2 ring-zinc-950" />
          )}

          <span>Explore</span>
        </Link>

        <Link
          href="/trending"
          prefetch
          onMouseEnter={() => prefetchRoute("/trending")}
          onFocus={() => prefetchRoute("/trending")}
          onTouchStart={() => prefetchRoute("/trending")}
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
          prefetch
          onMouseEnter={() => prefetchRoute("/notifications")}
          onFocus={() => prefetchRoute("/notifications")}
          onTouchStart={() => prefetchRoute("/notifications")}
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
          prefetch
          onMouseEnter={() => prefetchRoute("/messages")}
          onFocus={() => prefetchRoute("/messages")}
          onTouchStart={() => prefetchRoute("/messages")}
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