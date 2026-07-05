import { FastifyInstance } from "fastify";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "./notification.service";

export async function notificationPlugin(fastify: FastifyInstance) {
  fastify.addHook("onRequest", authenticate);
  fastify.get("/", listNotifications);
  fastify.get("/unread", getUnreadCount);
  fastify.put("/:id/read", markAsRead);
  fastify.put("/read-all", markAllAsRead);
}
