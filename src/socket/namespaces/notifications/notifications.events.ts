import { z } from "zod";

// Client -> Server events
export const SubscribeChannelSchema = z.object({
  channel: z.string().min(1).max(100),
});
export type SubscribeChannelData = z.infer<typeof SubscribeChannelSchema>;

export const UnsubscribeChannelSchema = z.object({
  channel: z.string().min(1).max(100),
});
export type UnsubscribeChannelData = z.infer<typeof UnsubscribeChannelSchema>;

export const MarkReadSchema = z.object({
  notificationId: z.string().uuid(),
});
export type MarkReadData = z.infer<typeof MarkReadSchema>;

// Server -> Client events
export const NotificationSchema = z.object({
  id: z.string().uuid(),
  type: z.enum(["info", "success", "warning", "error"]),
  title: z.string(),
  message: z.string(),
  createdAt: z.string().datetime(),
  read: z.boolean(),
});
export type NotificationData = z.infer<typeof NotificationSchema>;

export const ErrorEventSchema = z.object({
  message: z.string(),
  code: z.string().optional(),
});
export type ErrorEventData = z.infer<typeof ErrorEventSchema>;

// Event map for type safety
export interface ClientToServerEvents {
  "subscribe:channel": (
    data: SubscribeChannelData,
    callback?: (response: { success: boolean }) => void
  ) => void;
  "unsubscribe:channel": (data: UnsubscribeChannelData) => void;
  "mark:read": (data: MarkReadData) => void;
}

export interface ServerToClientEvents {
  "notification:new": (data: NotificationData) => void;
  "notification:updated": (data: NotificationData) => void;
  error: (data: ErrorEventData) => void;
}
