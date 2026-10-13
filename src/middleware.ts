import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

const PROTECTED = ["/dashboard", "/onboarding", "/membership", "/payments", "/soakaway", "/notifications", "/ops", "/admin"];
const STAFF_ONLY = ["/ops"];
const SUPER_ONLY = ["/admin"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);

  if (!session && PROTECTED.some((p) => pathname.startsWith(p))) {
    const url = new URL("/login", req.url);
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (session) {
    if (STAFF_ONLY.some((p) => pathname.startsWith(p)) && session.role === "USER") {
      return NextResponse.redirect(new URL("/dashboard", req.url));
    }
    if (SUPER_ONLY.some((p) => pathname.startsWith(p)) && session.role !== "SUPER_ADMIN") {
      return NextResponse.redirect(new URL(session.role === "USER" ? "/dashboard" : "/ops", req.url));
    }
    if (pathname === "/login" || pathname === "/signup") {
      const home = session.role === "SUPER_ADMIN" ? "/admin" : session.role === "USER" ? "/dashboard" : "/ops";
      return NextResponse.redirect(new URL(home, req.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/onboarding/:path*",
    "/membership/:path*",
    "/payments/:path*",
    "/soakaway/:path*",
    "/notifications/:path*",
    "/ops/:path*",
    "/admin/:path*",
    "/login",
    "/signup",
  ],
};
