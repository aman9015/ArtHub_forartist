"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Send,
    Sparkles,
} from "lucide-react";

import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";

type ArtistProfile = {
    id: string;
    name: string;
    username: string;
    about: string | null;
    description: string | null;
    avatar_url: string | null;
    commissions_open: boolean;
};

type CommissionPlan = {
    id: string;
    artist_id: string;
    title: string;
    description: string | null;
    price: number | string;
    currency: string;
    delivery_days: number | null;
    is_active: boolean;
};

function formatPrice(price: number | string, currency: string) {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2,
    }).format(Number(price));
}

function CommissionRequestContent() {
    const params = useParams();
    const username = params.username as string;

    const supabase = useMemo(() => createClient(), []);

    const [artist, setArtist] = useState<ArtistProfile | null>(null);
    const [plans, setPlans] = useState<CommissionPlan[]>([]);
    const [selectedPlanId, setSelectedPlanId] = useState("");

    const [myId, setMyId] = useState<string | null>(null);
    const [projectTitle, setProjectTitle] = useState("");
    const [projectDescription, setProjectDescription] = useState("");
    const [deadline, setDeadline] = useState("");

    const [loading, setLoading] = useState(true);
    const [sending, setSending] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");
    const [success, setSuccess] = useState(false);

    const selectedPlan =
        plans.find((plan) => plan.id === selectedPlanId) || null;

    useEffect(() => {
        let cancelled = false;

        async function loadCommissionPage() {
            setLoading(true);
            setErrorMessage("");

            try {
                const {
                    data: { user },
                } = await supabase.auth.getUser();

                if (!user) return;

                const { data: artistData, error: artistError } = await supabase
                    .from("profiles")
                    .select(
                        "id, name, username, about, description, avatar_url, commissions_open"
                    )
                    .eq("username", username)
                    .single();

                if (artistError || !artistData) {
                    throw artistError || new Error("Artist not found.");
                }

                const currentArtist = artistData as ArtistProfile;

                const { data: plansData, error: plansError } = await supabase
                    .from("commission_plans")
                    .select(
                        "id, artist_id, title, description, price, currency, delivery_days, is_active"
                    )
                    .eq("artist_id", currentArtist.id)
                    .eq("is_active", true)
                    .order("created_at", { ascending: true });

                if (plansError) {
                    throw plansError;
                }

                if (cancelled) return;

                const activePlans = (plansData || []) as CommissionPlan[];

                setMyId(user.id);
                setArtist(currentArtist);
                setPlans(activePlans);

                if (activePlans.length > 0) {
                    setSelectedPlanId(activePlans[0].id);
                }
            } catch (error) {
                if (!cancelled) {
                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : "Could not load commission details."
                    );
                }
            } finally {
                if (!cancelled) {
                    setLoading(false);
                }
            }
        }

        void loadCommissionPage();

        return () => {
            cancelled = true;
        };
    }, [supabase, username]);

    async function submitRequest(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!artist || !myId || !selectedPlan) return;

        if (!projectTitle.trim()) {
            setErrorMessage("Please add a title for your request.");
            return;
        }

        if (!projectDescription.trim()) {
            setErrorMessage("Please describe the artwork you want.");
            return;
        }

        setSending(true);
        setErrorMessage("");

        const { error } = await supabase.from("commission_requests").insert({
            artist_id: artist.id,
            client_id: myId,
            plan_id: selectedPlan.id,
            project_title: projectTitle.trim(),
            project_description: projectDescription.trim(),
            deadline: deadline || null,
        });

        setSending(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setSuccess(true);
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-8 py-7">
                    Loading commission options...
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center">
                    <h1 className="text-xl font-bold">Artist not found</h1>
                    <p className="mt-2 text-sm text-red-200">
                        {errorMessage || "This profile may no longer exist."}
                    </p>
                </div>
            </main>
        );
    }

    if (artist.id === myId) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <Sparkles className="mx-auto text-purple-300" size={30} />
                    <h1 className="mt-4 text-2xl font-bold">
                        This is your commission page
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                        Manage your packages from Commission Studio instead of sending a
                        request to yourself.
                    </p>

                    <Link
                        href="/commissions/manage"
                        className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
                    >
                        Manage commissions
                    </Link>
                </div>
            </main>
        );
    }

    if (!artist.commissions_open || plans.length === 0) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="max-w-md rounded-[2rem] border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <Sparkles className="mx-auto text-zinc-500" size={30} />
                    <h1 className="mt-4 text-2xl font-bold">
                        Commissions are unavailable
                    </h1>
                    <p className="mt-2 text-sm leading-6 text-zinc-400">
                        {artist.name} is not accepting commission requests right now.
                    </p>

                    <Link
                        href={`/profile/${artist.username}`}
                        className="mt-6 inline-flex rounded-full border border-zinc-700 px-6 py-3 font-bold hover:bg-zinc-900"
                    >
                        Back to profile
                    </Link>
                </div>
            </main>
        );
    }

    if (success && selectedPlan) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <section className="w-full max-w-lg rounded-[2rem] border border-emerald-500/30 bg-gradient-to-br from-emerald-500/10 via-zinc-950 to-zinc-950 p-8 text-center">
                    <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-black">
                        <CheckCircle2 size={32} />
                    </div>

                    <p className="mt-6 text-sm font-semibold text-emerald-300">
                        Commission request sent
                    </p>

                    <h1 className="mt-2 text-3xl font-bold">
                        Your request is with {artist.name}
                    </h1>

                    <p className="mt-3 text-sm leading-6 text-zinc-400">
                        You selected <span className="font-semibold text-white">{selectedPlan.title}</span>.
                        The artist can review the details and respond from their commission
                        dashboard.
                    </p>

                    <div className="mt-7 flex flex-col gap-3 sm:flex-row sm:justify-center">
                        <Link
                            href={`/profile/${artist.username}`}
                            className="rounded-full border border-zinc-700 px-6 py-3 font-bold hover:bg-zinc-900"
                        >
                            Back to profile
                        </Link>

                        <Link
                            href="/explore"
                            className="rounded-full bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
                        >
                            Explore artists
                        </Link>
                    </div>
                </section>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
            <section className="mx-auto max-w-6xl">
                <div className="mb-8 flex items-center gap-4">
                    <Link
                        href={`/profile/${artist.username}`}
                        className="rounded-full border border-zinc-800 p-3 transition hover:bg-zinc-900"
                        aria-label="Back to artist profile"
                    >
                        <ArrowLeft size={19} />
                    </Link>

                    <div>
                        <p className="text-sm font-semibold text-purple-300">
                            ArtHub Commissions
                        </p>
                        <h1 className="text-3xl font-bold">Hire {artist.name}</h1>
                    </div>
                </div>

                <div className="grid gap-6 lg:grid-cols-[1.05fr_0.95fr]">
                    <section>
                        <div className="rounded-[2rem] border border-purple-500/30 bg-gradient-to-br from-purple-500/15 via-zinc-950 to-zinc-950 p-6">
                            <div className="flex items-center gap-4">
                                <div className="flex h-16 w-16 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-xl font-bold">
                                    {artist.avatar_url ? (
                                        <img
                                            src={artist.avatar_url}
                                            alt={artist.name}
                                            className="h-full w-full object-cover"
                                        />
                                    ) : (
                                        <div className="flex h-full w-full items-center justify-center">
                                            {artist.name.charAt(0).toUpperCase()}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <h2 className="text-xl font-bold">{artist.name}</h2>
                                    <p className="text-sm text-zinc-400">@{artist.username}</p>
                                    <p className="mt-1 text-sm text-emerald-300">
                                        Available for commissions
                                    </p>
                                </div>
                            </div>

                            {(artist.about || artist.description) && (
                                <p className="mt-5 text-sm leading-6 text-zinc-400">
                                    {artist.about || artist.description}
                                </p>
                            )}
                        </div>

                        <div className="mt-6">
                            <div className="flex items-end justify-between gap-4">
                                <div>
                                    <p className="text-sm font-semibold text-purple-300">
                                        Step 1
                                    </p>
                                    <h2 className="mt-1 text-2xl font-bold">Choose a package</h2>
                                </div>

                                <p className="text-sm text-zinc-500">{plans.length} available</p>
                            </div>

                            <div className="mt-4 space-y-4">
                                {plans.map((plan) => {
                                    const selected = selectedPlanId === plan.id;

                                    return (
                                        <button
                                            key={plan.id}
                                            type="button"
                                            onClick={() => setSelectedPlanId(plan.id)}
                                            className={`w-full rounded-[1.75rem] border p-5 text-left transition ${selected
                                                ? "border-purple-400 bg-purple-500/15 shadow-lg shadow-purple-500/10"
                                                : "border-zinc-800 bg-zinc-950 hover:border-zinc-600 hover:bg-zinc-900"
                                                }`}
                                        >
                                            <div className="flex items-start justify-between gap-4">
                                                <div>
                                                    <div className="flex items-center gap-3">
                                                        <span
                                                            className={`flex h-6 w-6 items-center justify-center rounded-full border ${selected
                                                                ? "border-purple-300 bg-purple-400 text-black"
                                                                : "border-zinc-600"
                                                                }`}
                                                        >
                                                            {selected && <CheckCircle2 size={15} />}
                                                        </span>

                                                        <h3 className="text-xl font-bold">{plan.title}</h3>
                                                    </div>

                                                    {plan.description && (
                                                        <p className="mt-3 pl-9 text-sm leading-6 text-zinc-400">
                                                            {plan.description}
                                                        </p>
                                                    )}
                                                </div>

                                                <p className="whitespace-nowrap text-lg font-bold text-purple-200">
                                                    {formatPrice(plan.price, plan.currency)}
                                                </p>
                                            </div>

                                            <div className="mt-5 flex items-center gap-2 pl-9 text-sm text-zinc-300">
                                                <Clock3 size={16} className="text-purple-300" />
                                                {plan.delivery_days
                                                    ? `${plan.delivery_days} day${plan.delivery_days === 1 ? "" : "s"
                                                    } estimated delivery`
                                                    : "Delivery time discussed with artist"}
                                            </div>
                                        </button>
                                    );
                                })}
                            </div>
                        </div>
                    </section>

                    <aside className="lg:sticky lg:top-6 lg:self-start">
                        <form
                            onSubmit={submitRequest}
                            className="rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                                    <Send size={19} />
                                </div>

                                <div>
                                    <p className="text-sm font-semibold text-purple-300">
                                        Step 2
                                    </p>
                                    <h2 className="text-xl font-bold">Tell them about the project</h2>
                                </div>
                            </div>

                            {errorMessage && (
                                <div className="mt-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                                    {errorMessage}
                                </div>
                            )}

                            <div className="mt-6 space-y-5">
                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                        Project title
                                    </label>

                                    <input
                                        value={projectTitle}
                                        onChange={(event) => setProjectTitle(event.target.value)}
                                        maxLength={120}
                                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                        Project details
                                    </label>

                                    <textarea
                                        rows={7}
                                        value={projectDescription}
                                        onChange={(event) =>
                                            setProjectDescription(event.target.value)
                                        }
                                        maxLength={3000}
                                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                    />
                                </div>

                                <div>
                                    <label className="mb-2 flex items-center gap-2 text-sm font-semibold text-zinc-200">
                                        <CalendarDays size={16} className="text-purple-300" />
                                        Preferred deadline{" "}
                                        <span className="font-normal text-zinc-500">(optional)</span>
                                    </label>

                                    <input
                                        type="date"
                                        min={new Date().toISOString().split("T")[0]}
                                        value={deadline}
                                        onChange={(event) => setDeadline(event.target.value)}
                                        className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                    />
                                </div>
                            </div>

                            {selectedPlan && (
                                <div className="mt-6 rounded-2xl border border-purple-500/25 bg-purple-500/10 p-4">
                                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                                        Selected package
                                    </p>

                                    <div className="mt-2 flex items-center justify-between gap-4">
                                        <p className="font-bold">{selectedPlan.title}</p>
                                        <p className="font-bold text-purple-200">
                                            {formatPrice(selectedPlan.price, selectedPlan.currency)}
                                        </p>
                                    </div>
                                </div>
                            )}

                            <button
                                type="submit"
                                disabled={sending || !selectedPlan}
                                className="mt-6 flex w-full items-center justify-center gap-2 rounded-full bg-white px-6 py-3.5 font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-60"
                            >
                                <Send size={18} />
                                {sending ? "Sending request..." : "Send commission request"}
                            </button>

                            <p className="mt-4 text-center text-xs leading-5 text-zinc-500">
                                No payment is collected yet. The artist will review your request
                                and discuss final details with you.
                            </p>
                        </form>
                    </aside>
                </div>
            </section>
        </main>
    );
}

export default function CommissionPage() {
    return (
        <RequireAuth>
            <CommissionRequestContent />
        </RequireAuth>
    );
}