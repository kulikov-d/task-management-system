import { describe, it, expect } from "vitest";

function calculateBurndown(tasks: { createdAt: Date; status: string }[]) {
  const total = tasks.length;
  const grouped: Record<string, { total: number; done: number }> = {};

  for (const task of tasks) {
    const date = task.createdAt.toISOString().split("T")[0];
    if (!grouped[date]) grouped[date] = { total: 0, done: 0 };
    grouped[date].total++;
    if (task.status === "DONE") grouped[date].done++;
  }

  const dates = Object.keys(grouped).sort();
  let cumTotal = 0;
  let cumDone = 0;
  return dates.map((date) => {
    cumTotal += grouped[date].total;
    cumDone += grouped[date].done;
    return {
      date,
      planned: total - Math.round((total / dates.length) * dates.indexOf(date)),
      actual: cumTotal - cumDone,
    };
  });
}

function calculateVelocity(completedTasks: { updatedAt: Date }[]) {
  const grouped: Record<string, number> = {};
  for (const task of completedTasks) {
    const d = new Date(task.updatedAt);
    const start = new Date(d.getFullYear(), 0, 1);
    const week = Math.ceil(((d.getTime() - start.getTime()) / 86400000 + start.getDay() + 1) / 7);
    const key = `W${week}`;
    grouped[key] = (grouped[key] || 0) + 1;
  }
  return Object.entries(grouped)
    .map(([sprint, completed]) => ({ sprint, completed, planned: 10 }))
    .reverse()
    .slice(-5);
}

describe("Analytics - Burndown Calculation", () => {
  it("should calculate burndown for tasks created on same day", () => {
    const date = new Date("2026-06-10T10:00:00Z");
    const tasks = [
      { createdAt: date, status: "DONE" },
      { createdAt: date, status: "TODO" },
      { createdAt: date, status: "IN_PROGRESS" },
    ];
    const result = calculateBurndown(tasks);
    expect(result).toHaveLength(1);
    expect(result[0].date).toBe("2026-06-10");
    expect(result[0].planned).toBe(3);
    expect(result[0].actual).toBe(2); // 3 total - 1 done = 2 remaining
  });

  it("should calculate burndown across multiple days", () => {
    const tasks = [
      { createdAt: new Date("2026-06-10T10:00:00Z"), status: "TODO" },
      { createdAt: new Date("2026-06-11T10:00:00Z"), status: "DONE" },
      { createdAt: new Date("2026-06-12T10:00:00Z"), status: "TODO" },
    ];
    const result = calculateBurndown(tasks);
    expect(result).toHaveLength(3);
    expect(result[0].actual).toBe(1); // 1 remaining on day 1
    expect(result[1].actual).toBe(1); // 2 created - 1 done = 1 remaining
    expect(result[2].actual).toBe(2); // 3 created - 1 done = 2 remaining
  });

  it("should handle empty tasks", () => {
    const result = calculateBurndown([]);
    expect(result).toHaveLength(0);
  });

  it("planned line should decrease linearly", () => {
    const tasks = [
      { createdAt: new Date("2026-06-10T10:00:00Z"), status: "TODO" },
      { createdAt: new Date("2026-06-11T10:00:00Z"), status: "TODO" },
      { createdAt: new Date("2026-06-12T10:00:00Z"), status: "TODO" },
      { createdAt: new Date("2026-06-13T10:00:00Z"), status: "TODO" },
    ];
    const result = calculateBurndown(tasks);
    expect(result[0].planned).toBe(4);
    expect(result[result.length - 1].planned).toBeLessThanOrEqual(1);
  });
});

describe("Analytics - Velocity Calculation", () => {
  it("should group completed tasks by week", () => {
    const tasks = [
      { updatedAt: new Date("2026-06-10T10:00:00Z") },
      { updatedAt: new Date("2026-06-11T10:00:00Z") },
      { updatedAt: new Date("2026-06-20T10:00:00Z") },
    ];
    const result = calculateVelocity(tasks);
    expect(result.length).toBeGreaterThan(0);
    expect(result.some((v) => v.completed === 2)).toBe(true);
  });

  it("should return max 5 sprints", () => {
    const tasks = Array.from({ length: 50 }, (_, i) => ({
      updatedAt: new Date(2026, 0, i + 1, 10, 0, 0),
    }));
    const result = calculateVelocity(tasks);
    expect(result.length).toBeLessThanOrEqual(5);
  });

  it("should handle empty tasks", () => {
    const result = calculateVelocity([]);
    expect(result).toHaveLength(0);
  });
});
