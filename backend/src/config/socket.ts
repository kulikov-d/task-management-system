import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import { env } from "./env";
import { verifyAccessToken } from "../modules/auth/auth.service";

let io: Server;

export function initSocket(server: HttpServer): Server {
  const allowedOrigins = env.FRONTEND_URL.split(",").map((s) => s.trim());

  io = new Server(server, {
    cors: {
      origin: allowedOrigins,
      credentials: true,
    },
    transports: ["websocket", "polling"],
  });

  io.use(async (socket: Socket, next) => {
    try {
      const token =
        socket.handshake.auth?.token ||
        socket.handshake.headers?.authorization?.replace("Bearer ", "");

      if (!token) {
        return next(new Error("Authentication required"));
      }

      const payload = verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).userRole = payload.role;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`✓ User connected: ${userId}`);

    socket.join(`user:${userId}`);

    socket.on("join:project", (projectId: string) => {
      socket.join(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit("user:joined", { userId });
    });

    socket.on("leave:project", (projectId: string) => {
      socket.leave(`project:${projectId}`);
      socket.to(`project:${projectId}`).emit("user:left", { userId });
    });

    socket.on("join:task", (taskId: string) => {
      socket.join(`task:${taskId}`);
    });

    socket.on("leave:task", (taskId: string) => {
      socket.leave(`task:${taskId}`);
    });

    socket.on("disconnect", () => {
      console.log(`✗ User disconnected: ${userId}`);
    });
  });

  console.log("✓ Socket.IO initialized");
  return io;
}

export function getIO(): Server {
  if (!io) {
    throw new Error("Socket.IO not initialized");
  }
  return io;
}

export function emitToProject(projectId: string, event: string, data: any) {
  io?.to(`project:${projectId}`).emit(event, data);
}

export function emitToTask(taskId: string, event: string, data: any) {
  io?.to(`task:${taskId}`).emit(event, data);
}

export function emitToUser(userId: string, event: string, data: any) {
  io?.to(`user:${userId}`).emit(event, data);
}
