
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
    ArrowLeft,
    CalendarDays,
    Check,
    CheckCircle2,
    Clock3,
    FileUp,
    FolderKanban,
    Inbox,
    MessageCircle,
    Paperclip,
    Sparkles,
    UploadCloud,
    UserRound,
    X,
} from "lucide-react";

import RequireAuth from "@/app/auth/RequireAuth";
import { createClient } from "@/app/lib/supabase";

type CommissionStatus =
    | "pending"
    | "accepted"
    | "rejected"
    | "in_progress"
    | "completed"
    | "cancelled";

type DeliveryStatus = "submitted" | "revision_requested" | "approved";

type ArtistProfile = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type ClientProfile = {
    id: string;
    name: string;
    username: string;
    avatar_url: string | null;
};

type Conversation = {
    id: string;
    user_one: string;
    user_two: string;
    commission_request_id: string | null;
    created_at: string;
};

type CommissionDelivery = {
    id: string;
    commission_request_id: string;
    artist_id: string;
    client_id: string;
    file_path: string;
    file_name: string;
    file_type: string | null;
    file_size: number | null;
    delivery_message: string | null;
    status: DeliveryStatus;
    revision_message: string | null;
    revision_requested_at: string | null;
    approved_at: string | null;
    created_at: string;
};

type CommissionRequest = {
    id: string;
    artist_id: string;
    client_id: string;
    plan_id: string | null;
    plan_title: string | null;
    plan_price: number | string | null;
    currency: string;
    delivery_days: number | null;
    project_title: string;
    project_description: string;
    deadline: string | null;
    status: CommissionStatus;
    created_at: string;
};

type RequestWithClient = CommissionRequest & {
    client: ClientProfile | null;
    deliveries: CommissionDelivery[];
};

type Filter = "all" | CommissionStatus;

const FILTERS: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Pending", value: "pending" },
    { label: "Accepted", value: "accepted" },
    { label: "In Progress", value: "in_progress" },
    { label: "Completed", value: "completed" },
];

function formatPrice(price: number | string | null, currency: string) {
    if (price === null || price === undefined) return "Price unavailable";

    return new Intl.NumberFormat(currency === "INR" ? "en-IN" : "en-US", {
        style: "currency",
        currency: currency || "INR",
        maximumFractionDigits: 2,
    }).format(Number(price));
}

