import { useEffect, useRef, useCallback } from "react";
import { io, Socket } from "socket.io-client";
import { getAccessToken } from "../api/client";
import { useAppStore } from "../stores/appStore";

const WS_URL = import.meta.env.VITE_WS_URL || "http://localhost:3000";

let socket: Socket | null = null;

export function useSocket() {
  const socketRef = useRef<Socket | null>(null);
  const addTask = useAppStore((s) => s.addTask);
  const updateTaskInState = useAppStore((s) => s.updateTaskInState);
  const removeTask = useAppStore((s) => s.removeTask);
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    if (!socket) {
      socket = io(WS_URL, {
        auth: { token },
        transports: ["websocket", "polling"],
      });

      socket.on("connect", () => {
        console.log("✓ WebSocket connected");
      });

      socket.on("disconnect", () => {
        console.log("✗ WebSocket disconnected");
      });
    }

    const onTaskCreated = (task: any) => addTask(task);
    const onTaskUpdated = (task: any) => updateTaskInState(task);
    const onTaskAssigned = ({ task }: any) => updateTaskInState(task);
    const onTaskStatusChanged = ({ task }: any) => updateTaskInState(task);
    const onTaskMoved = ({ task }: any) => updateTaskInState(task);
    const onTaskDeleted = ({ taskId }: any) => removeTask(taskId);
    const onNotificationNew = () => loadUnreadCount();

    socket.on("task:created", onTaskCreated);
    socket.on("task:updated", onTaskUpdated);
    socket.on("task:assigned", onTaskAssigned);
    socket.on("task:statusChanged", onTaskStatusChanged);
    socket.on("task:moved", onTaskMoved);
    socket.on("task:deleted", onTaskDeleted);
    socket.on("notification:new", onNotificationNew);

    socketRef.current = socket;

    return () => {
      if (socket) {
        socket.off("task:created", onTaskCreated);
        socket.off("task:updated", onTaskUpdated);
        socket.off("task:assigned", onTaskAssigned);
        socket.off("task:statusChanged", onTaskStatusChanged);
        socket.off("task:moved", onTaskMoved);
        socket.off("task:deleted", onTaskDeleted);
        socket.off("notification:new", onNotificationNew);
      }
    };
  }, [addTask, updateTaskInState, removeTask, loadUnreadCount]);

  const joinProject = useCallback((projectId: string) => {
    socket?.emit("join:project", projectId);
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    socket?.emit("leave:project", projectId);
  }, []);

  const joinTask = useCallback((taskId: string) => {
    socket?.emit("join:task", taskId);
  }, []);

  const leaveTask = useCallback((taskId: string) => {
    socket?.emit("leave:task", taskId);
  }, []);

  return { socket: socketRef.current, joinProject, leaveProject, joinTask, leaveTask };
}
