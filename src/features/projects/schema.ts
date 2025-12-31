import { z } from "zod";

export const createProjectSchema = z.object({
  name: z.string().trim().min(1, "Required"),
  image: z
    .union([
      z.instanceof(File),
      z.string().transform((value) => (value === "" ? undefined : value)),
    ])
    .optional(),
  prompt: z.string().optional(),
  workspaceId: z.string(),
  generation_type: z.enum(["manual", "ai_generated"]).optional(),
});

export const updateProjectSchema = z.object({
  name: z.string().trim().min(1, "Minimum 1 character required").optional(),
  image: z
    .union([
      z.instanceof(File),
      z.string().transform((value) => (value === "" ? undefined : value)),
    ])
    .optional(),
  prompt: z.string().optional(),
});
