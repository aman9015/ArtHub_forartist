"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

export default function SignupPage() {
    const supabase = createClient();
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [loading, setLoading] = useState(false);

    async function handleSignup() {
        setLoading(true);

        const { error } = await supabase.auth.signUp({
            email,
            password,
        });

        if (error) {
            setLoading(false);
            alert(error.message);
            return;
        }

        setLoading(false);

        router.push("/create-profile");
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-black text-white">
            <div className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-8">
                <h1 className="mb-6 text-3xl font-bold">Create Account</h1>

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
                    onClick={handleSignup}
                    disabled={loading}
                    className="w-full rounded-xl bg-white py-4 font-bold text-black"
                >
                    {loading ? "Creating Account..." : "Create Account"}
                </button>
            </div>
        </main>
    );
}