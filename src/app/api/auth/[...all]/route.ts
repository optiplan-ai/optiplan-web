import { auth } from "@/lib/auth/better-auth";
import { toNextJsHandler } from "better-auth/next-js";
import { NextRequest, NextResponse } from "next/server";

const handler = toNextJsHandler(auth);

// Handle custom routes by mapping them to Better Auth API calls
export async function POST(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const route = pathname.replace("/api/auth/", "");
  
  // Handle custom /signup route
  if (route === "signup") {
    try {
      const body = await request.json();
      
      // Convert Next.js headers to Headers object
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });
      
      const result = await auth.api.signUpEmail({
        body: {
          email: body.email,
          password: body.password,
          name: body.name,
        },
        headers: headers,
        returnHeaders: true,
      });
      
      const response = NextResponse.json({ success: true });
      // result is { headers: Headers, response: any } when returnHeaders is true
      const setCookie = result.headers?.get("set-cookie");
      if (setCookie) {
        response.headers.set("set-cookie", setCookie);
      }
      return response;
    } catch (error: any) {
      console.error("Signup error details:", {
        message: error.message,
        status: error.status,
        error: error,
        stack: error.stack,
      });
      
      // Better Auth APIError handling
      const errorMessage = error.message || "Failed to create account";
      const statusCode = error.status || error.statusCode || 400;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
  }
  
  // Handle custom /login route
  if (route === "login") {
    try {
      const body = await request.json();
      
      // Convert Next.js headers to Headers object
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });
      
      const result = await auth.api.signInEmail({
        body: {
          email: body.email,
          password: body.password,
        },
        headers: headers,
        returnHeaders: true,
      });
      
      const response = NextResponse.json({ success: true });
      // Better Auth may return multiple set-cookie headers
      if (result.headers) {
        const setCookieHeader = result.headers.get("set-cookie");
        if (setCookieHeader) {
          // Handle multiple cookies (they may be comma-separated or in multiple headers)
          const cookies = setCookieHeader.split(/, (?=[^;]+=)/);
          cookies.forEach((cookie: string) => {
            response.headers.append("set-cookie", cookie.trim());
          });
        }
      }
      return response;
    } catch (error: any) {
      console.error("Login error details:", {
        message: error.message,
        status: error.status,
        error: error,
      });
      
      const errorMessage = error.message || "Invalid credentials";
      const statusCode = error.status || error.statusCode || 401;
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
  }
  
  // Handle custom /logout route
  if (route === "logout") {
    try {
      // Convert Next.js headers to Headers object
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });
      
      const result = await auth.api.signOut({
        headers: headers,
        returnHeaders: true,
      });
      
      const response = NextResponse.json({ success: true });
      // Better Auth may return multiple set-cookie headers
      if (result.headers) {
        const setCookieHeader = result.headers.get("set-cookie");
        if (setCookieHeader) {
          // Handle multiple cookies (they may be comma-separated or in multiple headers)
          const cookies = setCookieHeader.split(/, (?=[^;]+=)/);
          cookies.forEach((cookie: string) => {
            response.headers.append("set-cookie", cookie.trim());
          });
        }
      }
      return response;
    } catch (error: any) {
      console.error("Logout error:", error);
      return NextResponse.json(
        { error: "Failed to log out" },
        { status: 500 }
      );
    }
  }
  
  // Handle all other routes with Better Auth's handler
  return handler.POST(request);
}

export async function GET(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const route = pathname.replace("/api/auth/", "");
  
  // Handle custom /current route
  if (route === "current") {
    try {
      // Convert Next.js headers to Headers object
      const headers = new Headers();
      request.headers.forEach((value, key) => {
        headers.set(key, value);
      });
      
      // Use Better Auth's getSession API
      const result = await auth.api.getSession({
        headers: headers,
      });
      
      if (!result || !result.user) {
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
      
      // Return user data in the expected format
      return NextResponse.json({
        data: {
          id: result.user.id,
          email: result.user.email,
          name: result.user.name || "",
          emailVerified: result.user.emailVerified ?? false,
          image: result.user.image ?? null,
          createdAt: result.user.createdAt,
          updatedAt: result.user.updatedAt,
          $id: result.user.id,
        },
      });
    } catch (error: any) {
      console.error("Get current user error:", error);
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
  }
  
  // Handle all other routes with Better Auth's handler
  return handler.GET(request);
}

