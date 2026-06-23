"use client";

import {
    type ReactNode,
    useCallback,
    useEffect,
    useMemo,
    useRef,
    useState,
} from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

type Props = {
    children: ReactNode;
};

type AuthState = "unknown" | "authenticated" | "unauthenticated";

/*
  This cache survives page navigation while the browser tab stays open.

  First protected page:
  - checks the saved Supabase session once.

  Later protected pages:
  - immediately render because the session is already known.
*/
let cachedAuthState: AuthState = "unknown";
let pendingAuthCheck: Promise<AuthState> | null = null;

async function getCachedAuthState(): Promise<AuthState> {
    if (cachedAuthState === "authenticated") {
        return "authenticated";
    }

    if (pendingAuthCheck) {
        return pendingAuthCheck;
    }

    const supabase = createClient();

    pendingAuthCheck = supabase.auth
        .getSession()
        .then(({ data, error }) => {
            cachedAuthState =
                !error && data.session
                    ? "authenticated"
                    : "unauthenticated";

            return cachedAuthState;
        })
        .catch(() => {
            cachedAuthState = "unauthenticated";
            return cachedAuthState;
        })
        .finally(() => {
            pendingAuthCheck = null;
        });

    return pendingAuthCheck;
}

export default function RequireAuth({ children }: Props) {
    const router = useRouter();
    const supabase = useMemo(() => createClient(), []);

    const [checking, setChecking] = useState(
        () => cachedAuthState !== "authenticated"
    );

    const hasRedirectedRef = useRef(false);

    const redirectToLogin = useCallback(() => {
        if (hasRedirectedRef.current) return;

        hasRedirectedRef.current = true;
        router.replace("/login");
    }, [router]);

    useEffect(() => {
        let cancelled = false;

        const {
            data: { subscription },
        } = supabase.auth.onAuthStateChange((_event, session) => {
            cachedAuthState = session
                ? "authenticated"
                : "unauthenticated";

            if (!session) {
                if (!cancelled) {
                    setChecking(true);
                    redirectToLogin();
                }

                return;
            }

            if (!cancelled) {
                hasRedirectedRef.current = false;
                setChecking(false);
            }
        });

        async function checkSession() {
            if (cachedAuthState === "authenticated") {
                if (!cancelled) {
                    setChecking(false);
                }

                return;
            }

            const nextAuthState = await getCachedAuthState();

            if (cancelled) return;

            if (nextAuthState === "authenticated") {
                hasRedirectedRef.current = false;
                setChecking(false);
                return;
            }

            redirectToLogin();
        }

        void checkSession();

        return () => {
            cancelled = true;
            subscription.unsubscribe();
        };
    }, [redirectToLogin, supabase]);

    /*
      This should only appear once after a full refresh,
      not every time the user opens Trending, Messages, or Profile.
    */
    if (checking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <p className="text-xl font-bold">Opening ArtHub...</p>
                    <p className="mt-2 text-zinc-400">
                        Preparing your creative space.
                    </p>
                </div>
            </main>
        );
    }

    return <>{children}</>;
}