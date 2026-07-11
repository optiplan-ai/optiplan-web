import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";

export const projectGenerationTypeEnum = pgEnum("project_generation_type", [
  "manual",
  "ai_generated",
]);

export const projects = pgTable(
  "projects",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    generationType: projectGenerationTypeEnum("generation_type"),
    prompt: text("prompt"),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("projects_workspaceId_idx").on(table.workspaceId),
    createdAtIdx: index("projects_createdAt_idx").on(table.createdAt),
  })
);

export type Project = typeof projects.$inferSelect;
export type NewProject = typeof projects.$inferInsert;

export enum ProjectGenerationType {
  MANUAL = "manual",
  AI_GENERATED = "ai_generated",
}
