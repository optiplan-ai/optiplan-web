import "server-only";
import { db } from "./db";
import { eq, and, inArray, desc, asc, sql } from "drizzle-orm";
import {
  workspaces,
  members,
  projects,
  tasks,
  userSkills,
  type Workspace,
  type Member,
  type Project,
  type Task,
  type UserSkill,
} from "./db/schema";
import { user, type User } from "./db/schema/better-auth";

export const COLLECTIONS = {
  users: "user", // Better Auth uses "user" table
  workspaces: "workspaces",
  members: "members",
  projects: "projects",
  tasks: "tasks",
  userSkills: "user_skills",
} as const;

// Helper to convert database record to API response format (with $id)
export function toApiResponse<T extends { id: string }>(
  doc: T | null
): (Omit<T, "id"> & { $id: string }) | null {
  if (!doc) return null;
  const { id, ...rest } = doc;
  return {
    ...rest,
    $id: id,
  } as Omit<T, "id"> & { $id: string };
}

export function toApiResponseArray<T extends { id: string }>(
  docs: T[]
): (Omit<T, "id"> & { $id: string })[] {
  return docs.map(toApiResponse).filter((doc): doc is Omit<T, "id"> & { $id: string } => doc !== null);
}

export function toObjectId(id: string | undefined): string | undefined {
  return id;
}

