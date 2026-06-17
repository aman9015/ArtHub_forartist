import Image from "next/image";

type Artwork = {
    id: number;
    title: string;
    image: string;
};

type Props = {
    artworks: Artwork[];
    emptyMessage: string;
};

export default function profileGallery({ artworks, emptyMessage }: Props) {
    if (artworks.length === 0) {
        return (
            <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                <h2 className="text-xl font-bold">{emptyMessage}</h2>
                <p className="mt-2 text-zinc-500">Your artworks will appear here.</p>
            </div>
        );
    }

    return (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
                <div
                    key={artwork.id}
                    className="overflow-hidden rounded-3xl border border-zinc-800 bg-zinc-950"
                >
                    <div className="relative h-[350px]">
                        <Image
                            src={artwork.image}
                            alt={artwork.title}
                            fill
                            sizes="(max-width:768px) 100vw, 33vw"
                            className="object-cover"
                        />
                    </div>

                    <div className="p-4">
                        <h2 className="font-bold">{artwork.title}</h2>
                    </div>
                </div>
            ))}
        </div>
    );
}