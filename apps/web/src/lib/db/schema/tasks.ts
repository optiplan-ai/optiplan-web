import { pgTable, text, timestamp, integer, pgEnum, date, index } from "drizzle-orm/pg-core";
import { workspaces } from "./workspaces";
import { projects } from "./projects";
import { user } from "./better-auth";

export const taskStatusEnum = pgEnum("task_status", [
  "BACKLOG",
  "TODO",
  "IN_PROGRESS",
  "DONE",
  "IN_REVIEW",
]);

export const tasks = pgTable(
  "tasks",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    status: taskStatusEnum("status").notNull().default("TODO"),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    assigneeId: text("assignee_id")
      .references(() => user.id, { onDelete: "set null" }),
    projectId: text("project_id").references(() => projects.id, {
      onDelete: "cascade",
    }),
    position: integer("position").notNull().default(0),
    dueDate: date("due_date").notNull(),
    description: text("description"),
    dependsOn: text("depends_on").array(), // Array of task IDs
    aiSuggestedAssignees: text("ai_suggested_assignees").array(), // Array of user IDs
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    workspaceIdIdx: index("tasks_workspaceId_idx").on(table.workspaceId),
    assigneeIdIdx: index("tasks_assigneeId_idx").on(table.assigneeId),
    projectIdIdx: index("tasks_projectId_idx").on(table.projectId),
    statusIdx: index("tasks_status_idx").on(table.status),
    dueDateIdx: index("tasks_dueDate_idx").on(table.dueDate),
    workspaceStatusIdx: index("tasks_workspace_status_idx").on(
      table.workspaceId,
      table.status
    ),
  })
);

export type Task = typeof tasks.$inferSelect;
export type NewTask = typeof tasks.$inferInsert;

export enum TaskStatus {
  BACKLOG = "BACKLOG",
  TODO = "TODO",
  IN_PROGRESS = "IN_PROGRESS",
  DONE = "DONE",
  IN_REVIEW = "IN_REVIEW",
}
