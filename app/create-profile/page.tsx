"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

type ExistingProfile = {
    name: string | null;
    username: string | null;
    about: string | null;
    description: string | null;
};

function normalizeUsername(value: string) {
    return value.trim().toLowerCase().replace(/\s+/g, "");
}

export default function CreateProfilePage() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [about, setAbout] = useState("");
    const [description, setDescription] = useState("");

    const [checkingUser, setCheckingUser] = useState(true);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        let cancelled = false;

        async function checkUser() {
            const {
                data: { session },
            } = await supabase.auth.getSession();

            const user = session?.user;

            if (!user) {
                router.replace("/login");
                return;
            }

            const { data: existingProfile, error } = await supabase
                .from("profiles")
                .select("name, username, about, description")
                .eq("id", user.id)
                .maybeSingle();

            if (cancelled) return;

            if (error) {
                alert(error.message);
                setCheckingUser(false);
                return;
            }

            const profile = existingProfile as ExistingProfile | null;

            // A completed profile should not return to this setup screen.
            if (profile?.username?.trim()) {
                router.replace("/explore");
                return;
            }

            setUserId(user.id);

            setName(
                profile?.name?.trim() ||
                user.user_metadata?.full_name ||
                user.user_metadata?.name ||
                ""
            );

            setAbout(profile?.about || "");
            setDescription(profile?.description || "");
            setCheckingUser(false);
        }

        void checkUser();

        return () => {
            cancelled = true;
        };
    }, [router, supabase]);

    async function handleCreateProfile() {
        const cleanName = name.trim();
        const cleanUsername = normalizeUsername(username);

        if (!cleanName) {
            alert("Name is required.");
            return;
        }

        if (!cleanUsername) {
            alert("Username is required.");
            return;
        }

        if (!/^[a-z0-9._]+$/.test(cleanUsername)) {
            alert(
                "Username can only use lowercase letters, numbers, dots, and underscores."
            );
            return;
        }

        if (!userId) {
            alert("Your session is still loading. Please try again.");
            return;
        }

        setLoading(true);

        const profilePayload = {
            name: cleanName,
            username: cleanUsername,
            about: about.trim() || null,
            description: description.trim() || null,
        };

        // New users may already have a blank profile row created automatically.
        // Update it first, and only insert when no profile row exists.
        const { data: updatedProfile, error: updateError } = await supabase
            .from("profiles")
            .update(profilePayload)
            .eq("id", userId)
            .select("id");

        if (updateError) {
            setLoading(false);
            alert(updateError.message);
            return;
        }

        if (!updatedProfile || updatedProfile.length === 0) {
            const { error: insertError } = await supabase
                .from("profiles")
                .insert({
                    id: userId,
                    ...profilePayload,
                    avatar_url: null,
                });

            if (insertError) {
                setLoading(false);

                if (insertError.message.toLowerCase().includes("username")) {
                    alert("That username is already taken. Please choose another.");
                    return;
                }

                alert(insertError.message);
                return;
            }
        }

        setLoading(false);
        router.replace("/explore");
    }

    if (checkingUser) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    Checking your account...
                </div>
            </main>
        );
    }

    return (
        <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
            <section className="w-full max-w-xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8">
                <h1 className="text-3xl font-bold">Create your profile</h1>

                <p className="mt-2 text-zinc-400">
                    Set up your ArtHub identity before entering the feed.
                </p>

                <div className="mt-8 space-y-4">
                    <input
                        type="text"
                        placeholder="Name *"
                        value={name}
                        onChange={(event) => setName(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none transition focus:border-zinc-600"
                    />

                    <input
                        type="text"
                        placeholder="Username *"
                        value={username}
                        onChange={(event) => setUsername(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none transition focus:border-zinc-600"
                    />

                    <input
                        type="text"
                        placeholder="About — optional"
                        value={about}
                        onChange={(event) => setAbout(event.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none transition focus:border-zinc-600"
                    />

                    <textarea
                        placeholder="Description — optional"
                        value={description}
                        onChange={(event) => setDescription(event.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none transition focus:border-zinc-600"
                    />
                </div>

                <button
                    type="button"
                    onClick={() => void handleCreateProfile()}
                    disabled={loading}
                    className="mt-6 w-full rounded-2xl bg-white py-4 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                >
                    {loading ? "Saving profile..." : "Create Profile"}
                </button>
            </section>
        </main>
    );
}