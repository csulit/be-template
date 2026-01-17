import type { AuthenticatedSocket } from "../../types.js";
import {
  SubscribeChannelSchema,
  UnsubscribeChannelSchema,
  MarkReadSchema,
} from "./notifications.events.js";

export const handleSubscribeChannel = async (
  socket: AuthenticatedSocket,
  data: unknown,
  callback?: (response: { success: boolean }) => void
): Promise<void> => {
  const parsed = SubscribeChannelSchema.safeParse(data);

  if (!parsed.success) {
    socket.emit("error", {
      message: "Invalid channel data",
      code: "VALIDATION_ERROR",
    });
    callback?.({ success: false });
    return;
  }

  const { channel } = parsed.data;
  const userId = socket.data.user.id;

  // Validate user can access this channel (e.g., user-specific channels)
  const userChannel = `user:${userId}`;
  const allowedChannels = [userChannel, "broadcast"];

  if (!allowedChannels.includes(channel) && !channel.startsWith(`user:${userId}:`)) {
    socket.emit("error", {
      message: "Access denied to channel",
      code: "FORBIDDEN",
    });
    callback?.({ success: false });
    return;
  }

  await socket.join(channel);
  console.log(`Socket joined channel: socketId=${socket.id}, userId=${userId}, channel=${channel}`);

  callback?.({ success: true });
};

export const handleUnsubscribeChannel = async (
  socket: AuthenticatedSocket,
  data: unknown
): Promise<void> => {
  const parsed = UnsubscribeChannelSchema.safeParse(data);

  if (!parsed.success) {
    socket.emit("error", {
      message: "Invalid channel data",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  const { channel } = parsed.data;
  await socket.leave(channel);

  console.log(
    `Socket left channel: socketId=${socket.id}, userId=${socket.data.user.id}, channel=${channel}`
  );
};

export const handleMarkRead = async (socket: AuthenticatedSocket, data: unknown): Promise<void> => {
  const parsed = MarkReadSchema.safeParse(data);

  if (!parsed.success) {
    socket.emit("error", {
      message: "Invalid notification data",
      code: "VALIDATION_ERROR",
    });
    return;
  }

  // TODO: Call notification service to mark as read
  // await notificationService.markRead(parsed.data.notificationId, socket.data.user.id);

  console.log(
    `Notification marked as read: notificationId=${parsed.data.notificationId}, userId=${socket.data.user.id}`
  );
};
