import { auth } from "@/lib/auth/better-auth";
import { headers } from "next/headers";

export const getCurrent = async () => {
  try {
    // Get headers from Next.js
    const headersList = await headers();
    
    // Convert Next.js headers to Headers object
    const headersObj = new Headers();
    headersList.forEach((value, key) => {
      headersObj.set(key, value);
    });
    
    const session = await auth.api.getSession({
      headers: headersObj,
    });
    return session?.user || null;
  } catch (error) {
    console.error("getCurrent error:", error);
    return null;
  }
};
