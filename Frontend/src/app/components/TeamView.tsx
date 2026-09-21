import { useState, useEffect } from "react";
import { useAppStore } from "../stores/appStore";
import { useAuthStore } from "../stores/authStore";
import { teamsApi } from "../api/client";
import type { Team } from "../api/client";
import { Plus, X, Users, FolderKanban, Trash2, ChevronDown, ChevronRight } from "lucide-react";
import { Card } from "./ui/card";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Badge } from "./ui/badge";
import { Avatar } from "./ui/avatar";
import { SlideOver } from "./ui/slide-over";
import { Select } from "./ui/dropdown";
import { toast } from "./ui/toast";

export function TeamView() {
  const { user } = useAuthStore();
  const users = useAppStore((s) => s.users);
  const loadUsers = useAppStore((s) => s.loadUsers);
  const teams = useAppStore((s) => s.teams);
  const loadTeams = useAppStore((s) => s.loadTeams);
  const addTeam = useAppStore((s) => s.addTeam);
  const removeTeam = useAppStore((s) => s.removeTeam);
  const updateTeamMemberInState = useAppStore((s) => s.updateTeamMemberInState);
  const removeTeamMemberInState = useAppStore((s) => s.removeTeamMemberInState);
  const updateTeamProjectInState = useAppStore((s) => s.updateTeamProjectInState);
  const removeTeamProjectInState = useAppStore((s) => s.removeTeamProjectInState);

  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [showCreateModal, setShowCreateModal] = useState(false);

  const isAdmin = user?.role === "admin";
  const isLead = user?.role === "lead";
  const canManage = isAdmin || isLead;

  useEffect(() => {
    Promise.all([loadTeams(), loadUsers()]).finally(() => setLoading(false));
  }, [loadTeams, loadUsers]);

  const selectedTeam = teams.find((t) => t.id === selectedTeamId) || null;

  async function handleCreateTeam(name: string, description?: string) {
    try {
      const newTeam = await teamsApi.create({ name, description });
      addTeam({ ...newTeam, members: [], projects: [], _count: { members: 0, projects: 0 } });
      setShowCreateModal(false);
    } catch (err) {
      toast.error("Не удалось создать команду");
    }
  }

  async function handleDeleteTeam(teamId: string) {
    if (!confirm("Удалить команду?")) return;
    try {
      await teamsApi.delete(teamId);
      removeTeam(teamId);
      if (selectedTeamId === teamId) setSelectedTeamId(null);
    } catch (err) {
      toast.error("Не удалось удалить команду");
    }
  }

  async function handleAddMember(teamId: string, userId: string, role: string) {
    try {
      const member = await teamsApi.addMember(teamId, { userId, role });
      updateTeamMemberInState(teamId, member);
    } catch (err) {
      toast.error("Не удалось добавить участника");
    }
  }

  async function handleRemoveMember(teamId: string, memberId: string) {
    try {
      await teamsApi.removeMember(teamId, memberId);
      removeTeamMemberInState(teamId, memberId);
    } catch (err) {
      toast.error("Не удалось удалить участника");
    }
  }

  async function handleAssignProject(teamId: string, projectId: string) {
    try {
      await teamsApi.assignProject(teamId, { projectId });
      const project = useAppStore.getState().projects.find((p) => p.id === projectId);
      updateTeamProjectInState(teamId, project || { id: projectId, name: projectId });
    } catch (err) {
      toast.error("Не удалось назначить проект");
    }
  }

  async function handleUnassignProject(teamId: string, projectId: string) {
    try {
      await teamsApi.unassignProject(teamId, projectId);
      removeTeamProjectInState(teamId, projectId);
    } catch (err) {
      toast.error("Не удалось отвязать проект");
    }
  }

  const projects = useAppStore((s) => s.projects);

  if (loading) {
    return <div className="flex-1 flex items-center justify-center bg-background"><p className="text-xs text-muted-foreground">Загрузка команд...</p></div>;
  }

  return (
    <div className="flex-1 flex overflow-hidden bg-background">
      <div className="w-60 border-r border-border p-3 flex flex-col">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-xs font-semibold text-foreground">Команды</h3>
          {canManage && (
            <Button variant="ghost" size="icon" onClick={() => setShowCreateModal(true)}>
              <Plus size={14} />
            </Button>
          )}
        </div>
        <div className="flex-1 overflow-y-auto space-y-0.5">
          {teams.map((team) => (
            <button key={team.id} onClick={() => setSelectedTeamId(team.id)}
              className={`w-full text-left px-2.5 py-1.5 rounded text-xs transition-colors flex items-center gap-2 ${
                selectedTeam?.id === team.id ? "bg-accent font-medium text-foreground" : "text-muted-foreground hover:bg-accent/50"
              }`}>
              <Users size={12} />
              <span className="truncate">{team.name}</span>
              <span className="ml-auto text-[10px] opacity-50">{team._count.members}</span>
            </button>
          ))}
          {teams.length === 0 && <p className="text-xs text-muted-foreground">Нет команд</p>}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5">
        {selectedTeam ? (
          <TeamDetail team={selectedTeam} canManage={canManage} users={users} allProjects={projects}
            onRemoveMember={(memberId) => handleRemoveMember(selectedTeam.id, memberId)}
            onAddMember={(userId, role) => handleAddMember(selectedTeam.id, userId, role)}
            onAssignProject={(projectId) => handleAssignProject(selectedTeam.id, projectId)}
            onUnassignProject={(projectId) => handleUnassignProject(selectedTeam.id, projectId)}
            onDelete={() => handleDeleteTeam(selectedTeam.id)} />
        ) : (
          <div className="flex items-center justify-center h-full"><p className="text-xs text-muted-foreground">Выберите команду</p></div>
        )}
      </div>

      {showCreateModal && <CreateTeamModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateTeam} />}
    </div>
  );
}

