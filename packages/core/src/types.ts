/** A node in the project dependency graph, as consumed by the scheduling engine. */
export interface TaskNode {
  id: string;
  /** Expected duration in working time units (the engine is unit-agnostic). */
  duration: number;
  /** Ids of tasks that must finish before this one can start. */
  dependsOn: readonly string[];
}

/** Per-task output of the critical path method. */
export interface ScheduledTask {
  id: string;
  earliestStart: number;
  earliestFinish: number;
  latestStart: number;
  latestFinish: number;
  /** Total float: how far the task can slip without moving the project finish. */
  slack: number;
  critical: boolean;
}

export interface CpmSchedule {
  tasks: ReadonlyMap<string, ScheduledTask>;
  /** Total project duration (max earliest finish). */
  duration: number;
  /** One start-to-finish chain of zero-slack tasks. */
  criticalPath: readonly string[];
}
