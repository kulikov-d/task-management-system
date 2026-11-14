import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../config/database", () => ({ prisma: { project: { findFirst: vi.fn() } } }));
import { prisma } from "../config/database";
import { assertProjectAccess } from "./project-access";

describe("project access", () => {
  beforeEach(() => vi.resetAllMocks());
  it("rejects a developer without direct project access", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue(null);
    await expect(assertProjectAccess("outsider", "private", "developer")).rejects.toMatchObject({ statusCode: 403 });
    expect(prisma.project.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: "private",
        exclusions: { none: { userId: "outsider" } },
        OR: [{ ownerId: "outsider" }, { members: { some: { userId: "outsider" } } }],
      }),
    }));
  });
  it("accepts a visible project", async () => {
    vi.mocked(prisma.project.findFirst).mockResolvedValue({ id: "visible" } as any);
    await expect(assertProjectAccess("member", "visible", "developer")).resolves.toBeUndefined();
  });
});
