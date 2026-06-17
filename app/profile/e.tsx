import { artworks } from "@/data/artwork";
import Image from "next/image";
import { notFound } from "next/navigation";

type Props = {
    params: {
        username: string;
    };
};

export default function ProfilePage({ params }: Props) {
    const artist = artworks.find(
        (art) => art.username === params.username
    );

    if (!artist) {
        notFound();
    }

    const artistWorks = artworks.filter(
        (art) => art.username === params.username
    );

    return (
        <main className="min-h-screen bg-black text-white">
            <div className="h-64 bg-gradient-to-r from-purple-600 to-pink-600" />

            <div className="mx-auto max-w-6xl px-6">
                <div className="-mt-16 flex flex-col items-center md:flex-row md:items-end md:justify-between">
                    <div className="flex flex-col items-center md:flex-row md:gap-6">
                        <div className="flex h-32 w-32 items-center justify-center rounded-full border-4 border-black bg-zinc-800 text-4xl font-bold">
                            {artist.artist.charAt(0)}
                        </div>

                        <div className="mt-4 text-center md:text-left">
                            <h1 className="text-4xl font-bold">
                                {artist.artist}
                            </h1>

                            <p className="mt-2 text-zinc-400">
                                @{artist.username}
                            </p>

                            <p className="mt-3 text-zinc-300">
                                {artist.bio}
                            </p>
                        </div>
                    </div>

                    <button className="mt-6 rounded-full bg-white px-6 py-3 font-semibold text-black hover:bg-zinc-200 md:mt-0">
                        Follow
                    </button>
                </div>

                <div className="mt-8 flex gap-8 border-b border-zinc-800 pb-6">
                    <div>
                        <p className="text-2xl font-bold">
                            {artistWorks.length}
                        </p>
                        <p className="text-zinc-400">Artworks</p>
                    </div>

                    <div>
                        <p className="text-2xl font-bold">2.4k</p>
                        <p className="text-zinc-400">Followers</p>
                    </div>

                    <div>
                        <p className="text-2xl font-bold">312</p>
                        <p className="text-zinc-400">Following</p>
                    </div>
                </div>

                <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                    {artistWorks.map((artwork) => (
                        <div
                            key={artwork.id}
                            className="overflow-hidden rounded-3xl border border-zinc-800"
                        >
                            <div className="relative h-[350px]">
                                <Image
                                    src={artwork.image}
                                    alt={artwork.title}
                                    fill
                                    className="object-cover"
                                />
                            </div>

                            <div className="p-4">
                                <h2 className="font-bold">
                                    {artwork.title}
                                </h2>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </main>
    );
}