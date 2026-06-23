import Link from "next/link";

export default function Navbar() {
    return (
        <nav className="w-full border-b border-zinc-800">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <h1 className="text-2xl font-bold">ArtHub</h1>

                <div className="hidden gap-8 md:flex">
                    <Link href="/explore">Explore</Link>
                    <a href="#">Artists</a>
                    <a href="#">Trending</a>
                </div>

                <Link
                    href="/login"
                    className="rounded-lg bg-white px-4 py-2 text-black transition hover:bg-zinc-200"
                >
                    Join
                </Link>
            </div>
        </nav>
    );
}