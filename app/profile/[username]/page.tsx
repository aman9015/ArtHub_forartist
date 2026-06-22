import ProfilePageClient from "./ProfilePageClient";

type Props = {
    params: Promise<{
        username: string;
    }>;
};

export default async function ProfilePage({ params }: Props) {
    const { username } = await params;

    return <ProfilePageClient username={username} />;
}