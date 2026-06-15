import { Request, Response, NextFunction } from "express";
import { prisma } from "../../config/database";

export async function listNotifications(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const notifications = await prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: "desc" },
      take: 50,
    });
    res.json(notifications);
  } catch (error) {
    next(error);
  }
}

export async function markAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const id = req.params.id as string;
    await prisma.notification.update({
      where: { id },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function markAllAsRead(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    await prisma.notification.updateMany({
      where: { userId, read: false },
      data: { read: true },
    });
    res.json({ success: true });
  } catch (error) {
    next(error);
  }
}

export async function getUnreadCount(req: Request, res: Response, next: NextFunction) {
  try {
    const userId = req.userId!;
    const count = await prisma.notification.count({
      where: { userId, read: false },
    });
    res.json({ count });
  } catch (error) {
    next(error);
  }
}
