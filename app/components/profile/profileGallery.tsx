"use client";

import ArtworkCard from "@/app/components/ArtworkCard";

type Artwork = {
    id: string;
    title: string;
    artist: string;
    username: string;
    image: string;
    ownerId: string;
    avatarUrl: string | null;

    initialLikes: number;
    initialComments: number;
    initialReposts: number;
    initialSaves: number;

    initialLiked: boolean;
    initialSaved: boolean;
    initialReposted: boolean;
    initialFollowing: boolean;
};

type Props = {
    artworks: Artwork[];
    emptyMessage: string;
    viewerUserId: string | null;
    onDelete: (id: string) => void;
};

export default function ProfileGallery({
    artworks,
    emptyMessage,
    viewerUserId,
    onDelete,
}: Props) {
    if (artworks.length === 0) {
        return (
            <div className="mt-10 rounded-3xl border border-zinc-800 bg-zinc-950 p-12 text-center">
                <h2 className="text-xl font-bold">{emptyMessage}</h2>

                <p className="mt-2 text-zinc-500">
                    Your artworks will appear here.
                </p>
            </div>
        );
    }

    return (
        <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {artworks.map((artwork) => (
                <ArtworkCard
                    key={artwork.id}
                    variant="profile"
                    id={artwork.id}
                    image={artwork.image}
                    title={artwork.title}
                    artist={artwork.artist}
                    username={artwork.username}
                    ownerId={artwork.ownerId}
                    avatarUrl={artwork.avatarUrl}
                    viewerUserId={viewerUserId}
                    initialLikes={artwork.initialLikes}
                    initialComments={artwork.initialComments}
                    initialReposts={artwork.initialReposts}
                    initialSaves={artwork.initialSaves}
                    initialLiked={artwork.initialLiked}
                    initialSaved={artwork.initialSaved}
                    initialReposted={artwork.initialReposted}
                    initialFollowing={artwork.initialFollowing}
                    onDelete={onDelete}
                />
            ))}
        </div>
    );
}