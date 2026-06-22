"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    Check,
    Clock,
    Eye,
    EyeOff,
    Pencil,
    Plus,
    Sparkles,
    Trash2,
    X,
} from "lucide-react";

import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";

type ArtistProfile = {
    id: string;
    name: string;
    username: string;
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
    created_at: string;
};

type PlanForm = {
    title: string;
    description: string;
    price: string;
    currency: string;
    deliveryDays: string;
    isActive: boolean;
};

const EMPTY_PLAN: PlanForm = {
    title: "",
    description: "",
    price: "",
    currency: "INR",
    deliveryDays: "",
    isActive: true,
};

function formatPrice(price: number | string, currency: string) {
    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2,
    }).format(Number(price));
}

function CommissionManagerContent() {
    const supabase = useMemo(() => createClient(), []);

    const [artist, setArtist] = useState<ArtistProfile | null>(null);
    const [plans, setPlans] = useState<CommissionPlan[]>([]);
    const [loading, setLoading] = useState(true);

    const [showPlanModal, setShowPlanModal] = useState(false);
    const [editingPlanId, setEditingPlanId] = useState<string | null>(null);
    const [planForm, setPlanForm] = useState<PlanForm>(EMPTY_PLAN);

    const [savingPlan, setSavingPlan] = useState(false);
    const [savingAvailability, setSavingAvailability] = useState(false);
    const [busyPlanId, setBusyPlanId] = useState<string | null>(null);

    const [errorMessage, setErrorMessage] = useState("");
    const [notice, setNotice] = useState("");

    const activePlans = plans.filter((plan) => plan.is_active);

    const cheapestPlan =
        activePlans.length > 0
            ? activePlans.reduce((lowest, current) =>
                Number(current.price) < Number(lowest.price) ? current : lowest
            )
            : null;

    const loadPlans = useCallback(
        async (artistId: string) => {
            const { data, error } = await supabase
                .from("commission_plans")
                .select(
                    "id, artist_id, title, description, price, currency, delivery_days, is_active, created_at"
                )
                .eq("artist_id", artistId)
                .order("created_at", { ascending: false });

            if (error) throw error;

            setPlans((data || []) as CommissionPlan[]);
        },
        [supabase]
    );

    const loadStudio = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: profileData, error: profileError } = await supabase
                .from("profiles")
                .select("id, name, username, commissions_open")
                .eq("id", user.id)
                .single();

            if (profileError || !profileData) {
                throw profileError || new Error("Unable to load your profile.");
            }

            const currentArtist = profileData as ArtistProfile;

            setArtist(currentArtist);
            await loadPlans(currentArtist.id);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to load commission settings."
            );
        } finally {
            setLoading(false);
        }
    }, [loadPlans, supabase]);

    useEffect(() => {
        void loadStudio();
    }, [loadStudio]);

    function openCreatePlanModal() {
        setEditingPlanId(null);
        setPlanForm(EMPTY_PLAN);
        setErrorMessage("");
        setNotice("");
        setShowPlanModal(true);
    }

    function openEditPlanModal(plan: CommissionPlan) {
        setEditingPlanId(plan.id);

        setPlanForm({
            title: plan.title,
            description: plan.description || "",
            price: String(plan.price),
            currency: plan.currency || "INR",
            deliveryDays: plan.delivery_days ? String(plan.delivery_days) : "",
            isActive: plan.is_active,
        });

        setErrorMessage("");
        setNotice("");
        setShowPlanModal(true);
    }

    function closePlanModal() {
        if (savingPlan) return;

        setShowPlanModal(false);
        setEditingPlanId(null);
        setPlanForm(EMPTY_PLAN);
    }

    async function toggleCommissionAvailability() {
        if (!artist) return;

        setSavingAvailability(true);
        setErrorMessage("");
        setNotice("");

        const nextValue = !artist.commissions_open;

        const { error } = await supabase
            .from("profiles")
            .update({ commissions_open: nextValue })
            .eq("id", artist.id);

        setSavingAvailability(false);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setArtist((current) =>
            current
                ? {
                    ...current,
                    commissions_open: nextValue,
                }
                : current
        );

        if (nextValue && activePlans.length === 0) {
            setNotice("Commissions are open. Add an active plan for clients to choose.");
            return;
        }

        setNotice(
            nextValue
                ? "Your profile is now open for commissions."
                : "Your commission requests are now paused."
        );
    }

    async function savePlan(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!artist) return;

        const price = Number(planForm.price);
        const deliveryDays = planForm.deliveryDays
            ? Number(planForm.deliveryDays)
            : null;

        if (!planForm.title.trim()) {
            setErrorMessage("Plan name is required.");
            return;
        }

        if (!Number.isFinite(price) || price < 0) {
            setErrorMessage("Enter a valid price.");
            return;
        }

        if (
            deliveryDays !== null &&
            (!Number.isInteger(deliveryDays) || deliveryDays <= 0)
        ) {
            setErrorMessage("Delivery days must be a whole number greater than zero.");
            return;
        }

        setSavingPlan(true);
        setErrorMessage("");

        try {
            const payload = {
                title: planForm.title.trim(),
                description: planForm.description.trim() || null,
                price,
                currency: planForm.currency,
                delivery_days: deliveryDays,
                is_active: planForm.isActive,
            };

            const { error } = editingPlanId
                ? await supabase
                    .from("commission_plans")
                    .update(payload)
                    .eq("id", editingPlanId)
                    .eq("artist_id", artist.id)
                : await supabase.from("commission_plans").insert({
                    ...payload,
                    artist_id: artist.id,
                });

            if (error) throw error;

            await loadPlans(artist.id);

            setShowPlanModal(false);
            setEditingPlanId(null);
            setPlanForm(EMPTY_PLAN);

            setNotice(
                editingPlanId
                    ? "Commission plan updated."
                    : "Commission plan created."
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Unable to save the plan."
            );
        } finally {
            setSavingPlan(false);
        }
    }

    async function togglePlanStatus(plan: CommissionPlan) {
        if (!artist) return;

        setBusyPlanId(plan.id);
        setErrorMessage("");
        setNotice("");

        try {
            const { error } = await supabase
                .from("commission_plans")
                .update({ is_active: !plan.is_active })
                .eq("id", plan.id)
                .eq("artist_id", artist.id);

            if (error) throw error;

            await loadPlans(artist.id);

            setNotice(
                plan.is_active
                    ? `"${plan.title}" is now paused.`
                    : `"${plan.title}" is now active.`
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Unable to update plan availability."
            );
        } finally {
            setBusyPlanId(null);
        }
    }

    async function deletePlan(plan: CommissionPlan) {
        if (!artist) return;

        const confirmed = window.confirm(
            `Delete "${plan.title}" permanently? Existing requests will keep their saved plan details.`
        );

        if (!confirmed) return;

        setBusyPlanId(plan.id);
        setErrorMessage("");
        setNotice("");

        try {
            const { error } = await supabase
                .from("commission_plans")
                .delete()
                .eq("id", plan.id)
                .eq("artist_id", artist.id);

            if (error) throw error;

            await loadPlans(artist.id);
            setNotice(`"${plan.title}" was deleted.`);
        } catch (error) {
            setErrorMessage(
                error instanceof Error ? error.message : "Unable to delete the plan."
            );
        } finally {
            setBusyPlanId(null);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-8 py-7">
                    Loading commission studio...
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center">
                    <h1 className="text-xl font-bold">Unable to load commission studio</h1>
                    <p className="mt-2 text-sm text-red-200">
                        {errorMessage || "Refresh the page and try again."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
            <section className="mx-auto max-w-6xl">
                <header className="mb-8 flex flex-col items-start justify-between gap-5 sm:flex-row sm:items-center">
                    <div className="flex items-center gap-4">
                        <Link
                            href={`/profile/${artist.username}`}
                            className="rounded-full border border-zinc-800 p-3 transition hover:bg-zinc-900"
                            aria-label="Back to profile"
                        >
                            <ArrowLeft size={19} />
                        </Link>

                        <div>
                            <p className="text-sm font-semibold text-purple-300">
                                ArtHub Studio
                            </p>
                            <h1 className="text-3xl font-bold">Commission Plans</h1>
                            <p className="mt-1 text-sm text-zinc-400">
                                Create packages clients can select from your profile.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={openCreatePlanModal}
                        className="inline-flex shrink-0 items-center gap-2 rounded-full bg-white px-5 py-3 font-bold text-black transition hover:scale-[1.02] hover:bg-zinc-200"
                    >
                        <Plus size={18} />
                        Add plan
                    </button>
                </header>

                {errorMessage && (
                    <div className="mb-5 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                        {errorMessage}
                    </div>
                )}

                {notice && (
                    <div className="mb-5 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-200">
                        {notice}
                    </div>
                )}

                <div className="mb-7 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
                    <section className="rounded-[2rem] border border-purple-500/30 bg-gradient-to-br from-purple-500/20 via-zinc-950 to-zinc-950 p-6">
                        <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-center">
                            <div>
                                <div className="flex items-center gap-2 text-purple-200">
                                    <Sparkles size={20} />
                                    <span className="font-semibold">Commission availability</span>
                                </div>

                                <h2 className="mt-3 text-2xl font-bold">
                                    {artist.commissions_open
                                        ? "Open for commissions"
                                        : "Commissions paused"}
                                </h2>

                                <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-400">
                                    {artist.commissions_open
                                        ? "Visitors can see Hire Artist on your profile and select an active package."
                                        : "Your packages stay saved, but new clients cannot send requests."}
                                </p>
                            </div>

                            <button
                                type="button"
                                onClick={toggleCommissionAvailability}
                                disabled={savingAvailability}
                                className={`flex min-w-[170px] items-center justify-between rounded-full border px-4 py-3 font-semibold transition disabled:opacity-60 ${artist.commissions_open
                                        ? "border-emerald-400/40 bg-emerald-500/15 text-emerald-200"
                                        : "border-zinc-700 bg-zinc-900 text-zinc-300"
                                    }`}
                            >
                                <span className="flex items-center gap-2">
                                    {artist.commissions_open ? <Eye size={18} /> : <EyeOff size={18} />}
                                    {artist.commissions_open ? "Open" : "Paused"}
                                </span>

                                <span
                                    className={`flex h-7 w-12 items-center rounded-full p-1 ${artist.commissions_open ? "bg-emerald-500" : "bg-zinc-700"
                                        }`}
                                >
                                    <span
                                        className={`h-5 w-5 rounded-full bg-white transition ${artist.commissions_open
                                                ? "translate-x-5"
                                                : "translate-x-0"
                                            }`}
                                    />
                                </span>
                            </button>
                        </div>
                    </section>

                    <section className="grid grid-cols-2 gap-4">
                        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                            <p className="text-sm text-zinc-500">Active plans</p>
                            <p className="mt-2 text-3xl font-bold">{activePlans.length}</p>
                            <p className="mt-1 text-xs text-zinc-500">
                                {plans.length} total plans
                            </p>
                        </div>

                        <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                            <p className="text-sm text-zinc-500">Starting from</p>
                            <p className="mt-2 truncate text-2xl font-bold">
                                {cheapestPlan
                                    ? formatPrice(cheapestPlan.price, cheapestPlan.currency)
                                    : "—"}
                            </p>
                            <p className="mt-1 truncate text-xs text-zinc-500">
                                {cheapestPlan ? cheapestPlan.title : "No active plan"}
                            </p>
                        </div>
                    </section>
                </div>

                {plans.length === 0 ? (
                    <section className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-950 px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-300">
                            <Sparkles size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">No commission plans yet</h2>

                        <button
                            type="button"
                            onClick={openCreatePlanModal}
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
                        >
                            <Plus size={18} />
                            Add your first plan
                        </button>
                    </section>
                ) : (
                    <section className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
                        {plans.map((plan) => (
                            <article
                                key={plan.id}
                                className={`relative overflow-hidden rounded-[2rem] border p-6 transition ${plan.is_active
                                        ? "border-zinc-800 bg-zinc-950 hover:-translate-y-1 hover:border-purple-500/40"
                                        : "border-zinc-800 bg-zinc-950/60 opacity-75"
                                    }`}
                            >
                                <div
                                    className={`absolute left-0 top-0 h-1 w-full ${plan.is_active
                                            ? "bg-gradient-to-r from-purple-500 to-pink-500"
                                            : "bg-zinc-700"
                                        }`}
                                />

                                <div className="flex items-start justify-between gap-4">
                                    <div>
                                        <span
                                            className={`rounded-full px-3 py-1 text-xs font-bold ${plan.is_active
                                                    ? "bg-emerald-500/10 text-emerald-300"
                                                    : "bg-zinc-800 text-zinc-400"
                                                }`}
                                        >
                                            {plan.is_active ? "ACTIVE" : "PAUSED"}
                                        </span>

                                        <h2 className="mt-4 text-2xl font-bold">{plan.title}</h2>
                                    </div>

                                    <p className="text-lg font-bold text-purple-200">
                                        {formatPrice(plan.price, plan.currency)}
                                    </p>
                                </div>

                                {plan.description && (
                                    <p className="mt-4 min-h-12 text-sm leading-6 text-zinc-400">
                                        {plan.description}
                                    </p>
                                )}

                                <div className="mt-6 flex items-center gap-2 text-sm text-zinc-300">
                                    <Clock size={16} className="text-purple-300" />
                                    {plan.delivery_days
                                        ? `${plan.delivery_days} day${plan.delivery_days === 1 ? "" : "s"
                                        } delivery`
                                        : "Delivery discussed in chat"}
                                </div>

                                <div className="mt-6 grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => openEditPlanModal(plan)}
                                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-900"
                                    >
                                        <Pencil size={15} />
                                        Edit
                                    </button>

                                    <button
                                        type="button"
                                        disabled={busyPlanId === plan.id}
                                        onClick={() => togglePlanStatus(plan)}
                                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-zinc-700 px-3 py-2 text-sm font-semibold hover:bg-zinc-900 disabled:opacity-50"
                                    >
                                        {plan.is_active ? <EyeOff size={15} /> : <Eye size={15} />}
                                        {plan.is_active ? "Pause" : "Open"}
                                    </button>

                                    <button
                                        type="button"
                                        disabled={busyPlanId === plan.id}
                                        onClick={() => deletePlan(plan)}
                                        className="inline-flex items-center justify-center gap-1 rounded-2xl border border-red-500/25 px-3 py-2 text-sm font-semibold text-red-300 hover:bg-red-500/10 disabled:opacity-50"
                                    >
                                        <Trash2 size={15} />
                                        Delete
                                    </button>
                                </div>
                            </article>
                        ))}
                    </section>
                )}
            </section>

            {showPlanModal && (
                <div className="fixed inset-0 z-[300] overflow-y-auto bg-black/85 px-4 py-6 backdrop-blur-md">
                    <div className="flex min-h-full items-start justify-center">
                        <div className="my-auto w-full max-w-2xl overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950 shadow-2xl">
                            <div className="flex items-start justify-between gap-5 border-b border-zinc-800 px-6 py-5">
                                <div>
                                    <p className="text-sm font-semibold text-purple-300">
                                        ArtHub Commission Studio
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold">
                                        {editingPlanId ? "Edit plan" : "Create commission plan"}
                                    </h2>
                                </div>

                                <button
                                    type="button"
                                    onClick={closePlanModal}
                                    disabled={savingPlan}
                                    className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white disabled:opacity-50"
                                    aria-label="Close"
                                >
                                    <X size={22} />
                                </button>
                            </div>

                            <form onSubmit={savePlan}>
                                <div className="space-y-5 px-6 py-6">
                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                            Plan name
                                        </label>

                                        <input
                                            value={planForm.title}
                                            onChange={(event) =>
                                                setPlanForm((current) => ({
                                                    ...current,
                                                    title: event.target.value,
                                                }))
                                            }
                                            maxLength={80}
                                            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                        />
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                            What is included?
                                        </label>

                                        <textarea
                                            rows={4}
                                            value={planForm.description}
                                            onChange={(event) =>
                                                setPlanForm((current) => ({
                                                    ...current,
                                                    description: event.target.value,
                                                }))
                                            }
                                            className="w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                        />
                                    </div>

                                    <div className="grid gap-4 sm:grid-cols-2">
                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                                Price
                                            </label>

                                            <input
                                                type="number"
                                                min="0"
                                                step="0.01"
                                                value={planForm.price}
                                                onChange={(event) =>
                                                    setPlanForm((current) => ({
                                                        ...current,
                                                        price: event.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                            />
                                        </div>

                                        <div>
                                            <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                                Currency
                                            </label>

                                            <select
                                                value={planForm.currency}
                                                onChange={(event) =>
                                                    setPlanForm((current) => ({
                                                        ...current,
                                                        currency: event.target.value,
                                                    }))
                                                }
                                                className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                            >
                                                <option value="INR">INR ₹</option>
                                                <option value="USD">USD $</option>
                                            </select>
                                        </div>
                                    </div>

                                    <div>
                                        <label className="mb-2 block text-sm font-semibold text-zinc-200">
                                            Delivery days{" "}
                                            <span className="font-normal text-zinc-500">
                                                (optional)
                                            </span>
                                        </label>

                                        <input
                                            type="number"
                                            min="1"
                                            step="1"
                                            value={planForm.deliveryDays}
                                            onChange={(event) =>
                                                setPlanForm((current) => ({
                                                    ...current,
                                                    deliveryDays: event.target.value,
                                                }))
                                            }
                                            className="w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 outline-none transition focus:border-purple-500"
                                        />
                                    </div>

                                    <button
                                        type="button"
                                        onClick={() =>
                                            setPlanForm((current) => ({
                                                ...current,
                                                isActive: !current.isActive,
                                            }))
                                        }
                                        className={`flex w-full items-center justify-between rounded-2xl border p-4 text-left transition ${planForm.isActive
                                                ? "border-emerald-500/35 bg-emerald-500/10"
                                                : "border-zinc-800 bg-zinc-900"
                                            }`}
                                    >
                                        <div>
                                            <p className="font-bold">Plan available for clients</p>
                                            <p className="mt-1 text-sm text-zinc-400">
                                                Clients can select this plan while hiring you.
                                            </p>
                                        </div>

                                        <span
                                            className={`flex h-7 w-12 items-center rounded-full p-1 ${planForm.isActive ? "bg-emerald-500" : "bg-zinc-700"
                                                }`}
                                        >
                                            <span
                                                className={`h-5 w-5 rounded-full bg-white transition ${planForm.isActive
                                                        ? "translate-x-5"
                                                        : "translate-x-0"
                                                    }`}
                                            />
                                        </span>
                                    </button>
                                </div>

                                <div className="flex flex-col-reverse gap-3 border-t border-zinc-800 bg-zinc-950 px-6 py-5 sm:flex-row sm:justify-end">
                                    <button
                                        type="button"
                                        onClick={closePlanModal}
                                        disabled={savingPlan}
                                        className="rounded-full border border-zinc-700 px-5 py-3 font-semibold transition hover:bg-zinc-900 disabled:opacity-50"
                                    >
                                        Cancel
                                    </button>

                                    <button
                                        type="submit"
                                        disabled={savingPlan}
                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200 disabled:opacity-60"
                                    >
                                        <Check size={18} />
                                        {savingPlan
                                            ? "Saving..."
                                            : editingPlanId
                                                ? "Save changes"
                                                : "Create plan"}
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </main>
    );
}

export default function CommissionManagePage() {
    return (
        <RequireAuth>
            <CommissionManagerContent />
        </RequireAuth>
    );
}