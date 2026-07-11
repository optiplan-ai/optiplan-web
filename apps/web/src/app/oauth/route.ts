import { AUTH_COOKIE } from "@/features/auth/constants";
import { auth } from "@/lib/auth/better-auth";
import { cookies } from "next/headers";
import { NextRequest, NextResponse } from "next/server";

export async function GET(request: NextRequest) {
  // Better Auth handles OAuth callbacks through its API routes
  const code = request.nextUrl.searchParams.get("code");
  const state = request.nextUrl.searchParams.get("state");
  
  if (!code) {
    return new NextResponse("Invalid request", { status: 400 });
  }

  // Better Auth handles the OAuth callback
  // Redirect to home - Better Auth's API routes handle the session
  return NextResponse.redirect(`${request.nextUrl.origin}/`);
}
