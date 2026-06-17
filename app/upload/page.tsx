"use client";

import { useState } from "react";
import Feed from "../components/layout/Feed";
import Sidebar from "../components/layout/Sidebar";
import MobileNav from "../components/layout/MobileNav";
import Trending from "../components/layout/Trending";
import UploadModal from "../components/layout/UploadModel";

export default function HomePage() {
  const [isUploadOpen, setIsUploadOpen] = useState(false);

  return (
    <main className="min-h-screen bg-black px-4 py-6 text-white">
      <div className={isUploadOpen ? "blur-sm" : ""}>
        <div className="mx-auto grid max-w-7xl grid-cols-1 gap-6 lg:grid-cols-[220px_1fr_300px]">
          <div className="hidden lg:block">
            <Sidebar onUploadClick={() => setIsUploadOpen(true)} />
          </div>

          <Feed onUploadClick={() => setIsUploadOpen(true)} />

          <div className="hidden lg:block">
            <Trending />
          </div>
        </div>

        <MobileNav onUploadClick={() => setIsUploadOpen(true)} />
      </div>

      {isUploadOpen && (
        <UploadModal onClose={() => setIsUploadOpen(false)} />
      )}
    </main>
  );
}