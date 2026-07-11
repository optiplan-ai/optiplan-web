import type { TaskNode } from "./types.js";

/** Thrown when the dependency graph contains a cycle. Carries one offending cycle. */
export class CycleError extends Error {
  constructor(readonly cycle: readonly string[]) {
    super(`Dependency cycle detected: ${cycle.join(" -> ")}`);
    this.name = "CycleError";
  }
}

/** Thrown when a task depends on an id that is not in the graph. */
export class UnknownDependencyError extends Error {
  constructor(readonly taskId: string, readonly dependencyId: string) {
    super(`Task "${taskId}" depends on unknown task "${dependencyId}"`);
    this.name = "UnknownDependencyError";
  }
}

function buildIndex(nodes: readonly TaskNode[]): Map<string, TaskNode> {
  const byId = new Map<string, TaskNode>();
  for (const node of nodes) {
    if (byId.has(node.id)) {
      throw new Error(`Duplicate task id "${node.id}"`);
    }
    byId.set(node.id, node);
  }
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      if (!byId.has(dep)) throw new UnknownDependencyError(node.id, dep);
    }
  }
  return byId;
}

/**
 * Find one cycle in the graph, or null if it is a DAG.
 * Iterative DFS with white/grey/black coloring; the returned path is the
 * cycle in dependency order (each entry depends on the next, wrapping around).
 */
export function findCycle(nodes: readonly TaskNode[]): string[] | null {
  const byId = buildIndex(nodes);
  const WHITE = 0, GREY = 1, BLACK = 2;
  const color = new Map<string, number>();
  const parent = new Map<string, string>();
  for (const node of nodes) color.set(node.id, WHITE);

  for (const root of nodes) {
    if (color.get(root.id) !== WHITE) continue;
    // stack entries: [id, nextDependencyIndex]
    const stack: [string, number][] = [[root.id, 0]];
    color.set(root.id, GREY);
    while (stack.length > 0) {
      const top = stack[stack.length - 1]!;
      const [id, i] = top;
      const deps = byId.get(id)!.dependsOn;
      if (i < deps.length) {
        top[1]++;
        const dep = deps[i]!;
        const c = color.get(dep);
        if (c === WHITE) {
          parent.set(dep, id);
          color.set(dep, GREY);
          stack.push([dep, 0]);
        } else if (c === GREY) {
          // Found a back edge id -> dep: reconstruct the cycle.
          const cycle = [id];
          let cur = id;
          while (cur !== dep) {
            cur = parent.get(cur)!;
            cycle.push(cur);
          }
          return cycle.reverse();
        }
      } else {
        color.set(id, BLACK);
        stack.pop();
      }
    }
  }
  return null;
}

/**
 * Kahn's algorithm. Returns task ids so that every task appears after all of
 * its dependencies. Deterministic: ties broken by input order.
 * @throws CycleError if the graph is not a DAG.
 */
export function topologicalSort(nodes: readonly TaskNode[]): string[] {
  buildIndex(nodes); // validates duplicates and unknown dependencies
  const inDegree = new Map<string, number>();
  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    inDegree.set(node.id, node.dependsOn.length);
    for (const dep of node.dependsOn) {
      let list = dependents.get(dep);
      if (!list) dependents.set(dep, (list = []));
      list.push(node.id);
    }
  }

  const queue: string[] = [];
  for (const node of nodes) {
    if (node.dependsOn.length === 0) queue.push(node.id);
  }

  const order: string[] = [];
  for (let head = 0; head < queue.length; head++) {
    const id = queue[head]!;
    order.push(id);
    for (const dependent of dependents.get(id) ?? []) {
      const remaining = inDegree.get(dependent)! - 1;
      inDegree.set(dependent, remaining);
      if (remaining === 0) queue.push(dependent);
    }
  }

  if (order.length !== nodes.length) {
    const cycle = findCycle(nodes);
    throw new CycleError(cycle ?? []);
  }
  return order;
}
