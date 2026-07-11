import "server-only";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { db } from "../db";
import * as betterAuthSchema from "../db/schema/better-auth";

export const auth = betterAuth({
  database: drizzleAdapter(db, {
    provider: "pg",
    schema: betterAuthSchema,
  }),
  emailAndPassword: {
    enabled: true,
    requireEmailVerification: false,
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // 1 day
  },
  user: {
    changeEmail: {
      enabled: true,
    },
    changePassword: {
      enabled: true,
    },
  },
  baseURL: process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000",
  basePath: "/api/auth",
  secret: process.env.BETTER_AUTH_SECRET || (() => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("BETTER_AUTH_SECRET must be set in production");
    }
    return "dev-secret-change-in-production-min-32-chars";
  })(),
  // Enable experimental joins for better performance
  experimental: {
    joins: true,
  },
});

export type Session = typeof auth.$Infer.Session;
export type User = typeof auth.$Infer.User;
