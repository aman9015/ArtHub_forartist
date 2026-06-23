"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
    ArrowRight,
    Eye,
    EyeOff,
    LockKeyhole,
    Mail,
    Palette,
    Sparkles,
} from "lucide-react";
import { createClient } from "@/app/lib/supabase";

export default function SignupPage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);
    const [googleLoading, setGoogleLoading] = useState(false);

    async function handleSignup() {
        if (!email.trim() || !password) {
            alert("Please enter your email and password.");
            return;
        }

        if (password.length < 6) {
            alert("Password must be at least 6 characters long.");
            return;
        }

        setLoading(true);

        const { data, error } = await supabase.auth.signUp({
            email: email.trim(),
            password,
            options: {
                emailRedirectTo: `${window.location.origin}/create-profile`,
            },
        });

        if (error) {
            setLoading(false);
            alert(error.message);
            return;
        }

        setLoading(false);

        // If email confirmation is disabled, Supabase signs them in immediately.
        if (data.session) {
            router.push("/create-profile");
            return;
        }

        alert(
            "Account created. Please check your email to confirm your account, then log in to create your profile."
        );

        router.push("/login");
    }

    async function handleGoogleSignup() {
        setGoogleLoading(true);

        const { error } = await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
                redirectTo: `${window.location.origin}/login?oauth=google`,
            },
        });

        if (error) {
            setGoogleLoading(false);
            alert(error.message);
        }
    }

    const isBusy = loading || googleLoading;

    return (
        <main className="relative min-h-screen overflow-hidden bg-[#09090b] px-4 py-6 text-white sm:px-6">
            <div className="pointer-events-none absolute inset-0 overflow-hidden">
                <div className="absolute -left-40 top-10 h-[440px] w-[440px] rounded-full bg-fuchsia-600/25 blur-[130px]" />
                <div className="absolute -right-40 top-1/3 h-[500px] w-[500px] rounded-full bg-purple-500/20 blur-[150px]" />
                <div className="absolute bottom-[-180px] left-1/3 h-[420px] w-[420px] rounded-full bg-amber-400/10 blur-[140px]" />
            </div>

            <div className="relative mx-auto grid min-h-[calc(100vh-3rem)] max-w-7xl overflow-hidden rounded-[2rem] border border-white/10 bg-zinc-950/65 shadow-2xl shadow-black/40 backdrop-blur-xl lg:grid-cols-[1.05fr_0.95fr]">
                <section className="relative hidden overflow-hidden border-r border-white/10 p-10 lg:flex lg:flex-col">
                    <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(236,72,153,0.22),transparent_30%),radial-gradient(circle_at_80%_28%,rgba(168,85,247,0.24),transparent_26%),radial-gradient(circle_at_52%_82%,rgba(245,158,11,0.14),transparent_28%)]" />

                    <Link
                        href="/"
                        className="relative z-10 flex w-fit items-center gap-3"
                    >
                        <span className="flex h-11 w-11 items-center justify-center rounded-2xl bg-white text-black shadow-lg shadow-white/10">
                            <Palette size={23} strokeWidth={2.4} />
                        </span>

                        <span className="text-2xl font-black tracking-tight">
                            ArtHub
                        </span>
                    </Link>

                    <div className="relative z-10 my-auto max-w-xl">
                        <div className="mb-7 inline-flex items-center gap-2 rounded-full border border-pink-300/25 bg-pink-400/10 px-4 py-2 text-sm font-semibold text-pink-200">
                            <Sparkles size={16} />
                            Your creative world starts here
                        </div>

                        <h1 className="text-5xl font-black leading-[1.02] tracking-tight xl:text-6xl">
                            Make your art
                            <span className="block bg-gradient-to-r from-fuchsia-300 via-purple-300 to-amber-200 bg-clip-text text-transparent">
                                impossible to ignore.
                            </span>
                        </h1>

                        <p className="mt-6 max-w-md text-lg leading-8 text-zinc-300">
                            Build your artist profile, share your work, find your
                            people, and grow with a community that values creativity.
                        </p>

                        <div className="mt-10 space-y-4">
                            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-purple-400/15 font-black text-purple-200">
                                    01
                                </span>

                                <div>
                                    <p className="font-bold text-white">
                                        Create your artist identity
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Build a profile that feels like your gallery.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center gap-4 rounded-3xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-pink-400/15 font-black text-pink-200">
                                    02
                                </span>

                                <div>
                                    <p className="font-bold text-white">
                                        Share your visual universe
                                    </p>
                                    <p className="mt-1 text-sm text-zinc-400">
                                        Post art, meet artists, and build your audience.
                                    </p>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="relative z-10 flex items-center gap-3 text-sm text-zinc-400">
                        <span className="h-2.5 w-2.5 rounded-full bg-emerald-400 shadow-[0_0_18px_rgba(74,222,128,0.9)]" />
                        Join the growing ArtHub creative community.
                    </div>
                </section>

                <section className="relative flex items-center justify-center p-5 sm:p-10">
                    <Link
                        href="/"
                        className="absolute left-6 top-6 flex items-center gap-2 lg:hidden"
                    >
                        <span className="flex h-10 w-10 items-center justify-center rounded-2xl bg-white text-black">
                            <Palette size={21} />
                        </span>
                        <span className="text-xl font-black">ArtHub</span>
                    </Link>

                    <div className="w-full max-w-md pt-20 lg:pt-0">
                        <div className="mb-8">
                            <p className="text-sm font-bold uppercase tracking-[0.22em] text-pink-300">
                                Join ArtHub
                            </p>

                            <h2 className="mt-3 text-4xl font-black tracking-tight">
                                Start your canvas.
                            </h2>

                            <p className="mt-3 leading-6 text-zinc-400">
                                Create your account and give your work a place to be
                                discovered.
                            </p>
                        </div>

                        <button
                            type="button"
                            onClick={() => void handleGoogleSignup()}
                            disabled={isBusy}
                            className="flex w-full items-center justify-center gap-3 rounded-2xl border border-zinc-700 bg-white px-5 py-4 font-bold text-black transition duration-200 hover:-translate-y-0.5 hover:bg-zinc-100 hover:shadow-lg hover:shadow-white/10 disabled:cursor-not-allowed disabled:opacity-60"
                        >
                            <svg
                                viewBox="0 0 24 24"
                                className="h-5 w-5"
                                aria-hidden="true"
                            >
                                <path
                                    fill="#4285F4"
                                    d="M21.35 12.27c0-.79-.07-1.54-.2-2.27H12v4.3h5.24a4.48 4.48 0 0 1-1.94 2.94v2.79h3.14c1.84-1.7 2.91-4.2 2.91-7.06Z"
                                />
                                <path
                                    fill="#34A853"
                                    d="M12 21.75c2.62 0 4.82-.87 6.43-2.36l-3.14-2.79c-.87.59-1.98.94-3.29.94-2.53 0-4.67-1.71-5.44-4.01H3.31v2.88A9.72 9.72 0 0 0 12 21.75Z"
                                />
                                <path
                                    fill="#FBBC05"
                                    d="M6.56 13.53A5.84 5.84 0 0 1 6.25 12c0-.53.09-1.04.31-1.53V7.59H3.31A9.73 9.73 0 0 0 2.25 12c0 1.57.38 3.05 1.06 4.41l3.25-2.88Z"
                                />
                                <path
                                    fill="#EA4335"
                                    d="M12 6.46c1.43 0 2.71.49 3.72 1.45l2.79-2.79C16.82 3.55 14.62 2.25 12 2.25a9.72 9.72 0 0 0-8.69 5.34l3.25 2.88c.77-2.3 2.91-4.01 5.44-4.01Z"
                                />
                            </svg>

                            {googleLoading
                                ? "Connecting to Google..."
                                : "Continue with Google"}
                        </button>

                        <div className="my-7 flex items-center gap-4">
                            <div className="h-px flex-1 bg-zinc-800" />
                            <span className="text-xs font-bold tracking-[0.18em] text-zinc-500">
                                OR
                            </span>
                            <div className="h-px flex-1 bg-zinc-800" />
                        </div>

                        <form
                            onSubmit={(event) => {
                                event.preventDefault();
                                void handleSignup();
                            }}
                            className="space-y-4"
                        >
                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-zinc-300">
                                    Email address
                                </span>

                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5 transition focus-within:border-pink-400/70 focus-within:ring-4 focus-within:ring-pink-500/10">
                                    <Mail size={19} className="text-zinc-500" />

                                    <input
                                        type="email"
                                        placeholder="you@example.com"
                                        value={email}
                                        onChange={(event) =>
                                            setEmail(event.target.value)
                                        }
                                        disabled={isBusy}
                                        className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600 disabled:opacity-60"
                                    />
                                </div>
                            </label>

                            <label className="block">
                                <span className="mb-2 block text-sm font-semibold text-zinc-300">
                                    Create password
                                </span>

                                <div className="flex items-center gap-3 rounded-2xl border border-zinc-800 bg-zinc-900/80 px-4 py-3.5 transition focus-within:border-pink-400/70 focus-within:ring-4 focus-within:ring-pink-500/10">
                                    <LockKeyhole size={19} className="text-zinc-500" />

                                    <input
                                        type={showPassword ? "text" : "password"}
                                        placeholder="At least 6 characters"
                                        value={password}
                                        onChange={(event) =>
                                            setPassword(event.target.value)
                                        }
                                        disabled={isBusy}
                                        className="w-full bg-transparent text-white outline-none placeholder:text-zinc-600 disabled:opacity-60"
                                    />

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setShowPassword((current) => !current)
                                        }
                                        className="text-zinc-500 transition hover:text-white"
                                        aria-label={
                                            showPassword
                                                ? "Hide password"
                                                : "Show password"
                                        }
                                    >
                                        {showPassword ? (
                                            <EyeOff size={19} />
                                        ) : (
                                            <Eye size={19} />
                                        )}
                                    </button>
                                </div>
                            </label>

                            <p className="text-xs leading-5 text-zinc-500">
                                By creating an account, you agree to use ArtHub
                                respectfully and share only content you have the
                                right to post.
                            </p>

                            <button
                                type="submit"
                                disabled={isBusy}
                                className="group mt-3 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-fuchsia-500 via-purple-500 to-pink-500 px-5 py-4 font-black text-white shadow-lg shadow-purple-900/30 transition duration-200 hover:-translate-y-0.5 hover:shadow-xl hover:shadow-purple-700/25 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                {loading ? "Creating account..." : "Begin creating"}

                                {!loading && (
                                    <ArrowRight
                                        size={19}
                                        className="transition-transform group-hover:translate-x-1"
                                    />
                                )}
                            </button>
                        </form>

                        <p className="mt-8 text-center text-sm text-zinc-400">
                            Already have an account?{" "}
                            <Link
                                href="/login"
                                className="font-bold text-pink-300 transition hover:text-pink-200 hover:underline"
                            >
                                Welcome back
                            </Link>
                        </p>
                    </div>
                </section>
            </div>
        </main>
    );
}