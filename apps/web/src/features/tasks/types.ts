import { type Project } from "@/features/projects/types";

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  IN_REVIEW = "IN_REVIEW",
}

/** Task as serialized over the API (dates become ISO strings in JSON). */
export type Task = {
  id: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string | null;
  projectId: string | null;
  position: number;
  dueDate: string;
  description?: string | null;
  dependsOn?: string[] | null;
  aiSuggestedAssignees?: string[] | null;
  createdAt: string;
  updatedAt: string;
};

export type TaskAssignee = {
  id: string;
  name: string;
  email?: string;
};

/** Task enriched by list/detail endpoints with its project and assignee. */
export type PopulatedTask = Task & {
  project: Project | null;
  assignee?: TaskAssignee | null;
};

/** @deprecated use PopulatedTask */
export type TaskWithProject = PopulatedTask;
