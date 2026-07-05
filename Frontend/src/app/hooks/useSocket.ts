import { useEffect, useRef, useCallback } from "react";
import { getAccessToken } from "../api/client";
import { useAppStore } from "../stores/appStore";

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempts = 0;
const MAX_RECONNECT = 10;
const BASE_DELAY = 1000;

function getWsUrl(): string {
  const token = getAccessToken();
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?token=${token}`;
}

function connect(onOpen?: () => void) {
  if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) return;

  ws = new WebSocket(getWsUrl());

  ws.onopen = () => {
    reconnectAttempts = 0;
    onOpen?.();
  };

  ws.onmessage = (event) => {
    try {
      const { event: eventName, data } = JSON.parse(event.data);
      handlers.forEach((h) => h(eventName, data));
    } catch {}
  };

  ws.onclose = () => {
    ws = null;
    scheduleReconnect();
  };

  ws.onerror = () => {
    ws?.close();
  };
}

function scheduleReconnect() {
  if (reconnectTimer) return;
  if (reconnectAttempts >= MAX_RECONNECT) return;
  const delay = BASE_DELAY * Math.pow(1.5, reconnectAttempts);
  reconnectAttempts++;
  reconnectTimer = setTimeout(() => {
    reconnectTimer = null;
    connect(lastJoinCallback);
  }, delay);
}

function send(event: string, data: any = {}) {
  if (ws?.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify({ event, data }));
  }
}

// Global handler list
type Handler = (event: string, data: any) => void;
const handlers = new Set<Handler>();
function addHandler(h: Handler) { handlers.add(h); }
function removeHandler(h: Handler) { handlers.delete(h); }

let lastJoinCallback: (() => void) | null = null;

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const addTask = useAppStore((s) => s.addTask);
  const updateTaskInState = useAppStore((s) => s.updateTaskInState);
  const removeTask = useAppStore((s) => s.removeTask);
  const loadUnreadCount = useAppStore((s) => s.loadUnreadCount);
  const addProject = useAppStore((s) => s.addProject);
  const updateProjectInState = useAppStore((s) => s.updateProjectInState);
  const removeProject = useAppStore((s) => s.removeProject);
  const refreshProject = useAppStore((s) => s.refreshProject);
  const addSprint = useAppStore((s) => s.addSprint);
  const updateSprintInState = useAppStore((s) => s.updateSprintInState);
  const removeSprint = useAppStore((s) => s.removeSprint);
  const loadProjects = useAppStore((s) => s.loadProjects);
  const addCommentToTask = useAppStore((s) => s.addCommentToTask);

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const onEvent = (event: string, data: any) => {
      switch (event) {
        case "task:created": addTask(data); break;
        case "task:updated": updateTaskInState(data); break;
        case "task:assigned": updateTaskInState(data.task); break;
        case "task:statusChanged": updateTaskInState(data.task); break;
        case "task:moved": updateTaskInState(data.task); break;
        case "task:deleted": removeTask(data.taskId); break;
        case "notification:new": loadUnreadCount(); break;
        case "project:created": addProject(data); loadProjects(); break;
        case "project:updated": updateProjectInState(data); break;
        case "project:deleted": removeProject(data.projectId); loadProjects(); break;
        case "project:memberAdded": refreshProject(data.projectId); break;
        case "project:memberRemoved": refreshProject(data.projectId); break;
        case "sprint:created": addSprint(data); break;
        case "sprint:updated": updateSprintInState(data); break;
        case "sprint:deleted": removeSprint(data.sprintId); break;
        case "comment:new": addCommentToTask(data.taskId, data.comment); break;
      }
    };

    addHandler(onEvent);

    const onOpen = () => {
      if (currentProjectIdRef.current) {
        send("join:project", { projectId: currentProjectIdRef.current });
      }
    };

    lastJoinCallback = onOpen;
    connect(onOpen);

    return () => {
      removeHandler(onEvent);
    };
  }, [addTask, updateTaskInState, removeTask, loadUnreadCount, addProject, updateProjectInState, removeProject, refreshProject, addSprint, updateSprintInState, removeSprint, loadProjects, addCommentToTask]);

  const joinProject = useCallback((projectId: string) => {
    currentProjectIdRef.current = projectId;
    send("join:project", { projectId });
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    send("leave:project", { projectId });
    if (currentProjectIdRef.current === projectId) {
      currentProjectIdRef.current = null;
    }
  }, []);

  const joinTask = useCallback((taskId: string) => {
    send("join:task", { taskId });
  }, []);

  const leaveTask = useCallback((taskId: string) => {
    send("leave:task", { taskId });
  }, []);

  return { socket: ws, joinProject, leaveProject, joinTask, leaveTask };
}
