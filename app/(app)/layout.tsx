"use client";

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { usePathname, useRouter } from "next/navigation";

import RequireAuth from "@/app/auth/RequireAuth";
import Sidebar from "@/app/components/layout/Sidebar";
import MobileNav from "@/app/components/layout/MobileNav";
import UploadModal from "@/app/components/layout/UploadModel";
import { addNotification } from "@/app/lib/storage";
import { createClient } from "@/app/lib/supabase";

const FEED_UPDATE_CHECK_INTERVAL_MS = 45_000;

type AppLayoutProps = {
    children: ReactNode;
};

type LatestFeedRow = {
    id: string;
    created_at: string;
};

export default function ProtectedAppLayout({
    children,
}: AppLayoutProps) {
    const supabase = useMemo(() => createClient(), []);
    const pathname = usePathname();
    const router = useRouter();

    const [isUploadOpen, setIsUploadOpen] = useState(false);
    const [hasNewFeed, setHasNewFeed] = useState(false);

    const lastSeenFeedVersionRef = useRef<string | null>(null);
    const feedVersionPromiseRef = useRef<Promise<string | null> | null>(
        null
    );

    const fetchFeedVersion = useCallback((): Promise<string | null> => {
        if (feedVersionPromiseRef.current) {
            return feedVersionPromiseRef.current;
        }

        const request = (async (): Promise<string | null> => {
            try {
                const [artworksResult, repostsResult] = await Promise.all([
                    supabase
                        .from("artworks")
                        .select("id, created_at")
                        .order("created_at", { ascending: false })
                        .limit(1),

                    supabase
                        .from("reposts")
                        .select("id, created_at")
                        .order("created_at", { ascending: false })
                        .limit(1),
                ]);

                if (artworksResult.error || repostsResult.error) {
                    console.log(
                        artworksResult.error?.message ||
                        repostsResult.error?.message ||
                        "Could not check feed updates."
                    );

                    return null;
                }

                const latestArtwork = (artworksResult.data || [])[0] as
                    | LatestFeedRow
                    | undefined;

                const latestRepost = (repostsResult.data || [])[0] as
                    | LatestFeedRow
                    | undefined;

                const artworkVersion = latestArtwork
                    ? `${latestArtwork.id}-${latestArtwork.created_at}`
                    : "no-artworks";

                const repostVersion = latestRepost
                    ? `${latestRepost.id}-${latestRepost.created_at}`
                    : "no-reposts";

                return `${artworkVersion}|${repostVersion}`;
            } catch (error) {
                console.log("Could not check feed updates.", error);
                return null;
            }
        })();

        feedVersionPromiseRef.current = request;

        void request.finally(() => {
            if (feedVersionPromiseRef.current === request) {
                feedVersionPromiseRef.current = null;
            }
        });

        return request;
    }, [supabase]);

    const checkForFeedUpdates = useCallback(async () => {
        const latestVersion = await fetchFeedVersion();

        if (!latestVersion) return;

        if (lastSeenFeedVersionRef.current === null) {
            lastSeenFeedVersionRef.current = latestVersion;
            return;
        }

        // While already on Explore, treat the latest version as seen.
        if (pathname === "/explore") {
            lastSeenFeedVersionRef.current = latestVersion;
            setHasNewFeed(false);
            return;
        }

        if (lastSeenFeedVersionRef.current !== latestVersion) {
            setHasNewFeed(true);
        }
    }, [fetchFeedVersion, pathname]);

    const markFeedAsSeen = useCallback(async () => {
        const latestVersion = await fetchFeedVersion();

        if (latestVersion) {
            lastSeenFeedVersionRef.current = latestVersion;
        }

        setHasNewFeed(false);
    }, [fetchFeedVersion]);

    useEffect(() => {
        void checkForFeedUpdates();

        // No repeating feed checks while the user is already browsing Explore.
        if (pathname === "/explore") {
            return;
        }

        function handleVisibilityChange() {
            if (document.visibilityState === "visible") {
                void checkForFeedUpdates();
            }
        }

        const interval = window.setInterval(() => {
            if (document.visibilityState === "visible") {
                void checkForFeedUpdates();
            }
        }, FEED_UPDATE_CHECK_INTERVAL_MS);

        document.addEventListener("visibilitychange", handleVisibilityChange);

        return () => {
            window.clearInterval(interval);
            document.removeEventListener(
                "visibilitychange",
                handleVisibilityChange
            );
        };
    }, [checkForFeedUpdates, pathname]);

    useEffect(() => {
        function openGlobalUpload() {
            setIsUploadOpen(true);
        }

        function handleFeedRefreshed() {
            void markFeedAsSeen();
        }

        function markFeedAsNew() {
            setHasNewFeed(true);
        }

        window.addEventListener("arthub:open-upload", openGlobalUpload);
        window.addEventListener("arthub:feed-refreshed", handleFeedRefreshed);
        window.addEventListener("arthub:artwork-created", markFeedAsNew);
        window.addEventListener("arthub:repost-changed", markFeedAsNew);

        return () => {
            window.removeEventListener("arthub:open-upload", openGlobalUpload);
            window.removeEventListener(
                "arthub:feed-refreshed",
                handleFeedRefreshed
            );
            window.removeEventListener("arthub:artwork-created", markFeedAsNew);
            window.removeEventListener("arthub:repost-changed", markFeedAsNew);
        };
    }, [markFeedAsSeen]);

    function handleArtworkCreated() {
        addNotification({
            type: "upload",
            user: "You",
            message: "uploaded a new artwork",
            artwork: "New artwork",
        });

        window.dispatchEvent(new Event("arthub:artwork-created"));
        setIsUploadOpen(false);
    }

    function handleExploreClick() {
        if (pathname === "/explore") {
            window.dispatchEvent(new Event("arthub:refresh-feed"));
            return;
        }

        router.push("/explore");
    }

    return (
        <RequireAuth>
            <div className="arthub-app-root">
                <div className="arthub-app-shell">
                    <aside className="arthub-app-sidebar">
                        <Sidebar
                            onUploadClick={() => setIsUploadOpen(true)}
                            hasNewFeed={hasNewFeed}
                            onExploreClick={handleExploreClick}
                        />
                    </aside>

                    <main className="arthub-app-content">{children}</main>
                </div>

                <div className="arthub-mobile-navigation">
                    <MobileNav
                        onUploadClick={() => setIsUploadOpen(true)}
                        hasNewFeed={hasNewFeed}
                        onExploreClick={handleExploreClick}
                    />
                </div>

                {isUploadOpen && (
                    <UploadModal
                        onClose={() => setIsUploadOpen(false)}
                        onCreateArtwork={handleArtworkCreated}
                    />
                )}
            </div>
        </RequireAuth>
    );
}