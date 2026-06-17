import { Compass, Flame, Home, Send } from "lucide-react";

type SidebarProps = {
  onUploadClick: () => void;
};

export default function Sidebar({ onUploadClick }: SidebarProps) {
  return (
    <aside className="sticky top-6 flex h-[90vh] flex-col items-center justify-between">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-gradient-to-br from-purple-500 to-pink-500 text-2xl font-bold">
        A
      </div>

      <nav className="flex w-[180px] flex-col gap-4 rounded-[2rem] border border-zinc-800 bg-zinc-950 p-5">
        <button className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900">
          <Home size={22} />
          Home
        </button>

        <button className="flex items-center gap-3 rounded-2xl bg-zinc-800 px-4 py-3">
          <Compass size={22} />
          Explore
        </button>

        <button className="flex items-center gap-3 rounded-2xl px-4 py-3 hover:bg-zinc-900">
          <Flame size={22} />
          Trending
        </button>
      </nav>

      <button
        onClick={onUploadClick}
        className="flex h-16 w-16 items-center justify-center rounded-full bg-white text-black transition hover:scale-105"
      >
        <Send size={26} />
      </button>

      <p className="-mt-5 text-sm font-semibold text-zinc-300">Upload</p>
    </aside>
  );
}