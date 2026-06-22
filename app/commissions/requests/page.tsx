
"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
    type FormEvent,
    useCallback,
    useEffect,
    useMemo,
    useState,
} from "react";
import {
    ArrowLeft,
    CalendarDays,
    CheckCircle2,
    Clock3,
    Download,
    Eye,
    FileText,
    FileUp,
    MessageCircle,
    Paperclip,
    Sparkles,
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

type CommissionRequest = {
    id: string;
    artist_id: string;
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

type Artist = {
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

type RequestWithArtist = CommissionRequest & {
    artist: Artist | null;
    deliveries: CommissionDelivery[];
};

function formatPrice(price: number | string | null, currency: string) {
    if (price === null || price === undefined) {
        return "Price unavailable";
    }

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

function formatRequestedDate(dateValue: string) {
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

function isImageFile(delivery: CommissionDelivery) {
    return (
        delivery.file_type?.startsWith("image/") ||
        /\.(png|jpe?g|webp|gif)$/i.test(delivery.file_name)
    );
}

function isPdfFile(delivery: CommissionDelivery) {
    return (
        delivery.file_type === "application/pdf" ||
        /\.pdf$/i.test(delivery.file_name)
    );
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

function getStatusMessage(status: CommissionStatus) {
    const messages: Record<CommissionStatus, string> = {
        pending: "Waiting for the artist to review your request.",
        accepted:
            "The artist accepted your request. You can now discuss the commission details.",
        rejected: "The artist declined this commission request.",
        in_progress: "The artist has started working on your commission.",
        completed:
            "You approved the final delivery. This commission is now complete.",
        cancelled: "This commission request was cancelled.",
    };

    return messages[status];
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
        submitted: "Awaiting your review",
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

function DeliveryPreviewModal({
    delivery,
    signedUrl,
    onClose,
    onDownload,
}: {
    delivery: CommissionDelivery;
    signedUrl: string;
    onClose: () => void;
    onDownload: () => Promise<void>;
}) {
    const [downloading, setDownloading] = useState(false);

    async function handleDownload() {
        setDownloading(true);

        try {
            await onDownload();
        } finally {
            setDownloading(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="max-h-[calc(100vh-2rem)] w-full max-w-4xl overflow-y-auto rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5 shadow-2xl shadow-black/70 sm:p-6">
                <div className="flex items-start justify-between gap-5">
                    <div className="min-w-0">
                        <p className="text-sm font-semibold text-purple-300">
                            Commission delivery
                        </p>

                        <h2 className="mt-1 truncate text-xl font-bold sm:text-2xl">
                            {delivery.file_name}
                        </h2>

                        <p className="mt-2 text-sm text-zinc-400">
                            {delivery.file_type || "File"}
                            {delivery.file_size ? ` · ${formatFileSize(delivery.file_size)}` : ""}
                        </p>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-zinc-800 p-2.5 text-zinc-300 transition hover:bg-zinc-900"
                        aria-label="Close preview"
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="mt-6 overflow-hidden rounded-3xl border border-zinc-800 bg-black">
                    {isImageFile(delivery) ? (
                        <img
                            src={signedUrl}
                            alt={delivery.file_name}
                            className="mx-auto max-h-[60vh] w-auto max-w-full object-contain"
                        />
                    ) : isPdfFile(delivery) ? (
                        <iframe
                            src={signedUrl}
                            title={delivery.file_name}
                            className="h-[60vh] w-full"
                        />
                    ) : (
                        <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                            <FileText size={38} className="text-purple-300" />
                            <p className="mt-4 font-bold">Preview is unavailable for this file type.</p>
                            <p className="mt-2 text-sm text-zinc-400">
                                Download the file to open it in the correct application.
                            </p>
                        </div>
                    )}
                </div>

                {delivery.delivery_message && (
                    <div className="mt-5 rounded-2xl border border-zinc-800 bg-black/40 p-4">
                        <p className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                            Artist note
                        </p>
                        <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-zinc-300">
                            {delivery.delivery_message}
                        </p>
                    </div>
                )}

                <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                    <button
                        type="button"
                        onClick={onClose}
                        className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900"
                    >
                        Close
                    </button>

                    <button
                        type="button"
                        disabled={downloading}
                        onClick={() => void handleDownload()}
                        className="inline-flex items-center justify-center gap-2 rounded-full bg-white px-5 py-3 text-sm font-bold text-black transition hover:bg-zinc-200 disabled:opacity-50"
                    >
                        <Download size={17} />
                        {downloading ? "Preparing..." : "Download file"}
                    </button>
                </div>
            </div>
        </div>
    );
}

function RevisionModal({
    delivery,
    onClose,
    onSubmit,
}: {
    delivery: CommissionDelivery;
    onClose: () => void;
    onSubmit: (message: string) => Promise<void>;
}) {
    const [message, setMessage] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    async function handleSubmit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();

        if (!message.trim()) {
            setErrorMessage("Describe the changes you need from the artist.");
            return;
        }

        setSubmitting(true);
        setErrorMessage("");

        try {
            await onSubmit(message.trim());
            onClose();
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not request a revision."
            );
        } finally {
            setSubmitting(false);
        }
    }

    return (
        <div className="fixed inset-0 z-[210] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <div className="w-full max-w-xl rounded-[2rem] border border-zinc-800 bg-zinc-950 p-6 shadow-2xl shadow-black/70 sm:p-7">
                <div className="flex items-start justify-between gap-5">
                    <div>
                        <p className="text-sm font-semibold text-amber-300">
                            Request revision
                        </p>
                        <h2 className="mt-1 text-2xl font-bold">Tell the artist what to adjust</h2>
                        <p className="mt-2 text-sm leading-6 text-zinc-400">
                            Be specific so the revision is easier to complete.
                        </p>
                    </div>

                    <button
                        type="button"
                        disabled={submitting}
                        onClick={onClose}
                        className="rounded-full border border-zinc-800 p-2.5 text-zinc-300 transition hover:bg-zinc-900 disabled:opacity-50"
                        aria-label="Close revision modal"
                    >
                        <X size={19} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-6">
                    <textarea
                        value={message}
                        onChange={(event) => setMessage(event.target.value)}
                        rows={6}
                        placeholder="Example: The composition looks great. Please make the background slightly warmer and add more detail around the character's eyes."
                        className="w-full resize-none rounded-2xl border border-zinc-800 bg-black px-4 py-3 text-sm text-white outline-none transition placeholder:text-zinc-600 focus:border-amber-400"
                    />

                    {errorMessage && (
                        <div className="mt-4 rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                            {errorMessage}
                        </div>
                    )}

                    <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                        <button
                            type="button"
                            disabled={submitting}
                            onClick={onClose}
                            className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-50"
                        >
                            Cancel
                        </button>

                        <button
                            type="submit"
                            disabled={submitting}
                            className="inline-flex items-center justify-center gap-2 rounded-full bg-amber-300 px-5 py-3 text-sm font-bold text-black transition hover:bg-amber-200 disabled:opacity-50"
                        >
                            <FileUp size={17} />
                            {submitting ? "Sending..." : "Send revision request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function MyCommissionRequestsContent() {
    const supabase = useMemo(() => createClient(), []);
    const router = useRouter();

    const [requests, setRequests] = useState<RequestWithArtist[]>([]);
    const [loading, setLoading] = useState(true);
    const [errorMessage, setErrorMessage] = useState("");
    const [notice, setNotice] = useState("");
    const [openingConversationForId, setOpeningConversationForId] = useState<
        string | null
    >(null);
    const [openingDeliveryId, setOpeningDeliveryId] = useState<string | null>(
        null
    );
    const [selectedDelivery, setSelectedDelivery] =
        useState<CommissionDelivery | null>(null);
    const [selectedDeliveryUrl, setSelectedDeliveryUrl] = useState("");
    const [revisionDelivery, setRevisionDelivery] =
        useState<CommissionDelivery | null>(null);
    const [approvingDeliveryId, setApprovingDeliveryId] = useState<string | null>(
        null
    );

    const loadRequests = useCallback(async () => {
        setLoading(true);
        setErrorMessage("");

        try {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) return;

            const { data: requestsData, error: requestsError } = await supabase
                .from("commission_requests")
                .select(
                    "id, artist_id, plan_title, plan_price, currency, delivery_days, project_title, project_description, deadline, status, created_at"
                )
                .eq("client_id", user.id)
                .order("created_at", { ascending: false });

            if (requestsError) throw requestsError;

            const commissionRequests = (requestsData || []) as CommissionRequest[];

            const artistIds = [
                ...new Set(commissionRequests.map((request) => request.artist_id)),
            ];

            const requestIds = commissionRequests.map((request) => request.id);

            let artists: Artist[] = [];
            let deliveries: CommissionDelivery[] = [];

            if (artistIds.length > 0) {
                const { data: artistsData, error: artistsError } = await supabase
                    .from("profiles")
                    .select("id, name, username, avatar_url")
                    .in("id", artistIds);

                if (artistsError) throw artistsError;

                artists = (artistsData || []) as Artist[];
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

            const artistsById = new Map(
                artists.map((artist) => [artist.id, artist])
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

            setRequests(
                commissionRequests.map((request) => ({
                    ...request,
                    artist: artistsById.get(request.artist_id) || null,
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
        void loadRequests();
    }, [loadRequests]);

    async function getDeliveryUrl(delivery: CommissionDelivery) {
        const { data, error } = await supabase.storage
            .from("commission-deliveries")
            .createSignedUrl(delivery.file_path, 60 * 60);

        if (error || !data?.signedUrl) {
            throw error || new Error("Could not access this delivery file.");
        }

        return data.signedUrl;
    }

    async function openConversation(request: RequestWithArtist) {
        setOpeningConversationForId(request.id);
        setErrorMessage("");

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
                    `and(user_one.eq.${user.id},user_two.eq.${request.artist_id}),and(user_one.eq.${request.artist_id},user_two.eq.${user.id})`
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

    async function previewDelivery(delivery: CommissionDelivery) {
        setOpeningDeliveryId(delivery.id);
        setErrorMessage("");

        try {
            const signedUrl = await getDeliveryUrl(delivery);
            setSelectedDelivery(delivery);
            setSelectedDeliveryUrl(signedUrl);
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not open the delivery file."
            );
        } finally {
            setOpeningDeliveryId(null);
        }
    }

    async function downloadDelivery(
        delivery: CommissionDelivery,
        existingUrl?: string
    ) {
        const signedUrl = existingUrl || (await getDeliveryUrl(delivery));

        try {
            const response = await fetch(signedUrl);

            if (!response.ok) {
                throw new Error("Could not download this file.");
            }

            const blob = await response.blob();
            const objectUrl = URL.createObjectURL(blob);

            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = delivery.file_name;
            document.body.appendChild(link);
            link.click();
            link.remove();

            URL.revokeObjectURL(objectUrl);
        } catch {
            window.open(signedUrl, "_blank", "noopener,noreferrer");
        }
    }

    async function requestRevision(message: string) {
        if (!revisionDelivery) return;

        const { error } = await supabase.rpc("request_commission_revision", {
            p_delivery_id: revisionDelivery.id,
            p_message: message,
        });

        if (error) throw error;

        await loadRequests();
        setNotice("Revision request sent. The artist has been notified.");
    }

    async function approveDelivery(delivery: CommissionDelivery) {
        const confirmed = window.confirm(
            "Approve this delivery? This will mark the commission as completed."
        );

        if (!confirmed) return;

        setApprovingDeliveryId(delivery.id);
        setErrorMessage("");
        setNotice("");

        try {
            const { error } = await supabase.rpc("approve_commission_delivery", {
                p_delivery_id: delivery.id,
            });

            if (error) throw error;

            await loadRequests();
            setNotice("Delivery approved. This commission is now complete.");
        } catch (error) {
            setErrorMessage(
                error instanceof Error
                    ? error.message
                    : "Could not approve this delivery."
            );
        } finally {
            setApprovingDeliveryId(null);
        }
    }

    if (loading) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black px-4 text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 px-8 py-7">
                    Loading your commission requests...
                </div>
            </main>
        );
    }

    return (
        <main className="min-h-screen bg-black px-4 py-6 text-white sm:px-6">
            <section className="mx-auto w-full max-w-5xl">
                <header className="mb-8 flex items-center gap-4">
                    <Link
                        href="/explore"
                        className="rounded-full border border-zinc-800 p-3 transition hover:bg-zinc-900"
                        aria-label="Back to explore"
                    >
                        <ArrowLeft size={19} />
                    </Link>

                    <div>
                        <p className="text-sm font-semibold text-purple-300">
                            ArtHub Commissions
                        </p>

                        <h1 className="text-3xl font-bold sm:text-4xl">My Requests</h1>

                        <p className="mt-1 text-sm text-zinc-400">
                            Follow the progress of commissions you have requested.
                        </p>
                    </div>
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

                {requests.length === 0 ? (
                    <section className="rounded-[2rem] border border-dashed border-zinc-700 bg-zinc-950 px-6 py-16 text-center">
                        <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-3xl bg-purple-500/15 text-purple-300">
                            <Sparkles size={28} />
                        </div>

                        <h2 className="mt-5 text-2xl font-bold">
                            No commission requests yet
                        </h2>

                        <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-zinc-400">
                            Find an artist whose commissions are open and send them your
                            project details.
                        </p>

                        <Link
                            href="/trending"
                            className="mt-6 inline-flex rounded-full bg-white px-6 py-3 font-bold text-black transition hover:bg-zinc-200"
                        >
                            Discover artists
                        </Link>
                    </section>
                ) : (
                    <div className="space-y-6">
                        {requests.map((request) => {
                            const artist = request.artist;
                            const artistLink = artist
                                ? `/profile/${artist.username}`
                                : "/explore";

                            const canMessage = canMessageForStatus(request.status);
                            const isOpeningChat = openingConversationForId === request.id;
                            const latestDelivery = request.deliveries[0];

                            return (
                                <article
                                    id={request.id}
                                    key={request.id}
                                    className="scroll-mt-6 overflow-hidden rounded-[2rem] border border-zinc-800 bg-zinc-950"
                                >
                                    <div className="p-5 sm:p-6">
                                        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-zinc-800 pb-5">
                                            <span
                                                className={`rounded-full border px-3 py-1 text-xs font-bold uppercase tracking-wide ${getStatusStyle(
                                                    request.status
                                                )}`}
                                            >
                                                {getStatusLabel(request.status)}
                                            </span>

                                            <p className="text-sm text-zinc-500">
                                                Requested {formatRequestedDate(request.created_at)}
                                            </p>
                                        </div>

                                        <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_300px]">
                                            <div className="min-w-0">
                                                <Link
                                                    href={artistLink}
                                                    className="inline-flex items-center gap-4 rounded-2xl transition hover:bg-zinc-900"
                                                >
                                                    <div className="flex h-14 w-14 shrink-0 overflow-hidden rounded-full bg-gradient-to-br from-purple-500 to-pink-500">
                                                        {artist?.avatar_url ? (
                                                            <img
                                                                src={artist.avatar_url}
                                                                alt={artist.name}
                                                                className="h-full w-full object-cover"
                                                            />
                                                        ) : (
                                                            <span className="flex h-full w-full items-center justify-center text-lg font-bold">
                                                                {artist?.name?.charAt(0).toUpperCase() || "A"}
                                                            </span>
                                                        )}
                                                    </div>

                                                    <div className="min-w-0">
                                                        <p className="text-xs font-medium uppercase tracking-wide text-zinc-500">
                                                            Artist
                                                        </p>

                                                        <p className="truncate text-lg font-bold">
                                                            {artist?.name || "Artist"}
                                                        </p>

                                                        {artist?.username && (
                                                            <p className="truncate text-sm text-zinc-400">
                                                                @{artist.username}
                                                            </p>
                                                        )}
                                                    </div>
                                                </Link>

                                                <div className="mt-7">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">
                                                        Your project
                                                    </p>

                                                    <h2 className="mt-2 break-words text-2xl font-bold">
                                                        {request.project_title}
                                                    </h2>

                                                    <p className="mt-3 whitespace-pre-wrap break-words text-sm leading-7 text-zinc-300">
                                                        {request.project_description ||
                                                            "No additional project description was added."}
                                                    </p>
                                                </div>

                                                {latestDelivery && (
                                                    <div className="mt-7 rounded-3xl border border-zinc-800 bg-black/40 p-4 sm:p-5">
                                                        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                                                            <div className="min-w-0">
                                                                <div className="flex flex-wrap items-center gap-2">
                                                                    <p className="font-bold text-white">
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

                                                                <div className="mt-3 flex items-center gap-2 text-sm text-zinc-200">
                                                                    <Paperclip
                                                                        size={16}
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
                                                                    <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-zinc-400">
                                                                        {latestDelivery.delivery_message}
                                                                    </p>
                                                                )}
                                                            </div>

                                                            <span className="shrink-0 text-xs text-zinc-500">
                                                                Delivered{" "}
                                                                {formatRequestedDate(latestDelivery.created_at)}
                                                            </span>
                                                        </div>

                                                        <div className="mt-5 flex flex-wrap gap-2">
                                                            <button
                                                                type="button"
                                                                disabled={openingDeliveryId === latestDelivery.id}
                                                                onClick={() =>
                                                                    void previewDelivery(latestDelivery)
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900 disabled:opacity-50"
                                                            >
                                                                <Eye size={16} />
                                                                {openingDeliveryId === latestDelivery.id
                                                                    ? "Opening..."
                                                                    : "Preview"}
                                                            </button>

                                                            <button
                                                                type="button"
                                                                onClick={() =>
                                                                    void downloadDelivery(latestDelivery)
                                                                }
                                                                className="inline-flex items-center gap-2 rounded-full border border-zinc-700 px-4 py-2.5 text-sm font-bold text-zinc-200 transition hover:bg-zinc-900"
                                                            >
                                                                <Download size={16} />
                                                                Download
                                                            </button>

                                                            {latestDelivery.status === "submitted" && (
                                                                <>
                                                                    <button
                                                                        type="button"
                                                                        onClick={() =>
                                                                            setRevisionDelivery(latestDelivery)
                                                                        }
                                                                        className="inline-flex items-center gap-2 rounded-full border border-amber-500/35 px-4 py-2.5 text-sm font-bold text-amber-200 transition hover:bg-amber-500/10"
                                                                    >
                                                                        <FileUp size={16} />
                                                                        Request revision
                                                                    </button>

                                                                    <button
                                                                        type="button"
                                                                        disabled={approvingDeliveryId === latestDelivery.id}
                                                                        onClick={() => void approveDelivery(latestDelivery)}
                                                                        style={{
                                                                            backgroundColor: "#34d399",
                                                                            color: "#000000",
                                                                        }}
                                                                        className="inline-flex items-center gap-2 rounded-full border border-emerald-300 px-4 py-2.5 text-sm font-bold shadow-lg shadow-emerald-500/20 transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-50"
                                                                    >
                                                                        <CheckCircle2 size={16} />
                                                                        {approvingDeliveryId === latestDelivery.id
                                                                            ? "Approving..."
                                                                            : "Approve delivery"}
                                                                    </button>
                                                                </>
                                                            )}
                                                        </div>

                                                        {latestDelivery.status ===
                                                            "revision_requested" && (
                                                                <div className="mt-5 border-t border-amber-500/20 pt-4">
                                                                    <p className="text-xs font-bold uppercase tracking-wider text-amber-300">
                                                                        Your revision request
                                                                    </p>

                                                                    <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-amber-100">
                                                                        {latestDelivery.revision_message ||
                                                                            "Revision requested from the artist."}
                                                                    </p>
                                                                </div>
                                                            )}

                                                        {latestDelivery.status === "approved" && (
                                                            <div className="mt-5 border-t border-emerald-500/20 pt-4 text-sm text-emerald-200">
                                                                You approved this delivery
                                                                {latestDelivery.approved_at
                                                                    ? ` on ${formatRequestedDate(
                                                                        latestDelivery.approved_at
                                                                    )}`
                                                                    : ""}
                                                                .
                                                            </div>
                                                        )}

                                                        {request.deliveries.length > 1 && (
                                                            <details className="mt-5 border-t border-zinc-800 pt-4">
                                                                <summary className="cursor-pointer text-sm font-semibold text-zinc-400 transition hover:text-white">
                                                                    View delivery history ({request.deliveries.length})
                                                                </summary>

                                                                <div className="mt-3 space-y-2">
                                                                    {request.deliveries.slice(1).map((delivery) => (
                                                                        <button
                                                                            key={delivery.id}
                                                                            type="button"
                                                                            onClick={() =>
                                                                                void previewDelivery(delivery)
                                                                            }
                                                                            className="flex w-full items-center justify-between gap-4 rounded-2xl border border-zinc-800 px-4 py-3 text-left text-sm transition hover:bg-zinc-900"
                                                                        >
                                                                            <span className="flex min-w-0 items-center gap-2">
                                                                                <Paperclip
                                                                                    size={15}
                                                                                    className="shrink-0 text-purple-300"
                                                                                />
                                                                                <span className="truncate">
                                                                                    {delivery.file_name}
                                                                                </span>
                                                                            </span>

                                                                            <span className="shrink-0 text-xs text-zinc-500">
                                                                                {formatRequestedDate(delivery.created_at)}
                                                                            </span>
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </details>
                                                        )}
                                                    </div>
                                                )}
                                            </div>

                                            <aside className="min-w-0">
                                                <div className="rounded-3xl border border-purple-500/25 bg-purple-500/10 p-5">
                                                    <p className="text-xs font-semibold uppercase tracking-wider text-purple-300">
                                                        Chosen package
                                                    </p>

                                                    <p className="mt-2 break-words text-lg font-bold">
                                                        {request.plan_title || "Custom request"}
                                                    </p>

                                                    <p className="mt-1 text-2xl font-bold text-purple-200">
                                                        {formatPrice(request.plan_price, request.currency)}
                                                    </p>

                                                    <div className="mt-5 space-y-4 border-t border-purple-400/15 pt-5 text-sm text-zinc-200">
                                                        <div className="flex items-start gap-3">
                                                            <Clock3
                                                                size={17}
                                                                className="mt-0.5 shrink-0 text-purple-300"
                                                            />

                                                            <span>
                                                                {request.delivery_days
                                                                    ? `${request.delivery_days} day${request.delivery_days === 1 ? "" : "s"
                                                                    } delivery`
                                                                    : "Timeline discussed with artist"}
                                                            </span>
                                                        </div>

                                                        <div className="flex items-start gap-3">
                                                            <CalendarDays
                                                                size={17}
                                                                className="mt-0.5 shrink-0 text-purple-300"
                                                            />

                                                            <span>
                                                                {request.deadline
                                                                    ? `Deadline: ${formatDate(request.deadline)}`
                                                                    : "No preferred deadline"}
                                                            </span>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="mt-3 space-y-3">
                                                    {artist && (
                                                        <Link
                                                            href={artistLink}
                                                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-zinc-700 px-4 py-3 text-sm font-semibold transition hover:bg-zinc-900"
                                                        >
                                                            <FileText size={16} />
                                                            View artist
                                                        </Link>
                                                    )}

                                                    {canMessage && (
                                                        <button
                                                            type="button"
                                                            disabled={isOpeningChat}
                                                            onClick={() => void openConversation(request)}
                                                            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-purple-500/35 px-4 py-3 text-sm font-semibold text-purple-200 transition hover:bg-purple-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                                                        >
                                                            <MessageCircle size={16} />
                                                            {isOpeningChat
                                                                ? "Opening chat..."
                                                                : "Message artist"}
                                                        </button>
                                                    )}
                                                </div>
                                            </aside>
                                        </div>
                                    </div>

                                    <div className="flex items-center gap-3 border-t border-zinc-800 bg-zinc-900/30 px-5 py-4 text-sm text-zinc-300 sm:px-6">
                                        <CheckCircle2
                                            size={18}
                                            className="shrink-0 text-purple-300"
                                        />

                                        <p>{getStatusMessage(request.status)}</p>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}
            </section>

            {selectedDelivery && selectedDeliveryUrl && (
                <DeliveryPreviewModal
                    delivery={selectedDelivery}
                    signedUrl={selectedDeliveryUrl}
                    onClose={() => {
                        setSelectedDelivery(null);
                        setSelectedDeliveryUrl("");
                    }}
                    onDownload={() =>
                        downloadDelivery(selectedDelivery, selectedDeliveryUrl)
                    }
                />
            )}

            {revisionDelivery && (
                <RevisionModal
                    delivery={revisionDelivery}
                    onClose={() => setRevisionDelivery(null)}
                    onSubmit={requestRevision}
                />
            )}
        </main>
    );
}

export default function MyCommissionRequestsPage() {
    return (
        <RequireAuth>
            <MyCommissionRequestsContent />
        </RequireAuth>
    );
}

