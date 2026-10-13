import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type Role, type User } from "@/db/schema";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, signSession, verifySession } from "./session";
import { refreshMembership } from "./membership";

export const STAFF_ROLES: Role[] = ["STAFF", "ADMIN", "SUPER_ADMIN"];
export const MANAGEMENT_ROLES: Role[] = ["ADMIN", "SUPER_ADMIN"];

export async function startSession(user: Pick<User, "id" | "role" | "name">) {
  const token = await signSession({ sub: user.id, role: user.role, name: user.name });
  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    // Secure everywhere the app is served over HTTPS (all Vercel deployments).
    secure: (process.env.NEXT_PUBLIC_APP_URL ?? "").startsWith("https://") || !!process.env.VERCEL,
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function endSession() {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

/** The signed-in user, freshly loaded from the database (or null). */
export async function currentUser(): Promise<User | null> {
  const jar = await cookies();
  const session = await verifySession(jar.get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.query.users.findFirst({ where: eq(users.id, session.sub) });
  if (!user) return null;
  return refreshMembership(user);
}

/** For pages: redirect to login if signed out, or home if the role is not allowed. */
export async function requireUser(roles?: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user) redirect("/login");
  if (roles && !roles.includes(user.role)) redirect(homeFor(user.role));
  return user;
}

export function homeFor(role: Role) {
  if (role === "SUPER_ADMIN") return "/admin";
  if (role === "ADMIN" || role === "STAFF") return "/ops";
  return "/dashboard";
}

export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
  }
}

/** For API routes: throws HttpError instead of redirecting. */
export async function apiUser(roles?: Role[]): Promise<User> {
  const user = await currentUser();
  if (!user) throw new HttpError(401, "Sign in to continue.");
  if (roles && !roles.includes(user.role)) throw new HttpError(403, "You don't have access to this.");
  return user;
}
