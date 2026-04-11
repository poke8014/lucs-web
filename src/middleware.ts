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

export async function middleware(request: NextRequest) {
  const hostname = request.headers.get("host") ?? "";
  const { pathname } = request.nextUrl;

  // Subdomain rewrite: scrapaholic.lucttang.dev/* → /scrapaholic/*
  if (hostname === SCRAPAHOLIC_HOST || hostname.startsWith(SCRAPAHOLIC_HOST)) {
    // Skip rewrite for assets/internals
    if (pathname.startsWith("/_next") || pathname.startsWith("/favicon")) {
      return NextResponse.next();
    }

    // Already on /scrapaholic path — don't double-rewrite
    if (!pathname.startsWith("/scrapaholic")) {
      const url = request.nextUrl.clone();
      url.pathname = `/scrapaholic${pathname}`;
      return NextResponse.rewrite(url);
    }
  }

  // Auth: protect /scrapaholic routes (not login or auth API)
  if (
    !pathname.startsWith("/scrapaholic") ||
    pathname === "/scrapaholic/login" ||
    pathname.startsWith("/api/scrapaholic-auth")
  ) {
    return NextResponse.next();
  }

  const token = request.cookies.get("scrapaholic-auth")?.value;
  const expected = process.env.SCRAPAHOLIC_PASSWORD;

  if (!expected || !token) {
    return NextResponse.redirect(new URL("/scrapaholic/login", request.url));
  }

  if (!(await verifyAuthToken(token, expected))) {
    const response = NextResponse.redirect(
      new URL("/scrapaholic/login", request.url)
    );
    response.cookies.delete("scrapaholic-auth");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
