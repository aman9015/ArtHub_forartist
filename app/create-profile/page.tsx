"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

export default function CreateProfilePage() {
    const supabase = createClient();
    const router = useRouter();

    const [userId, setUserId] = useState("");
    const [name, setName] = useState("");
    const [username, setUsername] = useState("");
    const [about, setAbout] = useState("");
    const [description, setDescription] = useState("");
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        async function checkUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setUserId(user.id);
        }

        checkUser();
    }, [router, supabase]);

    async function handleCreateProfile() {
        if (!name.trim()) {
            alert("Name is required");
            return;
        }

        if (!username.trim()) {
            alert("Username is required");
            return;
        }

        setLoading(true);

        const { error } = await supabase.from("profiles").insert({
            id: userId,
            name: name.trim(),
            username: username.trim().toLowerCase().replaceAll(" ", ""),
            about: about.trim() || null,
            description: description.trim() || null,
            avatar_url: null,
        });

        setLoading(false);

        if (error) {
            alert(error.message);
            return;
        }

        router.push("/explore");
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
                        onChange={(e) => setName(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none"
                    />

                    <input
                        type="text"
                        placeholder="Username *"
                        value={username}
                        onChange={(e) => setUsername(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none"
                    />

                    <input
                        type="text"
                        placeholder="About — optional"
                        value={about}
                        onChange={(e) => setAbout(e.target.value)}
                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none"
                    />

                    <textarea
                        placeholder="Description — optional"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        rows={4}
                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-5 py-4 outline-none"
                    />
                </div>

                <button
                    type="button"
                    onClick={handleCreateProfile}
                    disabled={loading}
                    className="mt-6 w-full rounded-2xl bg-white py-4 font-bold text-black hover:bg-zinc-200 disabled:opacity-60"
                >
                    {loading ? "Creating profile..." : "Create Profile"}
                </button>
            </section>
        </main>
    );
}