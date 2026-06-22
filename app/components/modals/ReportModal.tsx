"use client";

import { useMemo, useState } from "react";
import { AlertTriangle, Flag, X } from "lucide-react";
import { createClient } from "@/app/lib/supabase";

type ReportTargetType = "user" | "artwork" | "comment";

type Props = {
    targetType: ReportTargetType;
    targetId: string | number;
    targetLabel: string;
    onClose: () => void;
};

const reportReasons = [
    "Harassment or bullying",
    "Hate or abusive content",
    "Spam or scam",
    "Copyright or stolen artwork",
    "Nudity or sexual content",
    "Violence or self-harm",
    "Other",
];

export default function ReportModal({
    targetType,
    targetId,
    targetLabel,
    onClose,
}: Props) {
    const supabase = useMemo(() => createClient(), []);

    const [reason, setReason] = useState(reportReasons[0]);
    const [details, setDetails] = useState("");
    const [submitting, setSubmitting] = useState(false);
    const [submitted, setSubmitted] = useState(false);
    const [errorMessage, setErrorMessage] = useState("");

    const targetText =
        targetType === "user"
            ? "profile"
            : targetType === "artwork"
            ? "artwork"
            : "comment";

    async function handleSubmit() {
        setErrorMessage("");

        const {
            data: { user },
        } = await supabase.auth.getUser();

        if (!user) {
            setErrorMessage("Please log in before submitting a report.");
            return;
        }

        setSubmitting(true);

        const reportData: {
            reporter_id: string;
            target_type: ReportTargetType;
            target_user_id?: string;
            target_artwork_id?: string;
            target_comment_id?: number;
            reason: string;
            details: string | null;
        } = {
            reporter_id: user.id,
            target_type: targetType,
            reason,
            details: details.trim() || null,
        };

        if (targetType === "user") {
            reportData.target_user_id = String(targetId);
        }

        if (targetType === "artwork") {
            reportData.target_artwork_id = String(targetId);
        }

        if (targetType === "comment") {
            reportData.target_comment_id = Number(targetId);
        }

        const { error } = await supabase.from("reports").insert(reportData);

        setSubmitting(false);

        if (error) {
            if (error.code === "23505") {
                setErrorMessage("You have already reported this item.");
                return;
            }

            setErrorMessage(error.message);
            return;
        }

        setSubmitted(true);

        window.setTimeout(() => {
            onClose();
        }, 1300);
    }

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
            <section className="w-full max-w-md rounded-3xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl">
                <div className="flex items-start justify-between gap-4">
                    <div className="flex gap-3">
                        <div className="rounded-2xl bg-red-500/10 p-3 text-red-400">
                            <Flag size={22} />
                        </div>

                        <div>
                            <h2 className="text-xl font-bold">Report {targetText}</h2>
                            <p className="mt-1 text-sm text-zinc-400">
                                Reports are private and reviewed later.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={onClose}
                        disabled={submitting}
                        className="rounded-full p-2 text-zinc-400 transition hover:bg-zinc-900 hover:text-white"
                        aria-label="Close report form"
                    >
                        <X size={20} />
                    </button>
                </div>

                {submitted ? (
                    <div className="mt-6 rounded-2xl border border-green-900/50 bg-green-950/30 p-5 text-center">
                        <AlertTriangle
                            size={24}
                            className="mx-auto text-green-400"
                        />
                        <p className="mt-3 font-semibold text-green-300">
                            Report submitted
                        </p>
                        <p className="mt-1 text-sm text-zinc-400">
                            Thank you for helping keep ArtHub safe.
                        </p>
                    </div>
                ) : (
                    <>
                        <div className="mt-6 rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
                            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-zinc-500">
                                Reporting
                            </p>
                            <p className="mt-1 truncate font-semibold">{targetLabel}</p>
                        </div>

                        <label className="mt-5 block text-sm font-semibold">
                            Why are you reporting this?
                        </label>

                        <select
                            value={reason}
                            onChange={(event) => setReason(event.target.value)}
                            className="mt-2 w-full rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none"
                        >
                            {reportReasons.map((reportReason) => (
                                <option key={reportReason} value={reportReason}>
                                    {reportReason}
                                </option>
                            ))}
                        </select>

                        <label className="mt-5 block text-sm font-semibold">
                            Additional details{" "}
                            <span className="font-normal text-zinc-500">
                                (optional)
                            </span>
                        </label>

                        <textarea
                            value={details}
                            onChange={(event) => setDetails(event.target.value)}
                            maxLength={1000}
                            rows={4}
                            placeholder="Add context that may help us review this report..."
                            className="mt-2 w-full resize-none rounded-2xl border border-zinc-800 bg-zinc-900 px-4 py-3 text-sm outline-none placeholder:text-zinc-600"
                        />

                        {errorMessage && (
                            <p className="mt-3 text-sm text-red-400">{errorMessage}</p>
                        )}

                        <div className="mt-6 flex justify-end gap-3">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={submitting}
                                className="rounded-full border border-zinc-700 px-5 py-3 text-sm font-semibold transition hover:bg-zinc-900 disabled:opacity-50"
                            >
                                Cancel
                            </button>

                            <button
                                type="button"
                                onClick={() => void handleSubmit()}
                                disabled={submitting}
                                className="rounded-full bg-red-500 px-5 py-3 text-sm font-semibold text-white transition hover:bg-red-400 disabled:opacity-60"
                            >
                                {submitting ? "Submitting..." : "Submit Report"}
                            </button>
                        </div>
                    </>
                )}
            </section>
        </div>
    );
}