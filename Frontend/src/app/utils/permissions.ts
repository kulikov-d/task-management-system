export function isAdmin(role: string): boolean {
  return role === "admin";
}

export function isLead(role: string): boolean {
  return role === "lead";
}

export function isDeveloper(role: string): boolean {
  return role === "developer";
}

export function isViewer(role: string): boolean {
  return role === "viewer";
}

export function canManageProject(user: any): boolean {
  return ["admin", "lead"].includes(user?.role);
}

export function canCreateTask(role: string): boolean {
  return ["admin", "lead", "developer"].includes(role);
}

export function canDeleteTask(userRole: string, taskAuthorId: string, userId: string): boolean {
  return userRole === "admin" || userRole === "lead" || taskAuthorId === userId;
}

export function canAssignTask(role: string): boolean {
  return ["admin", "lead"].includes(role);
}

export function canManageMembers(user: any): boolean {
  return ["admin", "lead"].includes(user?.role);
}
