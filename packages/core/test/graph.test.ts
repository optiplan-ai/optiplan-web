import { describe, expect, it } from "vitest";
import { CycleError, UnknownDependencyError, findCycle, topologicalSort } from "../src/graph.js";
import type { TaskNode } from "../src/types.js";

const t = (id: string, dependsOn: string[] = []): TaskNode => ({ id, duration: 1, dependsOn });

describe("topologicalSort", () => {
  it("orders dependencies before dependents", () => {
    const order = topologicalSort([t("d", ["b", "c"]), t("b", ["a"]), t("c", ["a"]), t("a")]);
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("b"));
    expect(order.indexOf("a")).toBeLessThan(order.indexOf("c"));
    expect(order.indexOf("b")).toBeLessThan(order.indexOf("d"));
    expect(order.indexOf("c")).toBeLessThan(order.indexOf("d"));
    expect(order).toHaveLength(4);
  });

  it("handles empty input", () => {
    expect(topologicalSort([])).toEqual([]);
  });

  it("handles disconnected components deterministically", () => {
    expect(topologicalSort([t("x"), t("y"), t("z", ["y"])])).toEqual(["x", "y", "z"]);
  });

  it("throws CycleError with the offending cycle", () => {
    const nodes = [t("a", ["c"]), t("b", ["a"]), t("c", ["b"])];
    expect(() => topologicalSort(nodes)).toThrowError(CycleError);
    try {
      topologicalSort(nodes);
    } catch (e) {
      const cycle = (e as CycleError).cycle;
      expect(cycle).toHaveLength(3);
      expect(new Set(cycle)).toEqual(new Set(["a", "b", "c"]));
    }
  });

  it("throws on self-dependency", () => {
    expect(() => topologicalSort([t("a", ["a"])])).toThrowError(CycleError);
  });

  it("throws on unknown dependency ids", () => {
    expect(() => topologicalSort([t("a", ["ghost"])])).toThrowError(UnknownDependencyError);
  });

  it("throws on duplicate task ids", () => {
    expect(() => topologicalSort([t("a"), t("a")])).toThrowError(/Duplicate/);
  });
});

describe("findCycle", () => {
  it("returns null for a DAG", () => {
    expect(findCycle([t("a"), t("b", ["a"])])).toBeNull();
  });

  it("finds a cycle buried in a larger graph", () => {
    const nodes = [t("root"), t("a", ["root"]), t("b", ["a", "d"]), t("c", ["b"]), t("d", ["c"])];
    const cycle = findCycle(nodes);
    expect(cycle).not.toBeNull();
    expect(new Set(cycle!)).toEqual(new Set(["b", "c", "d"]));
  });
});
