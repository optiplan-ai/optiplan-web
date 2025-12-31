import { type Project } from "@/features/projects/types";

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  IN_REVIEW = "IN_REVIEW",
}

export type Task = {
  $id: string;
  id: string;
  name: string;
  status: TaskStatus;
  workspaceId: string;
  assigneeId: string;
  projectId?: string;
  position: number;
  dueDate: string;
  description?: string;
  dependsOn?: string[];
  aiSuggestedAssignees?: string[];
  createdAt: Date;
  updatedAt: Date;
};

export type TaskWithProject = Task & {
  project: (Omit<Project, "id" | "createdAt" | "updatedAt"> & { $id: string; createdAt?: string; updatedAt?: string }) | null;
};
