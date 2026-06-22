"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/app/lib/supabase";

type Props = {
    children: ReactNode;
};

export default function RequireAuth({ children }: Props) {
    const router = useRouter();
    const supabase = createClient();

    const [checking, setChecking] = useState(true);

    useEffect(() => {
        async function checkUser() {
            const {
                data: { user },
            } = await supabase.auth.getUser();

            if (!user) {
                router.push("/login");
                return;
            }

            setChecking(false);
        }

        checkUser();
    }, [router, supabase]);

    if (checking) {
        return (
            <main className="flex min-h-screen items-center justify-center bg-black text-white">
                <div className="rounded-3xl border border-zinc-800 bg-zinc-950 p-8 text-center">
                    <p className="text-xl font-bold">Checking login...</p>
                    <p className="mt-2 text-zinc-400">Please wait</p>
                </div>
            </main>
        );
    }

    return <>{children}</>;
}