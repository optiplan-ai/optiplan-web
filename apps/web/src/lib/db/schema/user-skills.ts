import { pgTable, text, timestamp, integer, real, index } from "drizzle-orm/pg-core";
import { members } from "./members";
import { workspaces } from "./workspaces";

export const userSkills = pgTable(
  "user_skills",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    memberId: text("member_id")
      .notNull()
      .references(() => members.id, { onDelete: "cascade" }),
    workspaceId: text("workspace_id")
      .notNull()
      .references(() => workspaces.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    category: text("category").notNull(),
    experienceYears: real("experience_years").notNull().default(0),
    proficiencyScore: integer("proficiency_score").notNull().default(0),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    memberIdIdx: index("user_skills_memberId_idx").on(table.memberId),
    workspaceIdIdx: index("user_skills_workspaceId_idx").on(table.workspaceId),
    categoryIdx: index("user_skills_category_idx").on(table.category),
    memberWorkspaceIdx: index("user_skills_member_workspace_idx").on(
      table.memberId,
      table.workspaceId
    ),
  })
);

export type UserSkill = typeof userSkills.$inferSelect;
export type NewUserSkill = typeof userSkills.$inferInsert;
