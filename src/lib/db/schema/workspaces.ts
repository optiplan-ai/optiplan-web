import { pgTable, text, timestamp, index } from "drizzle-orm/pg-core";
import { user } from "./better-auth";

export const workspaces = pgTable(
  "workspaces",
  {
    id: text("id").primaryKey().$defaultFn(() => crypto.randomUUID()),
    name: text("name").notNull(),
    imageUrl: text("image_url"),
    inviteCode: text("invite_code").notNull(),
    userId: text("user_id")
      .notNull()
      .references(() => user.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").notNull().defaultNow(),
    updatedAt: timestamp("updated_at").notNull().defaultNow(),
  },
  (table) => ({
    userIdIdx: index("workspaces_userId_idx").on(table.userId),
    inviteCodeIdx: index("workspaces_inviteCode_idx").on(table.inviteCode),
    createdAtIdx: index("workspaces_createdAt_idx").on(table.createdAt),
  })
);

export type Workspace = typeof workspaces.$inferSelect;
export type NewWorkspace = typeof workspaces.$inferInsert;
