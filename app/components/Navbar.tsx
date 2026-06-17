export default function Navbar() {
    return (
        <nav className="w-full border-b border-zinc-800">
            <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
                <h1 className="text-2xl font-bold">ArtHub</h1>

                <div className="hidden md:flex gap-8">
                    <a href="/explore">Explore</a>
                    <a href="#">Artists</a>
                    <a href="#">Trending</a>
                </div>

                <button className="rounded-lg bg-white px-4 py-2 text-black">
                    Join
                </button>
            </div>
        </nav>
    );
}