import { Task } from "@/features/tasks/types";
import { UserMatch } from "./ai-client";

/**
 * Optimizes task assignment by balancing workload and considering dependencies
 */
export interface AssignmentOptimization {
  taskId: string;
  suggestedAssigneeId: string;
  confidence: number;
  reason: string;
}

/**
 * Calculate workload for each member based on their assigned tasks
 */
export function calculateWorkload(
  tasks: Task[],
  memberIds: string[]
): Map<string, number> {
  const workload = new Map<string, number>();
  
  memberIds.forEach((memberId) => {
    workload.set(memberId, 0);
  });

  tasks.forEach((task) => {
    if (task.assigneeId && workload.has(task.assigneeId)) {
      const current = workload.get(task.assigneeId) || 0;
      // Weight by task complexity/status
      let weight = 1;
      if (task.status === "IN_PROGRESS") weight = 2;
      if (task.status === "IN_REVIEW") weight = 1.5;
      if (task.status === "DONE") weight = 0;
      
      workload.set(task.assigneeId, current + weight);
    }
  });

  return workload;
}

/**
 * Check if task dependencies are satisfied
 */
export function areDependenciesSatisfied(
  task: Task,
  allTasks: Task[]
): boolean {
  if (!task.dependsOn || task.dependsOn.length === 0) {
    return true;
  }

  return task.dependsOn.every((depTaskId: string) => {
    const depTask = allTasks.find((t) => t.$id === depTaskId);
    return depTask?.status === "DONE";
  });
}

/**
 * Optimize task assignments considering:
 * 1. AI match scores
 * 2. Current workload balance
 * 3. Task dependencies
 * 4. Skill coverage
 */
export function optimizeAssignments(
  task: Task,
  aiMatches: UserMatch[],
  allTasks: Task[],
  memberIds: string[]
): AssignmentOptimization | null {
  if (aiMatches.length === 0) {
    return null;
  }

  // Calculate current workload
  const workload = calculateWorkload(allTasks, memberIds);
  const maxWorkload = Math.max(...Array.from(workload.values()));
  const minWorkload = Math.min(...Array.from(workload.values()));
  const workloadRange = maxWorkload - minWorkload || 1;

  // Score each match considering multiple factors
  const scoredMatches = aiMatches.map((match) => {
    const memberWorkload = workload.get(match.user_id) || 0;
    
    // Normalize workload (lower is better)
    const workloadScore = 1 - (memberWorkload - minWorkload) / workloadRange;
    
    // AI match score (higher is better)
    const matchScore = match.match_score;
    
    // Skill coverage (higher is better)
    const skillCoverage = match.skill_coverage;
    
    // Combined score: 50% match, 30% workload balance, 20% skill coverage
    const combinedScore =
      matchScore * 0.5 + workloadScore * 0.3 + skillCoverage * 0.2;

    return {
      ...match,
      combinedScore,
      workloadScore,
      currentWorkload: memberWorkload,
    };
  });

  // Sort by combined score
  scoredMatches.sort((a, b) => b.combinedScore - a.combinedScore);

  const bestMatch = scoredMatches[0];
  if (!bestMatch) {
    return null;
  }

  // Check dependencies
  const dependenciesSatisfied = areDependenciesSatisfied(task, allTasks);
  
  let reason = `Best match based on skills (${Math.round(bestMatch.match_score * 100)}% match)`;
  if (bestMatch.workloadScore > 0.7) {
    reason += ` and balanced workload`;
  }
  if (!dependenciesSatisfied) {
    reason += `. Warning: Dependencies not yet satisfied`;
  }

  return {
    taskId: task.$id,
    suggestedAssigneeId: bestMatch.user_id,
    confidence: bestMatch.combinedScore,
    reason,
  };
}

/**
 * Optimize assignments for multiple tasks at once
 */
export function optimizeBulkAssignments(
  tasks: Task[],
  aiMatchesMap: Map<string, UserMatch[]>,
  memberIds: string[]
): Map<string, AssignmentOptimization> {
  const results = new Map<string, AssignmentOptimization>();
  const allTasks = [...tasks];

  // Sort tasks by dependencies (tasks without dependencies first)
  const sortedTasks = [...tasks].sort((a, b) => {
    const aDeps = a.dependsOn?.length || 0;
    const bDeps = b.dependsOn?.length || 0;
    return aDeps - bDeps;
  });

  sortedTasks.forEach((task) => {
    const matches = aiMatchesMap.get(task.$id) || [];
    const optimization = optimizeAssignments(
      task,
      matches,
      allTasks,
      memberIds
    );
    if (optimization) {
      results.set(task.$id, optimization);
    }
  });

  return results;
}