function formatDate(dateValue: string) {
    return new Date(`${dateValue}T00:00:00`).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatCreatedAt(dateValue: string) {
    return new Date(dateValue).toLocaleDateString(undefined, {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

function formatFileSize(size: number | null) {
    if (!size) return "";

    if (size < 1024 * 1024) {
        return `${Math.round(size / 1024)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function getStatusStyle(status: CommissionStatus) {
    const styles: Record<CommissionStatus, string> = {
        pending: "border-amber-500/30 bg-amber-500/10 text-amber-200",
        accepted: "border-blue-500/30 bg-blue-500/10 text-blue-200",
        rejected: "border-red-500/30 bg-red-500/10 text-red-200",
        in_progress: "border-purple-500/30 bg-purple-500/10 text-purple-200",
        completed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
        cancelled: "border-zinc-700 bg-zinc-800 text-zinc-300",
    };

    return styles[status];
}

function getStatusLabel(status: CommissionStatus) {
    return status.replaceAll("_", " ");
}

function getDeliveryStatusStyle(status: DeliveryStatus) {
    const styles: Record<DeliveryStatus, string> = {
        submitted: "border-blue-500/30 bg-blue-500/10 text-blue-200",
        revision_requested:
            "border-amber-500/30 bg-amber-500/10 text-amber-200",
        approved: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
    };

    return styles[status];
}

function getDeliveryStatusLabel(status: DeliveryStatus) {
    const labels: Record<DeliveryStatus, string> = {
        submitted: "Awaiting review",
        revision_requested: "Revision requested",
        approved: "Approved",
    };

    return labels[status];
}

function canMessageForStatus(status: CommissionStatus) {
    return (
        status === "accepted" ||
        status === "in_progress" ||
        status === "completed"
    );
}

function canSubmitDelivery(
    request: RequestWithClient,
    latestDelivery: CommissionDelivery | undefined
) {
    if (
        request.status !== "accepted" &&
        request.status !== "in_progress"
    ) {
        return false;
    }

    return (
        !latestDelivery || latestDelivery.status === "revision_requested"
    );
}

function DeliverWorkModal({
    request,
    onClose,
    onDelivered,
}: {
    request: RequestWithClient;
    onClose: () => void;
    onDelivered: () => Promise<void>;
}) {
    const supabase = useMemo(() => createClient(), []);

    const [file, setFile] = useState<File | null>(null);
    const [deliveryMessage, setDeliveryMessage] = useState("");
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!file) {
            setErrorMessage("Choose the file you want to deliver.");
            return;
        }

        setIsSubmitting(true);
        setErrorMessage("");

        let uploadedPath = "";

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user || user.id !== request.artist_id) {
                throw new Error("Please sign in again as the artist.");
            }

            const safeFileName = file.name
                .replace(/[^\w.\-]+/g, "-")
                .replace(/-+/g, "-");

            uploadedPath = `${request.id}/${Date.now()}-${safeFileName}`;

            const { error: uploadError } = await supabase.storage
                .from("commission-deliveries")
                .upload(uploadedPath, file, {
                    cacheControl: "3600",
                    upsert: false,
                    contentType: file.type || "application/octet-stream",
                });

            if (uploadError) throw uploadError;

            const { error: deliveryError } = await supabase
                .from("commission_deliveries")
                .insert({
                    commission_request_id: request.id,
                    artist_id: request.artist_id,
                    client_id: request.client_id,
                    file_path: uploadedPath,
                    file_name: file.name,
                    file_type: file.type || null,
                    file_size: file.size,
                    delivery_message: deliveryMessage.trim() || null,
                });

            if (deliveryError) throw deliveryError;

            await onDelivered();
            onClose();
        } catch (error) {
            if (uploadedPath) {
                await supabase.storage
                    .from("commission-deliveries")
                    .remove([uploadedPath]);
            }

            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not submit the delivery."
            );
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-xl overflow-y-auto rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/60 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                    <div>
                        <p className="text-sm font-semibold text-purple-300">
                            Commission delivery
                        </p>
                        <h2 className="mt-1 text-2xl font-bold">Deliver your work</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            Upload the final file or your revised version for{" "}
                            <span className="font-semibold text-zinc-200">
                                {request.project_title}
                            </span>
                            .
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={isSubmitting}
                        onClick={onClose}
                        aria-label="Close delivery modal"
                        className="rounded-full border border-zinc-800 p-2.5 text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                    >
                        <X size={19} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-7 space-y-5">
                    <label className="block cursor-pointer rounded-3xl border border-dashed border-purple-500/40 bg-purple-500/5 p-6 text-center transition hover:border-purple-400 hover:bg-purple-500/10">
                        <input
                            type="file"
                            className="hidden"
                            accept="image/*,.pdf,.zip,.psd,.clip,.kra,.procreate"
                            onChange={(event) => {
                                setFile(event.target.files?.[0] || null);
                                setErrorMessage("");
                            }}
                        />

                        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-purple-500/15 text-purple-300">
                            <UploadCloud size={26} />
                        </div>

                        <p className="mt-4 font-bold text-white">
                            {file ? file.name : "Choose a file to deliver"}
                        </p>

                        <p className="mt-2 text-sm text-zinc-400">
                            Images, PDF, ZIP, PSD, Clip Studio, Krita, or Procreate files.
                        </p>

                        {file && (
                            <p className="mt-2 text-xs font-medium text-purple-200">
                                {file.type || "File"} · {formatFileSize(file.size)}
                            </p>
                        )}
                    </label>

                    <div>
                        <label className="mb-2 block text-sm font-semibold text-zinc-200">
                            Delivery note <span className="text-zinc-500">(optional)</span>
                        </label>

                        <textarea
                            value={deliveryMessage}
                            onChange={(event) => setDeliveryMessage(event.target.value)}
                            rows={4}
                            placeholder="Tell the client what is included, mention file details, or explain your final choices."
                            className="w-full resize-none rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-purple-500"
                        />
                    </div>

                    {errorMessage && (
                        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMessage}
                        </div>
                    )}

                    <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            disabled={isSubmitting}
                            onClick={onClose}
                            className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={isSubmitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                            <FileUp size={17} />
                            {isSubmitting ? "Uploading..." : "Submit delivery"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function CommissionInboxContent() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [artist, setArtist] = useState<ArtistProfile | null>(null);
    const [requests, setRequests] = useState<RequestWithClient[]>([]);
    const [activeFilter, setActiveFilter] = useState<Filter>("all");
    const [loading, setLoading] = useState(true);
    const [updatingRequestId, setUpdatingRequestId] = useState<string | null>(
        null
    );
    const [openingConversationForId, setOpeningConversationForId] = useState<
        string | null
    >(null);
    const [deliveryRequest, setDeliveryRequest] =
        useState<RequestWithClient | null>(null);

    const [errorMessage, setErrorMessage] = useState("");
    const [notice, setNotice] = useState("");

    const counts = useMemo<Record<Filter, number>>(
        () => ({
            all: requests.length,
            pending: requests.filter((request) => request.status === "pending")
                .length,
            accepted: requests.filter((request) => request.status === "accepted")
                .length,
            rejected: requests.filter((request) => request.status === "rejected")
                .length,
            in_progress: requests.filter(
                (request) => request.status === "in_progress"
            ).length,
            completed: requests.filter((request) => request.status === "completed")
                .length,
            cancelled: requests.filter((request) => request.status === "cancelled")
                .length,
        }),
        [requests]
    );

    const visibleRequests = useMemo(() => {
        if (activeFilter === "all") return requests;

        return requests.filter((request) => request.status === activeFilter);
    }, [activeFilter, requests]);

    const loadInbox = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: artistData, error: artistError } = await supabase
                .from("profiles")
                .select("id, name, username, avatar_url")
                .eq("id", user.id)
                .single();

            if (artistError || !artistData) {
                throw artistError || new Error("Could not load your profile.");
            }

            const currentArtist = artistData as ArtistProfile;

            const { data: requestData, error: requestsError } = await supabase
                .from("commission_requests")
                .select(
                    "id, artist_id, client_id, plan_id, plan_title, plan_price, currency, delivery_days, project_title, project_description, deadline, status, created_at"
                )
                .eq("artist_id", currentArtist.id)
                .order("created_at", { ascending: false });

            if (requestsError) throw requestsError;

            const commissionRequests = (requestData || []) as CommissionRequest[];

            const clientIds = [
                ...new Set(commissionRequests.map((request) => request.client_id)),
            ];

            const requestIds = commissionRequests.map((request) => request.id);

            let clients: ClientProfile[] = [];
            let deliveries: CommissionDelivery[] = [];

            if (clientIds.length > 0) {
                const { data: clientsData, error: clientsError } = await supabase
                    .from("profiles")
                    .select("id, name, username, avatar_url")
                    .in("id", clientIds);

                if (clientsError) throw clientsError;

                clients = (clientsData || []) as ClientProfile[];
            }

            if (requestIds.length > 0) {
                const { data: deliveriesData, error: deliveriesError } = await supabase
                    .from("commission_deliveries")
                    .select(
                        "id, commission_request_id, artist_id, client_id, file_path, file_name, file_type, file_size, delivery_message, status, revision_message, revision_requested_at, approved_at, created_at"
                    )
                    .in("commission_request_id", requestIds)
                    .order("created_at", { ascending: false });

                if (deliveriesError) throw deliveriesError;

                deliveries = (deliveriesData || []) as CommissionDelivery[];
            }

            const clientsById = new Map(
                clients.map((client) => [client.id, client])
            );

            const deliveriesByRequestId = new Map<string, CommissionDelivery[]>();

            deliveries.forEach((delivery) => {
                const current = deliveriesByRequestId.get(
                    delivery.commission_request_id
                );

                if (current) {
                    current.push(delivery);
                } else {
                    deliveriesByRequestId.set(delivery.commission_request_id, [
                        delivery,
                    ]);
                }
            });

            setArtist(currentArtist);

            setRequests(
                commissionRequests.map((request) => ({
                    ...request,
                    client: clientsById.get(request.client_id) || null,
                    deliveries: deliveriesByRequestId.get(request.id) || [],
                }))
            );
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not load your commission requests."
            );
        } finally {
            setLoading(false);
        }
    }, [supabase]);

    useEffect(() => {
        void loadInbox();
    }, [loadInbox]);

    async function updateRequestStatus(
        request: RequestWithClient,
        nextStatus: CommissionStatus
    ) {
        setUpdatingRequestId(request.id);
        setErrorMessage("");
        setNotice("");

        const { error } = await supabase
            .from("commission_requests")
            .update({ status: nextStatus })
            .eq("id", request.id)
            .eq("artist_id", request.artist_id);

        setUpdatingRequestId(null);

        if (error) {
            setErrorMessage(error.message);
            return;
        }

        setRequests((currentRequests) =>
            currentRequests.map((currentRequest) =>
                currentRequest.id === request.id
                    ? { ...currentRequest, status: nextStatus }
                    : currentRequest
            )
        );

        const clientName = request.client?.name || "Client";

        const messages: Record<CommissionStatus, string> = {
            pending: "",
            accepted: `You accepted ${clientName}'s request. A private chat is ready.`,
            rejected: `You rejected ${clientName}'s request.`,
            in_progress: "Commission moved to In Progress.",
            completed: "Commission marked as completed.",
            cancelled: "Commission cancelled.",
        };

        setNotice(messages[nextStatus]);
    }

    async function openConversation(request: RequestWithClient) {
        setOpeningConversationForId(request.id);
        setErrorMessage("");
        setNotice("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                throw new Error("Please sign in again to open the chat.");
            }

            const { data, error } = await supabase
                .from("conversations")
                .select("id, user_one, user_two, commission_request_id, created_at")
                .or(
                    `and(user_one.eq.${user.id},user_two.eq.${request.client_id}),and(user_one.eq.${request.client_id},user_two.eq.${user.id})`
                )
                .order("created_at", { ascending: true });

            if (error) throw error;

            const conversations = (data || []) as Conversation[];

            const conversation =
                conversations.find(
                    (item) => item.commission_request_id === request.id
                ) || conversations[0];

            if (!conversation) {
                throw new Error(
                    "Chat is not ready yet. Refresh once, then try opening it again."
                );
            }

            router.push(`/messages/${conversation.id}`);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not open this conversation."
            );
        } finally {
            setOpeningConversationForId(null);
        }
    }

    async function handleDeliverySubmitted() {
        await loadInbox();
        setNotice(
            "Delivery submitted successfully. Your client can now review the file."
        );
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-8 py-7">
                    Loading commission requests...
                </div>
            </main>
        );
    }

    if (!artist) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="max-w-md rounded-3xl border border-red-500/30 bg-red-500/10 p-7 text-center">
                    <h1 className="text-xl font-bold">Could not load your inbox</h1>
                    <p className="mt-2 text-sm text-red-200">
                        {errorMessage || "Refresh and try again."}
                    </p>
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
            <section className="mx-auto max-w-6xl">
                <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-center sm:justify-between">
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
                                ArtHub Commission Studio
                            </p>
                            <h1 className="text-3xl font-bold">Commission Requests</h1>
                            <p className="mt-1 text-sm text-zinc-400">
                                Review new projects, upload deliveries, and manage active work.
                            </p>
                        </div>
                    </div>

                    <Link
                        href="/commissions/manage"
                        className="inline-flex items-center justify-center gap-2 rounded-full border border-zinc-700 px-5 py-3 font-semibold transition hover:bg-zinc-900"
                    >
                        <Sparkles size={18} />
                        Manage plans
                    </Link>
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

                <div className="mb-7 grid gap-4 sm:grid-cols-3">
                    <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-5">
                        <p className="text-sm text-zinc-500">All requests</p>
                        <p className="mt-2 text-3xl font-bold">{counts.all}</p>
                    </div>

                    <div className="rounded-3xl border border-amber-500/20 bg-amber-500/5 p-5">
                        <p className="text-sm text-amber-200/70">Waiting for you</p>
                        <p className="mt-2 text-3xl font-bold text-amber-200">
                            {counts.pending}
                        </p>
                    </div>

                    <div className="rounded-3xl border border-purple-500/20 bg-purple-500/5 p-5">
                        <p className="text-sm text-purple-200/70">Active work</p>
                        <p className="mt-2 text-3xl font-bold text-purple-200">
                            {counts.accepted + counts.in_progress}
                        </p>
                    </div>
                </div>

                <div className="mb-6 flex gap-2 overflow-x-auto pb-1">
                    {FILTERS.map((filter) => (
                        <button
                            key={filter.value}
                            type="button"
                            onClick={() => setActiveFilter(filter.value)}
                            className={`whitespace-nowrap rounded-full border px-4 py-2 text-sm font-semibold transition ${activeFilter === filter.value
                                    ? "border-white bg-white text-black"
                                    : "border-zinc-800 bg-zinc-950 text-zinc-300 hover:bg-zinc-900"
                                }`}
                        >
                            {filter.label}
                            <span className="ml-1 opacity-70">{counts[filter.value]}</span>
                        </button>
                    ))}
                </div>

                {visibleRequests.length === 0 ? (
                    <section className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-950 px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-300">
                            <Inbox size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">
                            {activeFilter === "all"
                                ? "No commission requests yet"
                                : `No ${getStatusLabel(
                                    activeFilter as CommissionStatus
                                )} requests`}
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                            When a client sends a request through your Hire Artist page, it
                            will appear here.
                        </p>

                        <Link
                            href="/commissions/manage"
                            className="mt-6 inline-flex items-center gap-2 rounded-full bg-white px-6 py-3 font-bold text-black hover:bg-zinc-200"
                        >
                            <Sparkles size={18} />
                            Manage commission plans
                        </Link>
                    </section>
                ) : (
                    <div className="space-y-5">
                        {visibleRequests.map((request) => {
                            const isUpdating = updatingRequestId === request.id;
                            const isOpeningChat = openingConversationForId === request.id;
                            const client = request.client;
                            const canMessage = canMessageForStatus(request.status);

                            const latestDelivery = request.deliveries[0];
                            const canDeliver = canSubmitDelivery(request, latestDelivery);

                            return (
                                <article
                                    key={request.id}
                                    className="overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950"
                                >
                                    <div className="flex flex-col gap-5 p-6 lg:flex-row lg:items-start lg:justify-between">
                                        <div className="min-w-0 flex-1">
                                            <div className="flex flex-wrap items-center gap-3">
                                                <span
                                                    className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusStyle(
                                                        request.status
                                                    )}`}
                                                >
                                                    {getStatusLabel(request.status)}
                                                </span>

                                                <span className="text-sm text-zinc-500">
                                                    Sent {formatCreatedAt(request.created_at)}
                                                </span>
                                            </div>

                                            <div className="mt-5 flex items-start gap-4">
                                                <Link
                                                    href={
                                                        client ? `/profile/${client.username}` : "/explore"
                                                    }
                                                    className="flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-lg font-bold"
                                                >
                                                    {client?.avatar_url ? (
                                                        <img
                                                            src={client.avatar_url}
                                                            alt={client.name}
                                                            className="h-full w-full object-cover"
                                                        />
                                                    ) : (
                                                        <span className="flex h-full w-full items-center justify-center">
                                                            {client?.name?.charAt(0).toUpperCase() || "C"}
                                                        </span>
                                                    )}
                                                </Link>

                                                <div className="min-w-0">
                                                    <p className="text-sm text-zinc-500">
                                                        Requested by
                                                    </p>

                                                    <Link
                                                        href={
                                                            client
                                                                ? `/profile/${client.username}`
                                                                : "/explore"
                                                        }
                                                        className="mt-1 inline-block text-lg font-bold hover:underline"
                                                    >
                                                        {client?.name || "Client"}
                                                    </Link>

                                                    {client?.username && (
                                                        <p className="text-sm text-zinc-400">
                                                            @{client.username}
                                                        </p>
                                                    )}
                                                </div>
                                            </div>

                                            <h2 className="mt-6 text-2xl font-bold">
                                                {request.project_title}
                                            </h2>

                                            <p className="mt-3 max-w-3xl whitespace-pre-wrap text-sm leading-7 text-zinc-300">
                                                {request.project_description}
                                            </p>

                                            {latestDelivery && (
                                                <div className="mt-6 rounded-3xl border border-zinc-800 bg-black/40 p-4">
                                                    <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                                                        <div className="min-w-0">
                                                            <div className="flex flex-wrap items-center gap-2">
                                                                <p className="text-sm font-bold text-white">
                                                                    Latest delivery
                                                                </p>

                                                                <span
                                                                    className={`rounded-full border px-2.5 py-1 text-[11px] font-bold uppercase tracking-wide ${getDeliveryStatusStyle(
                                                                        latestDelivery.status
                                                                    )}`}
                                                                >
                                                                    {getDeliveryStatusLabel(
                                                                        latestDelivery.status
                                                                    )}
                                                                </span>
                                                            </div>

                                                            <div className="mt-2 flex items-center gap-2 text-sm text-zinc-300">
                                                                <Paperclip
                                                                    size={15}
                                                                    className="shrink-0 text-purple-300"
                                                                />
                                                                <span className="truncate">
                                                                    {latestDelivery.file_name}
                                                                </span>
                                                                {latestDelivery.file_size && (
                                                                    <span className="shrink-0 text-zinc-500">
                                                                        · {formatFileSize(latestDelivery.file_size)}
                                                                    </span>
                                                                )}
                                                            </div>

                                                            {latestDelivery.delivery_message && (
                                                                <p className="mt-3 text-sm leading-6 text-zinc-400">
                                                                    {latestDelivery.delivery_message}
                                                                </p>
                                                            )}
                                                        </div>

                                                        <span className="text-xs text-zinc-500">
                                                            {formatCreatedAt(latestDelivery.created_at)}
                                                        </span>
                                                    </div>

                                                    {latestDelivery.status === "submitted" && (
                                                        <p className="mt-4 border-t border-zinc-800 pt-4 text-sm text-blue-200">
                                                            The client can now download the work, request a
                                                            revision, or approve the delivery.
                                                        </p>
                                                    )}

                                                    {latestDelivery.status === "revision_requested" && (
                                                        <div className="mt-4 border-t border-amber-500/20 pt-4">
                                                            <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                                                                Client revision request
                                                            </p>

                                                            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-100">
                                                                {latestDelivery.revision_message ||
                                                                    "The client requested a revision."}
                                                            </p>
                                                        </div>
                                                    )}

                                                    {latestDelivery.status === "approved" && (
                                                        <p className="mt-4 border-t border-emerald-500/20 pt-4 text-sm text-emerald-200">
                                                            The client approved this delivery. This commission
                                                            is complete.
                                                        </p>
                                                    )}

                                                    {request.deliveries.length > 1 && (
                                                        <p className="mt-3 text-xs text-zinc-500">
                                                            Delivery history: {request.deliveries.length}{" "}
                                                            files submitted
                                                        </p>
                                                    )}
                                                </div>
                                            )}
                                        </div>

                                        <div className="w-full shrink-0 lg:w-[270px]">
                                            <div className="rounded-3xl border border-purple-500/25 bg-purple-500/10 p-5">
                                                <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                                                    Selected package
                                                </p>

                                                <p className="mt-2 text-lg font-bold">
                                                    {request.plan_title || "Custom request"}
                                                </p>

                                                <p className="mt-1 text-xl font-bold text-purple-200">
                                                    {formatPrice(request.plan_price, request.currency)}
                                                </p>

                                                <div className="mt-5 space-y-3 text-sm text-zinc-300">
                                                    <div className="flex items-center gap-2">
                                                        <Clock3 size={16} className="text-purple-300" />
                                                        {request.delivery_days
                                                            ? `${request.delivery_days} day${request.delivery_days === 1 ? "" : "s"
                                                            } delivery`
                                                            : "Timeline discussed in chat"}
                                                    </div>

                                                    <div className="flex items-center gap-2">
                                                        <CalendarDays
                                                            size={16}
                                                            className="text-purple-300"
                                                        />
                                                        {request.deadline
                                                            ? `Preferred deadline: ${formatDate(
                                                                request.deadline
                                                            )}`
                                                            : "No preferred deadline"}
                                                    </div>
                                                </div>
                                            </div>

                                            <Link
                                                href={
                                                    client ? `/profile/${client.username}` : "/explore"
                                                }
                                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                                            >
                                                <UserRound size={16} />
                                                View client
                                            </Link>
                                        </div>
                                    </div>

                                    <div className="flex flex-col gap-3 border-t border-zinc-800 bg-zinc-950/80 px-6 py-4 sm:flex-row sm:items-center sm:justify-between">
                                        <div className="text-sm text-zinc-500">
                                            {request.status === "pending" &&
                                                "Review the brief, then accept or reject the request."}

                                            {request.status === "accepted" &&
                                                "Accepted. Start work or submit a delivery when it is ready."}

                                            {request.status === "in_progress" &&
                                                "This project is currently in progress."}

                                            {request.status === "completed" &&
                                                "The client approved the final delivery. This commission is complete."}

                                            {request.status === "rejected" &&
                                                "This request was rejected."}

                                            {request.status === "cancelled" &&
                                                "This request was cancelled."}
                                        </div>

                                        <div className="flex flex-wrap gap-2">
                                            {canMessage && (
                                                <button
                                                    type="button"
                                                    disabled={isOpeningChat}
                                                    onClick={() => void openConversation(request)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-purple-500/35 px-4 py-2.5 text-sm font-bold text-purple-200 transition hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                >
                                                    <MessageCircle size={16} />
                                                    {isOpeningChat ? "Opening chat..." : "Message client"}
                                                </button>
                                            )}

                                            {canDeliver && (
                                                <button
                                                    type="button"
                                                    onClick={() => setDeliveryRequest(request)}
                                                    className="inline-flex items-center justify-center gap-2 rounded-full border border-blue-500/35 px-4 py-2.5 text-sm font-bold text-blue-200 transition hover:bg-blue-500/10"
                                                >
                                                    <UploadCloud size={16} />
                                                    {latestDelivery?.status === "revision_requested"
                                                        ? "Upload revision"
                                                        : "Deliver work"}
                                                </button>
                                            )}

                                            {request.status === "pending" && (
                                                <>
                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            void updateRequestStatus(request, "rejected")
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 rounded-full border border-red-500/30 px-4 py-2.5 text-sm font-bold text-red-300 transition hover:bg-red-500/10 disabled:opacity-50"
                                                    >
                                                        <X size={16} />
                                                        Reject
                                                    </button>

                                                    <button
                                                        type="button"
                                                        disabled={isUpdating}
                                                        onClick={() =>
                                                            void updateRequestStatus(request, "accepted")
                                                        }
                                                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                                                    >
                                                        <Check size={16} />
                                                        Accept request
                                                    </button>
                                                </>
                                            )}

                                            {request.status === "accepted" && (
                                                <button
                                                    type="button"
                                                    disabled={isUpdating}
                                                    onClick={() =>
                                                        void updateRequestStatus(request, "in_progress")
                                                    }
                                                    className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-4 py-2.5 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                                                >
                                                    <FolderKanban size={16} />
                                                    Start work
                                                </button>
                                            )}

                                            {isUpdating && (
                                                <span className="inline-flex items-center px-3 text-sm text-zinc-400">
                                                    Saving...
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {deliveryRequest && (
                <DeliverWorkModal
                    request={deliveryRequest}
                    onClose={() => setDeliveryRequest(null)}
                    onDelivered={handleDeliverySubmitted}
                />
            )}
        </main>
    );
}

export default function CommissionInboxPage() {
    return (
        <RequireAuth>
            <CommissionInboxContent />
        </RequireAuth>
    );
}

