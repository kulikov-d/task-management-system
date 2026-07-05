import { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { teamsApi, usersApi } from "../api/client";
import type { Team, TeamMember, TeamProject } from "../api/client";
import { Plus, X, Users, FolderKanban, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { getInitials, getUserColor } from "../utils/helpers";

export function TeamView() {
  const { user } = useAuthStore();
  const users = useAppStore((s) => s.users);
  const loadUsers = useAppStore((s) => s.loadUsers);

  const [teams, setTeams] = useState<Team[]>([]);
  const [selectedTeam, setSelectedTeam] = useState<Team | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"members" | "projects">("members");

  const isAdmin = user?.role === "admin";
  const isLead = user?.role === "lead";
  const canManage = isAdmin || isLead;

  useEffect(() => {
    loadTeams();
    loadUsers();
  }, []);

  async function loadTeams() {
    try {
      setLoading(true);
      const data = await teamsApi.list();
      setTeams(data);
    } catch (err) {
      console.error("Failed to load teams:", err);
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateTeam(name: string, description?: string) {
    try {
      const newTeam = await teamsApi.create({ name, description });
      setTeams((prev) => [...prev, { ...newTeam, members: [], projects: [], _count: { members: 0, projects: 0 } }]);
      setShowCreateModal(false);
    } catch (err) {
      console.error("Failed to create team:", err);
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm("Удалить команду?")) return;
    try {
      await teamsApi.delete(teamId);
      setTeams((prev) => prev.filter((t) => t.id !== teamId));
      if (selectedTeam?.id === teamId) setSelectedTeam(null);
    } catch (err) {
      console.error("Failed to delete team:", err);
    }
  }

  async function handleAddMember(teamId: string, userId: string, role: string) {
    try {
      const member = await teamsApi.addMember(teamId, { userId, role });
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, members: [...t.members, member], _count: { ...t._count, members: t._count.members + 1 } }
            : t
        )
      );
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((prev) =>
          prev ? { ...prev, members: [...prev.members, member], _count: { ...prev._count, members: prev._count.members + 1 } } : prev
        );
      }
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  }

  async function handleRemoveMember(teamId: string, memberId: string) {
    try {
      await teamsApi.removeMember(teamId, memberId);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, members: t.members.filter((m) => m.id !== memberId), _count: { ...t._count, members: t._count.members - 1 } }
            : t
        )
      );
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((prev) =>
          prev
            ? { ...prev, members: prev.members.filter((m) => m.id !== memberId), _count: { ...prev._count, members: prev._count.members - 1 } }
            : prev
        );
      }
    } catch (err) {
      console.error("Failed to remove member:", err);
    }
  }

  async function handleAssignProject(teamId: string, projectId: string) {
    try {
      const assignment = await teamsApi.assignProject(teamId, { projectId });
      const project = useAppStore.getState().projects.find((p) => p.id === projectId);
      const tp = { ...assignment, project: project! };
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, projects: [...t.projects, tp], _count: { ...t._count, projects: t._count.projects + 1 } }
            : t
        )
      );
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((prev) =>
          prev ? { ...prev, projects: [...prev.projects, tp], _count: { ...prev._count, projects: prev._count.projects + 1 } } : prev
        );
      }
    } catch (err) {
      console.error("Failed to assign project:", err);
    }
  }

  async function handleUnassignProject(teamId: string, projectId: string) {
    try {
      await teamsApi.unassignProject(teamId, projectId);
      setTeams((prev) =>
        prev.map((t) =>
          t.id === teamId
            ? { ...t, projects: t.projects.filter((p) => p.projectId !== projectId), _count: { ...t._count, projects: t._count.projects - 1 } }
            : t
        )
      );
      if (selectedTeam?.id === teamId) {
        setSelectedTeam((prev) =>
          prev
            ? { ...prev, projects: prev.projects.filter((p) => p.projectId !== projectId), _count: { ...prev._count, projects: prev._count.projects - 1 } }
            : prev
        );
      }
    } catch (err) {
      console.error("Failed to unassign project:", err);
    }
  }

  const projects = useAppStore((s) => s.projects);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center" style={{ background: "var(--background)" }}>
        <p style={{ color: "var(--muted-foreground)" }}>Загрузка команд...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex overflow-hidden" style={{ background: "var(--background)" }}>
      <div className="w-72 border-r p-4 flex flex-col" style={{ borderColor: "var(--border)" }}>
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ color: "var(--foreground)", fontSize: "0.9rem", fontWeight: 600 }}>Команды</h3>
          {canManage && (
            <button onClick={() => setShowCreateModal(true)} className="p-1.5 rounded-md hover:opacity-80" style={{ color: "var(--primary)" }}>
              <Plus size={16} />
            </button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-1">
          {teams.map((team) => (
            <button
              key={team.id}
              onClick={() => setSelectedTeam(team)}
              className="w-full text-left px-3 py-2.5 rounded-lg transition-colors flex items-center gap-2"
              style={{
                background: selectedTeam?.id === team.id ? "var(--primary)" : "transparent",
                color: selectedTeam?.id === team.id ? "var(--primary-foreground)" : "var(--foreground)",
                fontSize: "0.8rem",
              }}
            >
              <Users size={14} />
              <span className="truncate">{team.name}</span>
              <span className="ml-auto text-xs opacity-60">{team._count.members}</span>
            </button>
          ))}
          {teams.length === 0 && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem" }}>Нет команд</p>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6">
        {selectedTeam ? (
          <TeamDetail
            team={selectedTeam}
            canManage={canManage}
            users={users}
            allProjects={projects}
            onRemoveMember={(memberId) => handleRemoveMember(selectedTeam.id, memberId)}
            onAddMember={(userId, role) => handleAddMember(selectedTeam.id, userId, role)}
            onAssignProject={(projectId) => handleAssignProject(selectedTeam.id, projectId)}
            onUnassignProject={(projectId) => handleUnassignProject(selectedTeam.id, projectId)}
            onDelete={() => handleDeleteTeam(selectedTeam.id)}
          />
        ) : (
          <div className="flex-1 flex items-center justify-center h-full">
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.85rem" }}>Выберите команду</p>
          </div>
        )}
      </div>

      {showCreateModal && (
        <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTeam} />
      )}
    </div>
  );
}

