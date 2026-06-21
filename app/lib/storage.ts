export type ArtHubNotification = {
  id: number;
  type: "like" | "follow" | "bookmark" | "comment" | "upload" | "delete";
  user: string;
  message: string;
  artwork: string;
  time: string;
};

export const getStorage = <T>(key: string, fallback: T): T => {
  if (typeof window === "undefined") return fallback;

  const data = localStorage.getItem(key);
  return data ? JSON.parse(data) : fallback;
};

export const setStorage = <T>(key: string, value: T) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
};

export const toggleItem = (key: string, id: string | number) => {
  const items = getStorage<(string | number)[]>(key, []);

  if (items.includes(id)) {
    const updated = items.filter((item) => item !== id);
    setStorage(key, updated);
    return updated;
  }

  const updated = [...items, id];
  setStorage(key, updated);
  return updated;
};

export const addNotification = (
  notification: Omit<ArtHubNotification, "id" | "time">
) => {
  const oldNotifications = getStorage<ArtHubNotification[]>(
    "arthub_notifications",
    []
  );

  const newNotification: ArtHubNotification = {
    id: Date.now(),
    time: "Just now",
    ...notification,
  };

  setStorage("arthub_notifications", [
    newNotification,
    ...oldNotifications,
  ]);
};