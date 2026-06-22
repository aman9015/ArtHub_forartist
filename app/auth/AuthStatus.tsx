"use client";

import { useEffect, useState } from "react";
import { LogOut, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

export default function AuthStatus() {
  const supabase = createClient();
  const router = useRouter();

  const [email, setEmail] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function getUser() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      setEmail(user?.email || null);
      setLoading(false);
    }

    getUser();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    setEmail(null);
    router.push("/login");
  }

  if (loading) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4 text-sm text-zinc-500">
        Checking auth...
      </div>
    );
  }

  if (!email) {
    return (
      <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
        <p className="text-sm text-zinc-400">Not logged in</p>
        <button
          onClick={() => router.push("/login")}
          className="mt-3 w-full rounded-full bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-zinc-200"
        >
          Login
        </button>
      </div>
    );
  }

  return (
    <div className="rounded-2xl border border-zinc-800 bg-zinc-950 p-4">
      <div className="flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-zinc-800">
          <User size={18} />
        </div>

        <div className="min-w-0">
          <p className="text-sm font-semibold">Logged in</p>
          <p className="truncate text-xs text-zinc-400">{email}</p>
        </div>
      </div>

      <button
        onClick={handleLogout}
        className="mt-4 flex w-full items-center justify-center gap-2 rounded-full border border-zinc-700 px-4 py-2 text-sm font-semibold hover:bg-zinc-900"
      >
        <LogOut size={16} />
        Logout
      </button>
    </div>
  );
}