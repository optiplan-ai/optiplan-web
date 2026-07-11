import { z } from "zod";
import { TaskStatus } from "./types";

export const createTaskSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus).optional().default(TaskStatus.TODO),
  workspaceId: z.string().trim().min(1, "Required"),
  projectId: z.string().trim().optional(),
  dueDate: z.coerce.date(),
  assigneeId: z.string().trim().min(1).optional().nullable(),
  description: z.string().optional(),
});