function TeamDetail({ team, canManage, users, allProjects, onRemoveMember, onAddMember, onAssignProject, onUnassignProject, onDelete }: {
  team: Team;
  canManage: boolean;
  users: any[];
  allProjects: any[];
  onRemoveMember: (memberId: string) => void;
  onAddMember: (userId: string, role: string) => void;
  onAssignProject: (projectId: string) => void;
  onUnassignProject: (projectId: string) => void;
  onDelete: () => void;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"members" | "projects">("members");

  const assignedProjectIds = new Set(team.projects.map((p) => p.projectId));
  const availableProjects = allProjects.filter((p) => !assignedProjectIds.has(p.id));
  const memberUserIds = new Set(team.members.map((m) => m.userId));
  const availableUsers = users.filter((u: any) => !memberUserIds.has(u.id));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 style={{ color: "var(--foreground)", fontSize: "1.1rem", fontWeight: 600 }}>{team.name}</h2>
          {team.description && (
            <p style={{ color: "var(--muted-foreground)", fontSize: "0.75rem", marginTop: "0.25rem" }}>{team.description}</p>
          )}
        </div>
        {canManage && (
          <button
            onClick={onDelete}
            className="p-2 rounded-md hover:opacity-80"
            style={{ color: "var(--destructive)" }}
          >
            <Trash2 size={16} />
          </button>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setExpandedSection(expandedSection === "members" ? "projects" : "members")}
          className="flex items-center gap-2 w-full text-left"
        >
          {expandedSection === "members" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <Users size={14} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 500 }}>
            Участники ({team.members.length})
          </span>
        </button>
        {expandedSection === "members" && (
          <div className="ml-6 space-y-2">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--muted)" }}>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full flex items-center justify-center text-white" style={{ background: getUserColor(member.user.id), fontSize: "0.65rem", fontWeight: 600 }}>
                    {getInitials(member.user.name)}
                  </div>
                  <div>
                    <p style={{ color: "var(--foreground)", fontSize: "0.78rem" }}>{member.user.name}</p>
                    <p style={{ color: "var(--muted-foreground)", fontSize: "0.65rem" }}>{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-xs" style={{ background: "var(--background)", color: "var(--foreground)" }}>
                    {member.role}
                  </span>
                  {canManage && (
                    <button onClick={() => onRemoveMember(member.id)} className="p-1 rounded hover:opacity-80" style={{ color: "var(--destructive)" }}>
                      <X size={12} />
                    </button>
                  )}
                </div>
              </div>
            ))}
            {canManage && (
              <button
                onClick={() => setShowAddMember(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg w-full hover:opacity-80"
                style={{ color: "var(--primary)", fontSize: "0.78rem", border: "1px dashed var(--primary)" }}
              >
                <Plus size={12} /> Добавить участника
              </button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <button
          onClick={() => setExpandedSection(expandedSection === "projects" ? "members" : "projects")}
          className="flex items-center gap-2 w-full text-left"
        >
          {expandedSection === "projects" ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
          <FolderKanban size={14} style={{ color: "var(--muted-foreground)" }} />
          <span style={{ color: "var(--foreground)", fontSize: "0.8rem", fontWeight: 500 }}>
            Проекты ({team.projects.length})
          </span>
        </button>
        {expandedSection === "projects" && (
          <div className="ml-6 space-y-2">
            {team.projects.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between py-2 px-3 rounded-lg" style={{ background: "var(--muted)" }}>
                <span style={{ color: "var(--foreground)", fontSize: "0.78rem" }}>{tp.project.name}</span>
                {canManage && (
                  <button onClick={() => onUnassignProject(tp.projectId)} className="p-1 rounded hover:opacity-80" style={{ color: "var(--destructive)" }}>
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
            {canManage && availableProjects.length > 0 && (
              <button
                onClick={() => setShowAssignProject(true)}
                className="flex items-center gap-1.5 px-3 py-2 rounded-lg w-full hover:opacity-80"
                style={{ color: "var(--primary)", fontSize: "0.78rem", border: "1px dashed var(--primary)" }}
              >
                <Plus size={12} /> Назначить проект
              </button>
            )}
          </div>
        )}
      </div>

      {showAddMember && (
        <AddMemberModal users={availableUsers} onClose={() => setShowAddMember(false)} onAdd={onAddMember} />
      )}
      {showAssignProject && (
        <AssignProjectModal projects={availableProjects} onClose={() => setShowAssignProject(false)} onAssign={onAssignProject} />
      )}
    </div>
  );
}

function CreateTeamModal({ onClose, onCreate }: { onClose: () => void; onCreate: (name: string, description?: string) => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    onCreate(name.trim(), description.trim() || undefined);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <form onSubmit={handleSubmit} className="rounded-xl p-6 w-96 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 600 }}>Новая команда</h3>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Название команды"
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "0.8rem" }}
          autoFocus
        />
        <input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Описание (необязательно)"
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "0.8rem" }}
        />
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            Отмена
          </button>
          <button type="submit" className="px-3 py-1.5 rounded-lg" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.78rem" }}>
            Создать
          </button>
        </div>
      </form>
    </div>
  );
}

function AddMemberModal({ users, onClose, onAdd }: { users: any[]; onClose: () => void; onAdd: (userId: string, role: string) => void }) {
  const [selectedUser, setSelectedUser] = useState("");
  const [role, setRole] = useState("developer");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedUser) return;
    onAdd(selectedUser, role);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <form onSubmit={handleSubmit} className="rounded-xl p-6 w-96 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 600 }}>Добавить участника</h3>
        <select
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "0.8rem" }}
        >
          <option value="">Выберите...</option>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name} ({u.email})</option>
          ))}
        </select>
        <select
          value={role}
          onChange={(e) => setRole(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "0.8rem" }}
        >
          <option value="developer">Разработчик</option>
          <option value="lead">Тимлид</option>
          <option value="admin">Администратор</option>
        </select>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            Отмена
          </button>
          <button type="submit" className="px-3 py-1.5 rounded-lg" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.78rem" }}>
            Добавить
          </button>
        </div>
      </form>
    </div>
  );
}

