import { describe, expect, it } from "vitest";
import { computeCpm } from "../src/cpm.js";
import type { TaskNode } from "../src/types.js";

describe("computeCpm", () => {
  // Classic diamond: A(3) -> B(4), C(2) -> D(5). Critical path A-B-D = 12.
  const diamond: TaskNode[] = [
    { id: "A", duration: 3, dependsOn: [] },
    { id: "B", duration: 4, dependsOn: ["A"] },
    { id: "C", duration: 2, dependsOn: ["A"] },
    { id: "D", duration: 5, dependsOn: ["B", "C"] },
  ];

  it("computes the textbook diamond network", () => {
    const s = computeCpm(diamond);
    expect(s.duration).toBe(12);
    expect(s.tasks.get("A")).toMatchObject({ earliestStart: 0, earliestFinish: 3, slack: 0, critical: true });
    expect(s.tasks.get("B")).toMatchObject({ earliestStart: 3, earliestFinish: 7, slack: 0, critical: true });
    expect(s.tasks.get("C")).toMatchObject({ earliestStart: 3, earliestFinish: 5, latestStart: 5, latestFinish: 7, slack: 2, critical: false });
    expect(s.tasks.get("D")).toMatchObject({ earliestStart: 7, earliestFinish: 12, slack: 0, critical: true });
    expect(s.criticalPath).toEqual(["A", "B", "D"]);
  });

  it("handles a single task", () => {
    const s = computeCpm([{ id: "only", duration: 7, dependsOn: [] }]);
    expect(s.duration).toBe(7);
    expect(s.criticalPath).toEqual(["only"]);
  });

  it("handles parallel independent chains", () => {
    const s = computeCpm([
      { id: "a1", duration: 2, dependsOn: [] },
      { id: "a2", duration: 2, dependsOn: ["a1"] },
      { id: "b1", duration: 10, dependsOn: [] },
    ]);
    expect(s.duration).toBe(10);
    expect(s.tasks.get("b1")!.critical).toBe(true);
    expect(s.tasks.get("a1")!.slack).toBe(6);
    expect(s.tasks.get("a2")!.slack).toBe(6);
    expect(s.criticalPath).toEqual(["b1"]);
  });

  it("supports zero-duration milestones", () => {
    const s = computeCpm([
      { id: "work", duration: 5, dependsOn: [] },
      { id: "milestone", duration: 0, dependsOn: ["work"] },
    ]);
    expect(s.duration).toBe(5);
    expect(s.tasks.get("milestone")).toMatchObject({ earliestStart: 5, earliestFinish: 5, critical: true });
  });

  it("computes a larger PMI-style network", () => {
    // Kerzner-style example with two joined paths.
    const s = computeCpm([
      { id: "start", duration: 0, dependsOn: [] },
      { id: "design", duration: 4, dependsOn: ["start"] },
      { id: "buildA", duration: 6, dependsOn: ["design"] },
      { id: "buildB", duration: 3, dependsOn: ["design"] },
      { id: "testA", duration: 2, dependsOn: ["buildA"] },
      { id: "testB", duration: 4, dependsOn: ["buildB"] },
      { id: "integrate", duration: 3, dependsOn: ["testA", "testB"] },
    ]);
    // Path A: 4+6+2 = 12; path B: 4+3+4 = 11 -> integrate starts at 12.
    expect(s.duration).toBe(15);
    expect(s.criticalPath).toEqual(["start", "design", "buildA", "testA", "integrate"]);
    expect(s.tasks.get("buildB")!.slack).toBe(1);
    expect(s.tasks.get("testB")!.slack).toBe(1);
  });

  it("rejects negative and non-finite durations", () => {
    expect(() => computeCpm([{ id: "bad", duration: -1, dependsOn: [] }])).toThrowError(/invalid duration/);
    expect(() => computeCpm([{ id: "bad", duration: Number.NaN, dependsOn: [] }])).toThrowError(/invalid duration/);
  });
});