function TeamDetail({ team, canManage, users, allProjects, onRemoveMember, onAddMember, onAssignProject, onUnassignProject, onDelete }: {
  team: Team; canManage: boolean; users: any[]; allProjects: any[];
  onRemoveMember: (memberId: string) => void; onAddMember: (userId: string, role: string) => void;
  onAssignProject: (projectId: string) => void; onUnassignProject: (projectId: string) => void; onDelete: () => void;
}) {
  const [showAddMember, setShowAddMember] = useState(false);
  const [showAssignProject, setShowAssignProject] = useState(false);
  const [expandedSection, setExpandedSection] = useState<"members" | "projects">("members");

  const assignedProjectIds = new Set(team.projects.map((p) => p.projectId));
  const availableProjects = allProjects.filter((p) => !assignedProjectIds.has(p.id));
  const memberUserIds = new Set(team.members.map((m) => m.userId));
  const availableUsers = users.filter((u: any) => !memberUserIds.has(u.id));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-foreground">{team.name}</h2>
          {team.description && <p className="text-xs text-muted-foreground mt-0.5">{team.description}</p>}
        </div>
        {canManage && (
          <Button variant="ghost" size="icon" onClick={onDelete}><Trash2 size={14} className="text-destructive" /></Button>
        )}
      </div>

      <div>
        <button onClick={() => setExpandedSection(expandedSection === "members" ? "projects" : "members")}
          className="flex items-center gap-1.5 w-full text-left mb-2">
          {expandedSection === "members" ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <Users size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Участники ({team.members.length})</span>
        </button>
        {expandedSection === "members" && (
          <div className="ml-5 space-y-1">
            {team.members.map((member) => (
              <div key={member.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary">
                <div className="flex items-center gap-2">
                  <Avatar name={member.user.name} size="sm" />
                  <div>
                    <p className="text-xs text-foreground">{member.user.name}</p>
                    <p className="text-[10px] text-muted-foreground">{member.user.email}</p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <Badge variant="secondary">{member.role}</Badge>
                  {canManage && <button onClick={() => onRemoveMember(member.id)} className="p-0.5 rounded hover:bg-accent"><X size={10} className="text-muted-foreground" /></button>}
                </div>
              </div>
            ))}
            {canManage && (
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setShowAddMember(true)}>
                <Plus size={11} /> Добавить
              </Button>
            )}
          </div>
        )}
      </div>

      <div>
        <button onClick={() => setExpandedSection(expandedSection === "projects" ? "members" : "projects")}
          className="flex items-center gap-1.5 w-full text-left mb-2">
          {expandedSection === "projects" ? <ChevronDown size={12} /> : <ChevronRight size={12} />}
          <FolderKanban size={12} className="text-muted-foreground" />
          <span className="text-xs font-medium text-foreground">Проекты ({team.projects.length})</span>
        </button>
        {expandedSection === "projects" && (
          <div className="ml-5 space-y-1">
            {team.projects.map((tp) => (
              <div key={tp.id} className="flex items-center justify-between py-1.5 px-2 rounded bg-secondary">
                <span className="text-xs text-foreground">{tp.project.name}</span>
                {canManage && <button onClick={() => onUnassignProject(tp.projectId)} className="p-0.5 rounded hover:bg-accent"><X size={10} className="text-muted-foreground" /></button>}
              </div>
            ))}
            {canManage && availableProjects.length > 0 && (
              <Button variant="outline" size="sm" className="w-full border-dashed" onClick={() => setShowAssignProject(true)}>
                <Plus size={11} /> Назначить
              </Button>
            )}
          </div>
        )}
      </div>

      {showAddMember && <AddMemberModal users={availableUsers} onClose={() => setShowAddMember(false)} onAdd={onAddMember} />}
      {showAssignProject && <AssignProjectModal projects={availableProjects} onClose={() => setShowAssignProject(false)} onAssign={onAssignProject} />}
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
    <SlideOver open onClose={onClose} title="Новая команда"
      footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={handleSubmit as any}>Создать</Button></>}>
      <div className="space-y-3">
        <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Название команды" autoFocus />
        <Input value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Описание (необязательно)" />
      </div>
    </SlideOver>
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
    <SlideOver open onClose={onClose} title="Добавить участника"
      footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={handleSubmit as any}>Добавить</Button></>}>
      <div className="space-y-3">
        <Select value={selectedUser} onChange={setSelectedUser} options={[
          { value: "", label: "Выберите..." },
          ...users.map((u: any) => ({ value: u.id, label: `${u.name} (${u.email})` })),
        ]} />
        <Select value={role} onChange={setRole} options={[
          { value: "developer", label: "Разработчик" },
          { value: "lead", label: "Тимлид" },
          { value: "admin", label: "Администратор" },
        ]} />
      </div>
    </SlideOver>
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
    <SlideOver open onClose={onClose} title="Назначить проект"
      footer={<><Button variant="ghost" onClick={onClose}>Отмена</Button><Button onClick={handleSubmit as any}>Назначить</Button></>}>
      <div className="space-y-3">
        <Select value={selectedProject} onChange={setSelectedProject} options={[
          { value: "", label: "Выберите проект..." },
          ...projects.map((p: any) => ({ value: p.id, label: p.name })),
        ]} />
      </div>
    </SlideOver>
  );
}