function AssignProjectModal({ projects, onClose, onAssign }: { projects: any[]; onClose: () => void; onAssign: (projectId: string) => void }) {
  const [selectedProject, setSelectedProject] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedProject) return;
    onAssign(selectedProject);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ background: "rgba(0,0,0,0.5)" }}>
      <form onSubmit={handleSubmit} className="rounded-xl p-6 w-96 space-y-4" style={{ background: "var(--card)", border: "1px solid var(--border)" }}>
        <h3 style={{ color: "var(--foreground)", fontSize: "0.95rem", fontWeight: 600 }}>Назначить проект</h3>
        <select
          value={selectedProject}
          onChange={(e) => setSelectedProject(e.target.value)}
          className="w-full px-3 py-2 rounded-lg outline-none"
          style={{ background: "var(--muted)", color: "var(--foreground)", fontSize: "0.8rem" }}
        >
          <option value="">Выберите проект...</option>
          {projects.map((p: any) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="px-3 py-1.5 rounded-lg" style={{ color: "var(--muted-foreground)", fontSize: "0.78rem" }}>
            Отмена
          </button>
          <button type="submit" className="px-3 py-1.5 rounded-lg" style={{ background: "var(--primary)", color: "var(--primary-foreground)", fontSize: "0.78rem" }}>
            Назначить
          </button>
        </div>
      </form>
    </div>
  );
}
