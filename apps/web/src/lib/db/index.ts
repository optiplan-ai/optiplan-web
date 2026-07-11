import "server-only";
import { drizzle } from "drizzle-orm/neon-http";
import { neon } from "@neondatabase/serverless";
import * as schema from "./schema";

if (!process.env.DATABASE_URL) {
  throw new Error("Please add your DATABASE_URL to .env.local");
}

const sql = neon(process.env.DATABASE_URL);
export const db = drizzle(sql, { schema });

export * from "./schema";

// Connection pool configuration for scalability
// Neon serverless handles connection pooling automatically
// For better performance, consider using connection pooling in production
