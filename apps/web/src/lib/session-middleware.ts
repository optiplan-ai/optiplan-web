import "server-only";
import { createMiddleware } from "hono/factory";
import { auth } from "./auth/better-auth";
import { User } from "./models";

type AdditionalContext = {
  Variables: {
    user: User & { id: string; $id: string };
    userId: string;
  };
};

export const sessionMiddleware = createMiddleware<AdditionalContext>(
  async (c, next) => {
    try {
      // Create a proper request object for Better Auth
      const url = new URL(
        "/api/auth/get-session",
        process.env.BETTER_AUTH_URL || process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000"
      );
      
      const request = new Request(url.toString(), {
        method: "GET",
        headers: {
          "Cookie": c.req.header("cookie") || "",
        },
      });

      const response = await auth.handler(request);
      
      if (!response || !response.ok) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      const sessionData = await response.json().catch(() => null);
      
      if (!sessionData || !sessionData.user) {
        return c.json({ error: "Unauthorized" }, 401);
      }

      // Convert Better Auth user to our API format (with $id)
      const userWithId: User & { id: string; $id: string } = {
        id: sessionData.user.id,
        email: sessionData.user.email,
        name: sessionData.user.name || "",
        emailVerified: sessionData.user.emailVerified ?? false,
        image: sessionData.user.image ?? null,
        createdAt: sessionData.user.createdAt 
          ? new Date(sessionData.user.createdAt) 
          : new Date(),
        updatedAt: sessionData.user.updatedAt 
          ? new Date(sessionData.user.updatedAt) 
          : new Date(),
        $id: sessionData.user.id,
      };

      c.set("user", userWithId);
      c.set("userId", sessionData.user.id);
      await next();
    } catch (error) {
      console.error("Session middleware error:", error);
      return c.json({ error: "Unauthorized" }, 401);
    }
  }
);
