import { prisma } from "../../config/database";
import { emitToUser } from "../../config/socket";

export async function createAndEmitNotification(data: {
  type: string;
  title: string;
  message: string;
  userId: string;
  taskId?: string;
}): Promise<void> {
  const notification = await prisma.notification.create({
    data: {
      type: data.type,
      title: data.title,
      message: data.message,
      userId: data.userId,
      taskId: data.taskId,
    },
  });

  emitToUser(data.userId, "notification:new", notification);
}
