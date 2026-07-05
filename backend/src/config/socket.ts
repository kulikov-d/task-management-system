import { Server as HttpServer } from "http";
import { WebSocketServer, WebSocket } from "ws";
import { URL } from "url";
import { verifyAccessToken } from "../modules/auth/auth.service";

let wss: WebSocketServer;

const rooms = new Map<string, Set<WebSocket>>();

function joinRoom(ws: WebSocket, roomId: string) {
  if (!rooms.has(roomId)) rooms.set(roomId, new Set());
  rooms.get(roomId)!.add(ws);
}

function leaveRoom(ws: WebSocket, roomId: string) {
  const room = rooms.get(roomId);
  if (room) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  }
}

function leaveAllRooms(ws: WebSocket) {
  for (const [roomId, room] of rooms) {
    room.delete(ws);
    if (room.size === 0) rooms.delete(roomId);
  }
}

function sendTo(ws: WebSocket, event: string, data: any) {
  if (ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
  }
}

function broadcastToRoom(roomId: string, event: string, data: any, exclude?: WebSocket) {
  const room = rooms.get(roomId);
  if (!room) return;
  for (const ws of room) {
    if (ws !== exclude && ws.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify({ event, data }));
    }
  }
}

function getUserIdFromWs(ws: WebSocket): string | undefined {
  return (ws as any).userId;
}

export function initSocket(server: HttpServer): WebSocketServer {
  wss = new WebSocketServer({ server, path: "/ws" });

  wss.on("upgrade", async (request, socket, head) => {
    try {
      const url = new URL(request.url || "/", `http://${request.headers.host}`);
      const token = url.searchParams.get("token");

      if (!token) {
        socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
        socket.destroy();
        return;
      }

      const payload = await verifyAccessToken(token);
      (socket as any).userId = payload.userId;
      (socket as any).userRole = payload.role;

      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } catch {
      socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
      socket.destroy();
    }
  });

  wss.on("connection", (ws: WebSocket) => {
    const userId = (ws as any).userId as string;
    console.log(`✓ User connected: ${userId}`);

    joinRoom(ws, `user:${userId}`);
    joinRoom(ws, "projects:global");

    ws.on("message", (raw: Buffer) => {
      try {
        const msg = JSON.parse(raw.toString());
        const { event, data } = msg;

        if (event === "join:project") {
          joinRoom(ws, `project:${data.projectId}`);
          console.log(`✓ User ${userId} joined project:${data.projectId}`);
          broadcastToRoom(`project:${data.projectId}`, "user:joined", { userId }, ws);
        } else if (event === "leave:project") {
          broadcastToRoom(`project:${data.projectId}`, "user:left", { userId }, ws);
          leaveRoom(ws, `project:${data.projectId}`);
        } else if (event === "join:task") {
          joinRoom(ws, `task:${data.taskId}`);
        } else if (event === "leave:task") {
          leaveRoom(ws, `task:${data.taskId}`);
        }
      } catch {}
    });

    ws.on("close", () => {
      leaveAllRooms(ws);
      console.log(`✗ User disconnected: ${userId}`);
    });
  });

  console.log("✓ WebSocket (ws) initialized");
  return wss;
}

export function emitToProject(projectId: string, event: string, data: any) {
  const roomSize = rooms.get(`project:${projectId}`)?.size || 0;
  console.log(`→ Emitting "${event}" to project:${projectId} (${roomSize} listeners)`);
  broadcastToRoom(`project:${projectId}`, event, data);
}

export function emitToTask(taskId: string, event: string, data: any) {
  broadcastToRoom(`task:${taskId}`, event, data);
}

export function emitToUser(userId: string, event: string, data: any) {
  broadcastToRoom(`user:${userId}`, event, data);
}

export function emitToAll(event: string, data: any) {
  broadcastToRoom("projects:global", event, data);
}
