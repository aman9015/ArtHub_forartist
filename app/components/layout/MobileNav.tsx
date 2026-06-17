import { Compass, Home, Palette, User } from "lucide-react";

type MobileNavProps = {
  onUploadClick: () => void;
};

export default function MobileNav({ onUploadClick }: MobileNavProps) {
  return (
    <nav className="fixed bottom-4 left-1/2 z-[80] flex w-[92%] max-w-md -translate-x-1/2 items-center justify-between rounded-3xl border border-zinc-800 bg-zinc-950/95 px-6 py-4 backdrop-blur lg:hidden">
      <button type="button" className="flex flex-col items-center gap-1 text-xs text-zinc-400">
        <Home size={22} />
        Home
      </button>

      <button type="button" className="flex flex-col items-center gap-1 text-xs text-white">
        <Compass size={22} />
        Explore
      </button>

      <button
        type="button"
        onClick={onUploadClick}
        className="relative z-[90] flex flex-col items-center gap-1 text-xs text-zinc-400"
      >
        <Palette size={22} />
        Upload
      </button>

      <button type="button" className="flex flex-col items-center gap-1 text-xs text-zinc-400">
        <User size={22} />
        Profile
      </button>
    </nav>
  );
}