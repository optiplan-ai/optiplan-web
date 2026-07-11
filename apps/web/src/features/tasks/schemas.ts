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

/**
 * Client-side form schema: no coercion (the DatePicker already yields a Date),
 * so zod input and output types match and react-hook-form resolves cleanly.
 */
export const taskFormSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  status: z.nativeEnum(TaskStatus),
  projectId: z.string().trim().optional(),
  dueDate: z.date(),
  assigneeId: z.string().trim().min(1).optional().nullable(),
  description: z.string().optional(),
});

export type TaskFormValues = z.infer<typeof taskFormSchema>;
