import Image from "next/image";

const previewArtworks = [
    {
        image: "/artworks/art1.jpg",
        title: "Cyber Samurai",
        artist: "Aman Arts",
    },
    {
        image: "/artworks/art2.jpg",
        title: "Ocean Dreams",
        artist: "Creative Soul",
    },
    {
        image: "/artworks/art3.jpg",
        title: "Dragon Fire",
        artist: "Pixel Master",
    },
];

export default function ArtPreview() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-24">
            <div className="mb-12 text-center">
                <h2 className="text-4xl font-bold text-white sm:text-5xl">
                    Discover Stunning Artwork
                </h2>

                <p className="mt-4 text-zinc-400">
                    Join thousands of artists sharing their creations.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
                {previewArtworks.map((artwork) => (
                    <article
                        key={artwork.title}
                        className="group overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
                    >
                        <div className="relative aspect-[4/5] overflow-hidden bg-zinc-900">
                            <Image
                                src={artwork.image}
                                alt={artwork.title}
                                fill
                                priority
                                sizes="(max-width: 768px) 100vw, 33vw"
                                className="object-cover transition duration-500 group-hover:scale-105"
                            />
                        </div>

                        <div className="p-5">
                            <h3 className="text-xl font-bold text-white">
                                {artwork.title}
                            </h3>

                            <p className="mt-1 text-sm text-zinc-400">
                                by {artwork.artist}
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        </section>
    );
}