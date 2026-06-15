import { describe, it, expect } from "vitest";
import { z } from "zod";

const createTaskSchema = z.object({
  title: z.string().min(1).max(200),
  description: z.string().optional(),
  projectId: z.string(),
  assigneeId: z.string().optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  dueDate: z.string().optional().transform((v) => (v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

const updateTaskSchema = z.object({
  title: z.string().min(1).max(200).optional(),
  description: z.string().optional(),
  status: z.enum(["TODO", "IN_PROGRESS", "IN_REVIEW", "DONE"]).optional(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional().transform((v) => (v === null ? null : v ? new Date(v) : undefined)),
  tagIds: z.array(z.string()).optional(),
});

describe("Validation - Create Task Schema", () => {
  it("should accept valid task data", () => {
    const data = { title: "Test task", projectId: "proj-1" };
    const result = createTaskSchema.parse(data);
    expect(result.title).toBe("Test task");
    expect(result.projectId).toBe("proj-1");
    expect(result.priority).toBeUndefined();
  });

  it("should reject empty title", () => {
    expect(() => createTaskSchema.parse({ title: "", projectId: "proj-1" })).toThrow();
  });

  it("should reject missing projectId", () => {
    expect(() => createTaskSchema.parse({ title: "Test" })).toThrow();
  });

  it("should accept valid priority", () => {
    const result = createTaskSchema.parse({ title: "T", projectId: "p", priority: "HIGH" });
    expect(result.priority).toBe("HIGH");
  });

  it("should reject invalid priority", () => {
    expect(() => createTaskSchema.parse({ title: "T", projectId: "p", priority: "URGENT" })).toThrow();
  });

  it("should transform dueDate string to Date", () => {
    const result = createTaskSchema.parse({ title: "T", projectId: "p", dueDate: "2026-06-15" });
    expect(result.dueDate).toBeInstanceOf(Date);
  });

  it("should accept tagIds array", () => {
    const result = createTaskSchema.parse({ title: "T", projectId: "p", tagIds: ["tag1", "tag2"] });
    expect(result.tagIds).toEqual(["tag1", "tag2"]);
  });
});

describe("Validation - Update Task Schema", () => {
  it("should accept partial update", () => {
    const result = updateTaskSchema.parse({ title: "Updated" });
    expect(result.title).toBe("Updated");
    expect(result.status).toBeUndefined();
  });

  it("should accept valid status", () => {
    const result = updateTaskSchema.parse({ status: "IN_PROGRESS" });
    expect(result.status).toBe("IN_PROGRESS");
  });

  it("should reject invalid status", () => {
    expect(() => updateTaskSchema.parse({ status: "BLOCKED" })).toThrow();
  });

  it("should handle null assigneeId", () => {
    const result = updateTaskSchema.parse({ assigneeId: null });
    expect(result.assigneeId).toBeNull();
  });

  it("should handle null dueDate", () => {
    const result = updateTaskSchema.parse({ dueDate: null });
    expect(result.dueDate).toBeNull();
  });
});
