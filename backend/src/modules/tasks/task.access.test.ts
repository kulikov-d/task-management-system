import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../config/database", () => ({ prisma: {
  projectMember: { findUnique: vi.fn() },
  projectExclusion: { findUnique: vi.fn() },
  task: { aggregate: vi.fn(), create: vi.fn(), findUnique: vi.fn(), update: vi.fn() },
  event: { create: vi.fn() },
} }));
vi.mock("../../config/socket", () => ({ emitToProject: vi.fn(), emitToTask: vi.fn() }));
vi.mock("../../common/middleware/audit.middleware", () => ({ auditLog: vi.fn() }));
vi.mock("../notifications/notification.helper", () => ({ createAndEmitNotification: vi.fn() }));

import { prisma } from "../../config/database";
import { createTask, updateTask } from "./task.service";

describe("createTask project access", () => {
  beforeEach(() => vi.resetAllMocks());
  const request = { userId: "outsider", body: { projectId: "private-project", title: "Task" } };
  it("rejects a nonmember before reading or writing tasks", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue(null);
    await expect(createTask(request as any, {} as any)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.task.aggregate).not.toHaveBeenCalled();
    expect(prisma.task.create).not.toHaveBeenCalled();
    expect(prisma.event.create).not.toHaveBeenCalled();
  });
  it("allows a member to create a task", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ userId: "outsider" } as any);
    vi.mocked(prisma.task.aggregate).mockResolvedValue({ _max: { position: null } } as any);
    vi.mocked(prisma.task.create).mockResolvedValue({ timeEntries: [], id: "task", projectId: "private-project", title: "Task" } as any);
    const reply = { code: vi.fn().mockReturnThis(), send: vi.fn() };
    await createTask(request as any, reply as any);
    expect(prisma.projectMember.findUnique).toHaveBeenCalledWith({ where: { projectId_userId: { projectId: "private-project", userId: "outsider" } } });
    expect(reply.code).toHaveBeenCalledWith(201);
    expect(prisma.task.create).toHaveBeenCalledOnce();
  });
  it("rejects a project member who is excluded", async () => {
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ userId: "outsider" } as any);
    vi.mocked(prisma.projectExclusion.findUnique).mockResolvedValue({ userId: "outsider" } as any);
    await expect(createTask(request as any, {} as any)).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.task.create).not.toHaveBeenCalled();
  });
});

describe("updateTask status guard", () => {
  beforeEach(() => vi.resetAllMocks());
  it("does not change status through the general edit endpoint", async () => {
    vi.mocked(prisma.task.findUnique).mockResolvedValue({ id: "task", projectId: "project", status: "TODO" } as any);
    vi.mocked(prisma.projectMember.findUnique).mockResolvedValue({ userId: "member" } as any);
    vi.mocked(prisma.task.update).mockResolvedValue({ id: "task", projectId: "project", status: "TODO", timeEntries: [] } as any);
    const reply = { send: vi.fn() };
    await updateTask({ userId: "member", params: { id: "task" }, body: { title: "Updated", status: "DONE" } } as any, reply as any);
    expect(prisma.task.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ title: "Updated" }),
    }));
    expect(vi.mocked(prisma.task.update).mock.calls[0][0].data).not.toHaveProperty("status");
  });
});
