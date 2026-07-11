import { topologicalSort } from "./graph.js";
import type { CpmSchedule, ScheduledTask, TaskNode } from "./types.js";

const EPSILON = 1e-9;

/**
 * Critical Path Method over an activity-on-node graph.
 *
 * Forward pass computes earliest start/finish in topological order; backward
 * pass computes latest start/finish against the project finish. Slack is
 * latestStart - earliestStart; zero-slack tasks are critical.
 *
 * @throws CycleError / UnknownDependencyError for malformed graphs.
 */
export function computeCpm(nodes: readonly TaskNode[]): CpmSchedule {
  for (const node of nodes) {
    if (!(node.duration >= 0) || !Number.isFinite(node.duration)) {
      throw new Error(`Task "${node.id}" has invalid duration ${node.duration}`);
    }
  }

  const order = topologicalSort(nodes);
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const dependents = new Map<string, string[]>();
  for (const node of nodes) {
    for (const dep of node.dependsOn) {
      let list = dependents.get(dep);
      if (!list) dependents.set(dep, (list = []));
      list.push(node.id);
    }
  }

  const es = new Map<string, number>();
  const ef = new Map<string, number>();
  let projectDuration = 0;
  for (const id of order) {
    const node = byId.get(id)!;
    let start = 0;
    for (const dep of node.dependsOn) {
      start = Math.max(start, ef.get(dep)!);
    }
    es.set(id, start);
    ef.set(id, start + node.duration);
    projectDuration = Math.max(projectDuration, start + node.duration);
  }

  const lf = new Map<string, number>();
  const ls = new Map<string, number>();
  for (let i = order.length - 1; i >= 0; i--) {
    const id = order[i]!;
    const node = byId.get(id)!;
    let finish = projectDuration;
    for (const dependent of dependents.get(id) ?? []) {
      finish = Math.min(finish, ls.get(dependent)!);
    }
    lf.set(id, finish);
    ls.set(id, finish - node.duration);
  }

  const tasks = new Map<string, ScheduledTask>();
  for (const id of order) {
    const slack = ls.get(id)! - es.get(id)!;
    tasks.set(id, {
      id,
      earliestStart: es.get(id)!,
      earliestFinish: ef.get(id)!,
      latestStart: ls.get(id)!,
      latestFinish: lf.get(id)!,
      slack,
      critical: slack <= EPSILON,
    });
  }

  return { tasks, duration: projectDuration, criticalPath: extractCriticalPath(tasks, byId, dependents) };
}

/**
 * Walk one zero-slack chain from a critical source to the project finish.
 * When several exist, the first in input order is chosen.
 */
function extractCriticalPath(
  tasks: ReadonlyMap<string, ScheduledTask>,
  byId: ReadonlyMap<string, TaskNode>,
  dependents: ReadonlyMap<string, string[]>,
): string[] {
  let current: ScheduledTask | undefined;
  for (const task of tasks.values()) {
    if (task.critical && byId.get(task.id)!.dependsOn.length === 0) {
      current = task;
      break;
    }
  }
  if (!current) return [];

  const path = [current.id];
  let currentId = current.id;
  let currentFinish = current.earliestFinish;
  for (;;) {
    let next: ScheduledTask | undefined;
    for (const id of dependents.get(currentId) ?? []) {
      const candidate = tasks.get(id)!;
      if (candidate.critical && Math.abs(candidate.earliestStart - currentFinish) <= EPSILON) {
        next = candidate;
        break;
      }
    }
    if (!next) break;
    path.push(next.id);
    currentId = next.id;
    currentFinish = next.earliestFinish;
  }
  return path;
}
