// 1. Import your new component at the very top
import ArtworkCard from "./ArtworkCard";

export default function ArtPreview() {
    return (
        <section className="mx-auto max-w-7xl px-6 py-24">

            <div className="mb-12 text-center">
                <h2 className="text-5xl font-bold">
                    Discover Stunning Artwork
                </h2>
                <p className="mt-4 text-zinc-400">
                    Join thousands of artists sharing their creations.
                </p>
            </div>

            {/* 2. Feed your data into the ArtworkCard component */}
            <div className="grid gap-6 md:grid-cols-3">

                <ArtworkCard
                    image="/artworks/art1.jpg"
                    title="Cyber Samurai"
                    artist="Aman Arts"
                />

                <ArtworkCard
                    image="/artworks/art2.jpg"
                    title="Ocean Dreams"
                    artist="Creative Soul"
                />

                <ArtworkCard
                    image="/artworks/art3.jpg"
                    title="Dragon Fire"
                    artist="Pixel Master"
                />

            </div>

        </section>
    );
}