// Database operations
export async function createDocument<T extends { id?: string; createdAt?: Date; updatedAt?: Date }>(
  collection: string,
  data: Omit<T, "id" | "createdAt" | "updatedAt">
): Promise<T & { id: string }> {
  const now = new Date();
  
  switch (collection) {
    case COLLECTIONS.users: {
      // Use Better Auth's user table
      const [result] = await db.insert(user).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    case COLLECTIONS.workspaces: {
      const [result] = await db.insert(workspaces).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    case COLLECTIONS.members: {
      const [result] = await db.insert(members).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    case COLLECTIONS.projects: {
      const [result] = await db.insert(projects).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    case COLLECTIONS.tasks: {
      const [result] = await db.insert(tasks).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    case COLLECTIONS.userSkills: {
      const [result] = await db.insert(userSkills).values({
        ...(data as any),
        createdAt: now,
        updatedAt: now,
      }).returning();
      return result as unknown as T & { id: string };
    }
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

export async function getDocument<T>(
  collection: string,
  id: string
): Promise<(T & { id: string }) | null> {
  switch (collection) {
    case COLLECTIONS.users: {
      // Use Better Auth's user table
      const result = await db.select().from(user).where(eq(user.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.workspaces: {
      const result = await db.select().from(workspaces).where(eq(workspaces.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.members: {
      const result = await db.select().from(members).where(eq(members.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.projects: {
      const result = await db.select().from(projects).where(eq(projects.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.tasks: {
      const result = await db.select().from(tasks).where(eq(tasks.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.userSkills: {
      const result = await db.select().from(userSkills).where(eq(userSkills.id, id)).limit(1);
      return (result[0] as (T & { id: string }) | undefined) ?? null;
    }
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

export async function updateDocument<T>(
  collection: string,
  id: string,
  data: Partial<Omit<T, "id" | "createdAt">>
): Promise<(T & { id: string }) | null> {
  const updateData = {
    ...data,
    updatedAt: new Date(),
  };

  switch (collection) {
    case COLLECTIONS.users: {
      // Use Better Auth's user table
      const [result] = await db
        .update(user)
        .set(updateData as any)
        .where(eq(user.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.workspaces: {
      const [result] = await db
        .update(workspaces)
        .set(updateData as any)
        .where(eq(workspaces.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.members: {
      const [result] = await db
        .update(members)
        .set(updateData as any)
        .where(eq(members.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.projects: {
      const [result] = await db
        .update(projects)
        .set(updateData as any)
        .where(eq(projects.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.tasks: {
      const [result] = await db
        .update(tasks)
        .set(updateData as any)
        .where(eq(tasks.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    case COLLECTIONS.userSkills: {
      const [result] = await db
        .update(userSkills)
        .set(updateData as any)
        .where(eq(userSkills.id, id))
        .returning();
      return (result as (T & { id: string }) | undefined) ?? null;
    }
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

export async function deleteDocument(
  collection: string,
  id: string
): Promise<boolean> {
  switch (collection) {
    case COLLECTIONS.users:
      await db.delete(user).where(eq(user.id, id));
      return true;
    case COLLECTIONS.workspaces:
      await db.delete(workspaces).where(eq(workspaces.id, id));
      return true;
    case COLLECTIONS.members:
      await db.delete(members).where(eq(members.id, id));
      return true;
    case COLLECTIONS.projects:
      await db.delete(projects).where(eq(projects.id, id));
      return true;
    case COLLECTIONS.tasks:
      await db.delete(tasks).where(eq(tasks.id, id));
      return true;
    case COLLECTIONS.userSkills:
      await db.delete(userSkills).where(eq(userSkills.id, id));
      return true;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

export async function listDocuments<T>(
  collection: string,
  filter: Record<string, any> = {},
  options: {
    limit?: number;
    offset?: number;
    sort?: Record<string, 1 | -1>;
  } = {}
): Promise<{ documents: (T & { id: string })[]; total: number }> {
  // Build where conditions
  const conditions: any[] = [];
  
  for (const [key, value] of Object.entries(filter)) {
    if (value === undefined || value === null) continue;
    
    if (key === "id" || key === "_id") {
      if (Array.isArray(value)) {
        // Handle $in operator
        conditions.push(inArray(getIdColumn(collection), value));
      } else if (typeof value === "object" && "$in" in value) {
        conditions.push(inArray(getIdColumn(collection), value.$in));
      } else {
        conditions.push(eq(getIdColumn(collection), value));
      }
    } else if (key.endsWith("Id") || key.endsWith("_id")) {
      const column = getColumn(collection, key);
      if (Array.isArray(value)) {
        conditions.push(inArray(column, value));
      } else if (typeof value === "object" && "$in" in value) {
        conditions.push(inArray(column, value.$in));
      } else {
        conditions.push(eq(column, value));
      }
    } else {
      const column = getColumn(collection, key);
      if (Array.isArray(value)) {
        conditions.push(inArray(column, value));
      } else if (typeof value === "object" && "$in" in value) {
        conditions.push(inArray(column, value.$in));
      } else {
        conditions.push(eq(column, value));
      }
    }
  }

  const whereClause = conditions.length > 0 ? and(...conditions) : undefined;

  // Build query
  let query: any;
  switch (collection) {
    case COLLECTIONS.users:
      query = db.select().from(user);
      break;
    case COLLECTIONS.workspaces:
      query = db.select().from(workspaces);
      break;
    case COLLECTIONS.members:
      query = db.select().from(members);
      break;
    case COLLECTIONS.projects:
      query = db.select().from(projects);
      break;
    case COLLECTIONS.tasks:
      query = db.select().from(tasks);
      break;
    case COLLECTIONS.userSkills:
      query = db.select().from(userSkills);
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  if (whereClause) {
    query = query.where(whereClause);
  }

  // Apply sorting
  if (options.sort) {
    for (const [key, direction] of Object.entries(options.sort)) {
      const column = getColumn(collection, key);
      query = query.orderBy(direction === 1 ? asc(column) : desc(column));
    }
  } else {
    // Default sort by createdAt descending
    const createdAtColumn = getColumn(collection, "createdAt");
    if (createdAtColumn) {
      query = query.orderBy(desc(createdAtColumn));
    }
  }

  // Apply pagination
  if (options.offset) {
    query = query.offset(options.offset);
  }
  if (options.limit) {
    query = query.limit(options.limit);
  }

  const documents = await query;

  // Get total count
  let countQuery: any;
  switch (collection) {
    case COLLECTIONS.users:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(user);
      break;
    case COLLECTIONS.workspaces:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(workspaces);
      break;
    case COLLECTIONS.members:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(members);
      break;
    case COLLECTIONS.projects:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(projects);
      break;
    case COLLECTIONS.tasks:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(tasks);
      break;
    case COLLECTIONS.userSkills:
      countQuery = db.select({ count: sql<number>`count(*)` }).from(userSkills);
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  if (whereClause) {
    countQuery = countQuery.where(whereClause);
  }

  const [{ count: total }] = await countQuery;

  return {
    documents: documents as (T & { id: string })[],
    total: Number(total),
  };
}

// Helper functions to get columns
function getIdColumn(collection: string) {
  switch (collection) {
    case COLLECTIONS.users:
      return user.id;
    case COLLECTIONS.workspaces:
      return workspaces.id;
    case COLLECTIONS.members:
      return members.id;
    case COLLECTIONS.projects:
      return projects.id;
    case COLLECTIONS.tasks:
      return tasks.id;
    case COLLECTIONS.userSkills:
      return userSkills.id;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }
}

function getColumn(collection: string, key: string): any {
  // Map camelCase to snake_case for database columns
  const columnMap: Record<string, any> = {};
  
  switch (collection) {
    case COLLECTIONS.users:
      columnMap["id"] = user.id;
      columnMap["email"] = user.email;
      columnMap["name"] = user.name;
      columnMap["emailVerified"] = user.emailVerified;
      columnMap["image"] = user.image;
      columnMap["createdAt"] = user.createdAt;
      columnMap["updatedAt"] = user.updatedAt;
      break;
    case COLLECTIONS.workspaces:
      columnMap["id"] = workspaces.id;
      columnMap["name"] = workspaces.name;
      columnMap["imageUrl"] = workspaces.imageUrl;
      columnMap["inviteCode"] = workspaces.inviteCode;
      columnMap["userId"] = workspaces.userId;
      columnMap["createdAt"] = workspaces.createdAt;
      columnMap["updatedAt"] = workspaces.updatedAt;
      break;
    case COLLECTIONS.members:
      columnMap["id"] = members.id;
      columnMap["workspaceId"] = members.workspaceId;
      columnMap["userId"] = members.userId;
      columnMap["role"] = members.role;
      columnMap["projectId"] = members.projectId;
      columnMap["createdAt"] = members.createdAt;
      columnMap["updatedAt"] = members.updatedAt;
      break;
    case COLLECTIONS.projects:
      columnMap["id"] = projects.id;
      columnMap["name"] = projects.name;
      columnMap["imageUrl"] = projects.imageUrl;
      columnMap["workspaceId"] = projects.workspaceId;
      columnMap["generationType"] = projects.generationType;
      columnMap["prompt"] = projects.prompt;
      columnMap["createdAt"] = projects.createdAt;
      columnMap["updatedAt"] = projects.updatedAt;
      break;
    case COLLECTIONS.tasks:
      columnMap["id"] = tasks.id;
      columnMap["name"] = tasks.name;
      columnMap["status"] = tasks.status;
      columnMap["workspaceId"] = tasks.workspaceId;
      columnMap["assigneeId"] = tasks.assigneeId;
      columnMap["projectId"] = tasks.projectId;
      columnMap["position"] = tasks.position;
      columnMap["dueDate"] = tasks.dueDate;
      columnMap["description"] = tasks.description;
      columnMap["dependsOn"] = tasks.dependsOn;
      columnMap["aiSuggestedAssignees"] = tasks.aiSuggestedAssignees;
      columnMap["createdAt"] = tasks.createdAt;
      columnMap["updatedAt"] = tasks.updatedAt;
      break;
    case COLLECTIONS.userSkills:
      columnMap["id"] = userSkills.id;
      columnMap["memberId"] = userSkills.memberId;
      columnMap["workspaceId"] = userSkills.workspaceId;
      columnMap["name"] = userSkills.name;
      columnMap["category"] = userSkills.category;
      columnMap["experienceYears"] = userSkills.experienceYears;
      columnMap["proficiencyScore"] = userSkills.proficiencyScore;
      columnMap["createdAt"] = userSkills.createdAt;
      columnMap["updatedAt"] = userSkills.updatedAt;
      break;
    default:
      throw new Error(`Unknown collection: ${collection}`);
  }

  // Handle both camelCase and snake_case
  const camelKey = key;
  const snakeKey = camelKey.replace(/([A-Z])/g, "_$1").toLowerCase();
  
  return columnMap[camelKey] || columnMap[snakeKey] || columnMap[key];
}
