import { Hono } from "hono";
import { zValidator } from "@hono/zod-validator";
import { loginSchema, signupSchema } from "../schemas";
import { auth } from "@/lib/auth/better-auth";
import { sessionMiddleware } from "@/lib/session-middleware";

const app = new Hono()
  .get("/current", sessionMiddleware, async (c) => {
    const user = c.get("user");
    return c.json({ data: user });
  })
  .post("/login", zValidator("json", loginSchema), async (c) => {
    const { email, password } = c.req.valid("json");
    
    try {
      // Use Better Auth's API method directly (server-side)
      const result = await auth.api.signInEmail({
        body: {
          email,
          password,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      // Forward cookies from Better Auth response
      const setCookie = result.headers.get("set-cookie");
      if (setCookie) {
        c.header("set-cookie", setCookie);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error("Login error:", error);
      return c.json({ 
        error: error.message || "Invalid credentials" 
      }, error.status || 401);
    }
  })
  .post("/signup", zValidator("json", signupSchema), async (c) => {
    const { name, email, password } = c.req.valid("json");
    
    try {
      // Use Better Auth's API method directly (server-side)
      const result = await auth.api.signUpEmail({
        body: {
          email,
          password,
          name,
        },
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      // Forward cookies from Better Auth response
      const setCookie = result.headers.get("set-cookie");
      if (setCookie) {
        c.header("set-cookie", setCookie);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error("Signup error:", error);
      return c.json({ 
        error: error.message || error.status === 400 ? "Failed to create account" : "An error occurred" 
      }, error.status || 400);
    }
  })
  .post("/logout", sessionMiddleware, async (c) => {
    try {
      // Use Better Auth's API method directly (server-side)
      const result = await auth.api.signOut({
        headers: c.req.raw.headers,
        returnHeaders: true,
      });

      // Forward cookies from Better Auth response
      const setCookie = result.headers.get("set-cookie");
      if (setCookie) {
        c.header("set-cookie", setCookie);
      }

      return c.json({ success: true });
    } catch (error: any) {
      console.error("Logout error:", error);
      return c.json({ error: "Failed to log out" }, 500);
    }
  });

export default app;
