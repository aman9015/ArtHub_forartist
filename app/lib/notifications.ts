import { createClient } from "@/app/lib/supabase";

type CreateNotificationParams = {
    userId: string;
    actorId: string;
    artworkId?: string | null;
    type: "like" | "comment" | "save" | "follow";
    message: string;
};

export async function createNotification({
    userId,
    actorId,
    artworkId = null,
    type,
    message,
}: CreateNotificationParams) {
    if (userId === actorId) return;

    const supabase = createClient();

    const { error } = await supabase.from("notifications").insert({
        user_id: userId,
        actor_id: actorId,
        artwork_id: artworkId,
        type,
        message,
    });

    if (error) {
        console.log("Notification error:", error.message);
    }
}