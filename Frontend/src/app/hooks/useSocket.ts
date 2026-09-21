import { useEffect, useRef, useCallback } from "react";
import { getAccessToken } from "../api/client";
import { useAppStore } from "../stores/appStore";

function getWsUrl(): string {
  const token = getAccessToken();
  const proto = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${proto}//${window.location.host}/ws?token=${token}`;
}

export function useSocket() {
  const socketRef = useRef<WebSocket | null>(null);
  const currentProjectIdRef = useRef<string | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const reconnectAttemptsRef = useRef(0);
  const MAX_RECONNECT = 10;
  const BASE_DELAY = 1000;

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
  const loadTeams = useAppStore((s) => s.loadTeams);
  const addTeam = useAppStore((s) => s.addTeam);
  const updateTeamInState = useAppStore((s) => s.updateTeamInState);
  const removeTeam = useAppStore((s) => s.removeTeam);
  const updateTeamMemberInState = useAppStore((s) => s.updateTeamMemberInState);
  const removeTeamMemberInState = useAppStore((s) => s.removeTeamMemberInState);
  const updateTeamProjectInState = useAppStore((s) => s.updateTeamProjectInState);
  const removeTeamProjectInState = useAppStore((s) => s.removeTeamProjectInState);

  const storeRef = useRef({
    addTask, updateTaskInState, removeTask, loadUnreadCount,
    addProject, updateProjectInState, removeProject, refreshProject,
    addSprint, updateSprintInState, removeSprint, loadProjects,
    addCommentToTask, loadTeams, addTeam, updateTeamInState, removeTeam,
    updateTeamMemberInState, removeTeamMemberInState,
    updateTeamProjectInState, removeTeamProjectInState,
  });
  storeRef.current = {
    addTask, updateTaskInState, removeTask, loadUnreadCount,
    addProject, updateProjectInState, removeProject, refreshProject,
    addSprint, updateSprintInState, removeSprint, loadProjects,
    addCommentToTask, loadTeams, addTeam, updateTeamInState, removeTeam,
    updateTeamMemberInState, removeTeamMemberInState,
    updateTeamProjectInState, removeTeamProjectInState,
  };

  useEffect(() => {
    const token = getAccessToken();
    if (!token) return;

    const onEvent = (event: string, data: any) => {
      const s = storeRef.current;
      switch (event) {
        case "task:created": s.addTask(data); break;
        case "task:updated": s.updateTaskInState(data); break;
        case "task:assigned": s.updateTaskInState(data.task); break;
        case "task:statusChanged": s.updateTaskInState(data.task); break;
        case "task:moved": s.updateTaskInState(data.task); break;
        case "task:deleted": s.removeTask(data.taskId); break;
        case "notification:new": s.loadUnreadCount(); s.loadNotifications(); break;
        case "project:created": s.addProject(data); s.loadProjects(); break;
        case "project:updated": s.updateProjectInState(data); break;
        case "project:deleted": s.removeProject(data.projectId); s.loadProjects(); break;
        case "project:memberAdded": s.refreshProject(data.projectId); break;
        case "project:memberRemoved": s.refreshProject(data.projectId); break;
        case "sprint:created": s.addSprint(data); break;
        case "sprint:updated": s.updateSprintInState(data); break;
        case "sprint:deleted": s.removeSprint(data.sprintId); break;
        case "comment:new": s.addCommentToTask(data.taskId, data.comment); break;
        case "team:created": s.addTeam(data); break;
        case "team:updated": s.updateTeamInState(data); break;
        case "team:deleted": s.removeTeam(data.teamId); break;
        case "team:memberAdded": s.updateTeamMemberInState(data.teamId, data.member); s.loadTeams(); break;
        case "team:memberRemoved": s.removeTeamMemberInState(data.teamId, data.userId); s.loadTeams(); break;
        case "team:projectAssigned": s.updateTeamProjectInState(data.teamId, data.project); s.loadTeams(); break;
        case "team:projectUnassigned": s.removeTeamProjectInState(data.teamId, data.projectId); s.loadTeams(); break;
      }
    };

    function scheduleReconnect() {
      if (reconnectTimerRef.current) return;
      if (reconnectAttemptsRef.current >= MAX_RECONNECT) return;
      const delay = BASE_DELAY * Math.pow(1.5, reconnectAttemptsRef.current);
      reconnectAttemptsRef.current++;
      reconnectTimerRef.current = setTimeout(() => {
        reconnectTimerRef.current = null;
        connect();
      }, delay);
    }

    function connect() {
      if (socketRef.current && (socketRef.current.readyState === WebSocket.OPEN || socketRef.current.readyState === WebSocket.CONNECTING)) return;

      const ws = new WebSocket(getWsUrl());
      socketRef.current = ws;

      ws.onopen = () => {
        reconnectAttemptsRef.current = 0;
        if (currentProjectIdRef.current) {
          ws.send(JSON.stringify({ event: "join:project", data: { projectId: currentProjectIdRef.current } }));
        }
      };

      ws.onmessage = (event) => {
        try {
          const { event: eventName, data } = JSON.parse(event.data);
          onEvent(eventName, data);
        } catch {}
      };

      ws.onclose = () => {
        socketRef.current = null;
        scheduleReconnect();
      };

      ws.onerror = () => {
        ws.close();
      };
    }

    connect();

    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      reconnectAttemptsRef.current = MAX_RECONNECT;
      if (socketRef.current) {
        socketRef.current.close();
        socketRef.current = null;
      }
    };
  }, []);

  const joinProject = useCallback((projectId: string) => {
    currentProjectIdRef.current = projectId;
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "join:project", data: { projectId } }));
    }
  }, []);

  const leaveProject = useCallback((projectId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "leave:project", data: { projectId } }));
    }
    if (currentProjectIdRef.current === projectId) {
      currentProjectIdRef.current = null;
    }
  }, []);

  const joinTask = useCallback((taskId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "join:task", data: { taskId } }));
    }
  }, []);

  const leaveTask = useCallback((taskId: string) => {
    if (socketRef.current?.readyState === WebSocket.OPEN) {
      socketRef.current.send(JSON.stringify({ event: "leave:task", data: { taskId } }));
    }
  }, []);

  return { socket: socketRef.current, joinProject, leaveProject, joinTask, leaveTask };
}
