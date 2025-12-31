"use server";

import { auth } from "./auth/better-auth";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

export async function signUpWithGithub() {
  const origin = (await headers()).get("origin") || "http://localhost:3000";
  
  // Better Auth handles OAuth through its API routes
  const redirectUrl = `${origin}/api/auth/sign-in/social?provider=github&callbackURL=${encodeURIComponent(`${origin}/oauth`)}`;
  
  return redirect(redirectUrl);
}

export async function signUpWithGoogle() {
  const origin = (await headers()).get("origin") || "http://localhost:3000";
  
  // Better Auth handles OAuth through its API routes
  const redirectUrl = `${origin}/api/auth/sign-in/social?provider=google&callbackURL=${encodeURIComponent(`${origin}/oauth`)}`;
  
  return redirect(redirectUrl);
}
