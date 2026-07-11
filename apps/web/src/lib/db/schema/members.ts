import { pgTable, text, timestamp, pgEnum, index } from "drizzle-orm/pg-core";
import { user } from "./better-auth";
import { workspaces } from "./workspaces";

export const memberRoleEnum = pgEnum("member_role", ["ADMIN", "MEMBER"]);

export const members = pgTable(
  "members",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    workspaceId: text("workspace_id").references(() => workspaces.id, {
      onDelete: "cascade",
    }),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    role: memberRoleEnum("role").notNull().default("MEMBER"),
    projectId: text("project_id"), // Reference to projects.id (defined separately to avoid circular dependency)
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("members_userId_idx").on(table.userId),
    workspaceIdIdx: index("members_workspaceId_idx").on(table.workspaceId),
    projectIdIdx: index("members_projectId_idx").on(table.projectId),
    userWorkspaceIdx: index("members_user_workspace_idx").on(
      table.userId,
      table.workspaceId
    ),
  })
);

export type Member = typeof members.$inferSelect;
export type NewMember = typeof members.$inferInsert;

export enum MemberRole {
  ADMIN = "ADMIN",
  MEMBER = "MEMBER",
}
