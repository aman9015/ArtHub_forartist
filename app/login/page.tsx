"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

export default function LoginPage() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleLogin() {
        setLoading(true);

        const { error } = await supabase.auth.signInWithPassword({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            alert(error.message);
            return;
        }

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setLoading(false);
            return;
        }

        const { data: profile } = await supabase
            .from("profiles")
            .select("*")
            .eq("id", user.id)
            .single();

        setLoading(false);

        if (profile) {
            router.push("/explore");
        } else {
            router.push("/create-profile");
        }
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
                <h1 className="mb-2 text-3xl font-bold">Login</h1>
                <p className="mb-6 text-zinc-400">Welcome back to ArtHub.</p>

                <input
                    type="email"
                    placeholder="Email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="mb-4 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                />

                <input
                    type="password"
                    placeholder="Password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="mb-6 w-full rounded-xl border border-zinc-800 bg-zinc-900 p-4"
                />

                <button
                    onClick={handleLogin}
                    disabled={loading}
                    className="w-full rounded-xl bg-white py-4 font-bold text-black"
                >
                    {loading ? "Logging in..." : "Login"}
                </button>

                <p className="mt-6 text-center text-sm text-zinc-400">
                    New to ArtHub?{" "}
                    <Link href="/signup" className="font-semibold text-white hover:underline">
                        Create account
                    </Link>
                </p>
            </div>
        </main>
    );
}