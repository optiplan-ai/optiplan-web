import "server-only";
import { getDocument, COLLECTIONS } from "./db-helpers";
import { User } from "./models";
import { db } from "./db";
import { user } from "./db/schema/better-auth";
import { eq } from "drizzle-orm";

export async function getUserByEmail(email: string): Promise<(User & { id: string }) | null> {
  const result = await db.select().from(user).where(eq(user.email, email)).limit(1);
  return (result[0] as (User & { id: string }) | undefined) ?? null;
}

export async function getUserById(id: string): Promise<(User & { id: string }) | null> {
  return getDocument<User>(COLLECTIONS.users, id);
}
