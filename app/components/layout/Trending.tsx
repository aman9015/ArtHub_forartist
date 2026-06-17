const topArtists = [
    {
        name: "Maya Chen",
        username: "@mayasketch",
        followers: "12.4k",
        initial: "M",
    },
    {
        name: "Leo Arts",
        username: "@leoarts",
        followers: "8.9k",
        initial: "L",
    },
    {
        name: "Pixel Master",
        username: "@pixelmaster",
        followers: "6.2k",
        initial: "P",
    },
];

const tags = ["anime", "digitalart", "fantasy", "cyberpunk", "illustration"];

export default function Trending() {
    return (
        <aside className="sticky top-6 h-fit space-y-6">
            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h2 className="text-xl font-bold">Top Artists</h2>

                <div className="mt-5 space-y-4">
                    {topArtists.map((artist) => (
                        <div
                            key={artist.username}
                            className="flex items-center justify-between gap-3"
                        >
                            <div className="flex items-center gap-3">
                                <div className="flex h-11 w-11 items-center justify-center rounded-full bg-zinc-800 font-bold">
                                    {artist.initial}
                                </div>

                                <div>
                                    <p className="font-semibold">{artist.name}</p>
                                    <p className="text-sm text-zinc-400">{artist.username}</p>
                                </div>
                            </div>

                            <button className="rounded-full bg-white px-3 py-1 text-sm font-semibold text-black">
                                Follow
                            </button>
                        </div>
                    ))}
                </div>
            </section>

            <section className="rounded-3xl border border-zinc-800 bg-zinc-950 p-6">
                <h2 className="text-xl font-bold">Trending Tags</h2>

                <div className="mt-5 flex flex-wrap gap-2">
                    {tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full bg-zinc-900 px-4 py-2 text-sm text-zinc-300"
                        >
                            #{tag}
                        </span>
                    ))}
                </div>
            </section>
        </aside>
    );
}