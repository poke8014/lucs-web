import { NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // Only protect /scrapaholic routes (not login or auth API)
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

  // Verify token matches the expected hash
  const encoder = new TextEncoder();
  const data = encoder.encode(expected + "_scrapaholic_salt");
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const expectedToken = Array.from(new Uint8Array(hashBuffer))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

  if (token !== expectedToken) {
    const response = NextResponse.redirect(
      new URL("/scrapaholic/login", request.url)
    );
    response.cookies.delete("scrapaholic-auth");
    return response;
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/scrapaholic/:path*"],
};
