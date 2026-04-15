import { NextRequest, NextResponse } from "next/server";

const SCRAPAHOLIC_HOST = "scrapaholic.lucttang.dev";

async function verifyAuthToken(token: string, password: string) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password + "_scrapaholic_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return (
    token ===
    Array.from(new Uint8Array(hashBuffer))
      .map((b) => b.toString(16).padStart(2, "0"))
      .join("")
  );
}

async function isAuthenticated(request: NextRequest): Promise<boolean> {
  const token = request.cookies.get("scrapaholic-auth")?.value;
  const expected = process.env.SCRAPAHOLIC_PASSWORD;
  if (!expected || !token) return false;
  return verifyAuthToken(token, expected);
}

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;
  const isSubdomain = hostname === SCRAPAHOLIC_HOST;

  // Block /scrapaholic on the main domain — only accessible via subdomain
  // Allow direct access in local dev for manual testing
  if (!isSubdomain) {
    if (
      pathname.startsWith("/scrapaholic") &&
      process.env.NODE_ENV !== "development"
    ) {
      return NextResponse.rewrite(new URL("/not-found", request.url));
    }
    return NextResponse.next();
  }

  // Skip rewrite for assets/internals
  if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
    return NextResponse.next();
  }

  // Allow login page and auth API through without auth
  if (pathname === "/login" || pathname.startsWith("/api/scrapaholic-auth")) {
    if (pathname === "/login") {
      const url = request.nextUrl.clone();
      url.pathname = "/scrapaholic/login";
      return NextResponse.rewrite(url);
    }
    return NextResponse.next();
  }

  // Check auth before rewriting
  if (!(await isAuthenticated(request))) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  // Authenticated — rewrite to /scrapaholic/*
  const url = request.nextUrl.clone();
  url.pathname = `/scrapaholic${pathname}`;
  return NextResponse.rewrite(url);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
