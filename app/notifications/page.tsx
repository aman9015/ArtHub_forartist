"use client";

import { useEffect, useState } from "react";
import {
  Bell,
  Bookmark,
  Heart,
  MessageCircle,
  Trash2,
  Upload,
  UserPlus,
} from "lucide-react";
import Link from "next/link";

type Notification = {
  id: number;
  type: "like" | "follow" | "bookmark" | "comment" | "upload" | "delete";
  user: string;
  message: string;
  artwork: string;
  time: string;
};

function getIcon(type: Notification["type"]) {
  if (type === "like") return <Heart className="text-red-400" size={22} />;
  if (type === "follow") return <UserPlus className="text-blue-400" size={22} />;
  if (type === "bookmark") return <Bookmark className="text-yellow-400" size={22} />;
  if (type === "comment") return <MessageCircle className="text-green-400" size={22} />;
  if (type === "delete") return <Trash2 className="text-red-500" size={22} />;

  return <Upload className="text-purple-400" size={22} />;
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);

  useEffect(() => {
    const saved = localStorage.getItem("arthub_notifications");
    const data: Notification[] = saved ? JSON.parse(saved) : [];

    setNotifications(data);
  }, []);

  function clearNotifications() {
    localStorage.removeItem("arthub_notifications");
    setNotifications([]);
  }

  return (
    <main className="min-h-screen bg-black px-4 py-8 text-white">
      <section className="mx-auto max-w-3xl">
        <div className="mb-8 flex items-center justify-between gap-4">
          <div>
            <h1 className="flex items-center gap-3 text-3xl font-bold">
              <Bell size={30} />
              Notifications
            </h1>
            <p className="mt-2 text-zinc-400">
              Latest activity from your ArtHub profile.
            </p>
          </div>

          <div className="flex gap-3">
            {notifications.length > 0 && (
              <button
                type="button"
                onClick={clearNotifications}
                className="rounded-full border border-red-900/60 px-5 py-3 text-sm font-semibold text-red-400 hover:bg-red-950"
              >
                Clear
              </button>
            )}

            <Link
              href="/explore"
              className="rounded-full border border-zinc-800 px-5 py-3 text-sm font-semibold hover:bg-zinc-900"
            >
              Back
            </Link>
          </div>
        </div>

        {notifications.length > 0 ? (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-center gap-4 rounded-3xl border border-zinc-800 bg-zinc-950 p-5 transition hover:border-zinc-700 hover:bg-zinc-900"
              >
                <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-zinc-900">
                  {getIcon(notification.type)}
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm text-zinc-300">
                    <span className="font-bold text-white">
                      {notification.user}
                    </span>{" "}
                    {notification.message}

                    {notification.artwork && (
                      <>
                        {" "}
                        <span className="font-semibold text-white">
                          "{notification.artwork}"
                        </span>
                      </>
                    )}
                  </p>

                  <p className="mt-1 text-xs text-zinc-500">
                    {notification.time}
                  </p>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
            <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-zinc-900">
              <Bell className="text-zinc-500" size={28} />
            </div>

            <h2 className="mt-5 text-2xl font-bold">No notifications yet</h2>
            <p className="mt-2 text-zinc-400">
              Likes, comments, follows, uploads, and saves will appear here.
            </p>
          </div>
        )}
      </section>
    </main>
  );
}