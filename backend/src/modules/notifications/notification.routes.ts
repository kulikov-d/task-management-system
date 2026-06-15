import { Router } from "express";
import { authenticate } from "../../common/guards/auth.guard";
import {
  listNotifications,
  markAsRead,
  markAllAsRead,
  getUnreadCount,
} from "./notification.service";

const router = Router();

router.use(authenticate);

router.get("/", listNotifications);
router.get("/unread", getUnreadCount);
router.put("/:id/read", markAsRead);
router.put("/read-all", markAllAsRead);

export { router as notificationRouter };
