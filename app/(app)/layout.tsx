
"use client";

import { type ReactNode, useEffect, useState } from "react";

import RequireAuth from "@/app/auth/RequireAuth";
import Sidebar from "@/app/components/layout/Sidebar";
import MobileNav from "@/app/components/layout/MobileNav";
import UploadModal from "@/app/components/layout/UploadModel";
import { addNotification } from "@/app/lib/storage";

type AppLayoutProps = {
  children: ReactNode;
};

export default function ProtectedAppLayout({
  children,
}: AppLayoutProps) {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  useEffect(() => {
    function openGlobalUpload() {
      setIsUploadOpen(true);
    }

    window.addEventListener("arthub:open-upload", openGlobalUpload);

    return () => {
      window.removeEventListener("arthub:open-upload", openGlobalUpload);
    };
  }, []);

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

  return (
    <RequireAuth>
      <div className="min-h-screen bg-black text-white">
        <div className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-6 pb-28 md:px-6 lg:flex-row lg:pb-6">
          <aside className="hidden w-56 shrink-0 lg:block">
            <Sidebar onUploadClick={() => setIsUploadOpen(true)} />
          </aside>

          <main className="min-w-0 flex-1">{children}</main>
        </div>

        <div className="lg:hidden">
          <MobileNav onUploadClick={() => setIsUploadOpen(true)} />
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

