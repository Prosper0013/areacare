import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HttpError, homeFor, startSession } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { hasHouseDetails } from "@/lib/membership";

const schema = z.object({
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  password: z.string().min(1, "Enter your password."),
  next: z.string().optional(),
});

export const POST = handler(async (req: Request) => {
  const input = schema.parse(await req.json());
  let user = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (!user || !(await bcrypt.compare(input.password, user.passwordHash))) {
    throw new HttpError(401, "That email and password don't match an account.");
  }
  // The owner account (SUPER_ADMIN_EMAIL in Vercel) always gets super admin access.
  if (user.role !== "SUPER_ADMIN" && process.env.SUPER_ADMIN_EMAIL?.trim().toLowerCase() === user.email) {
    [user] = await db.update(users).set({ role: "SUPER_ADMIN" }).where(eq(users.id, user.id)).returning();
  }
  await startSession(user);

  let redirect = homeFor(user.role);
  if (user.role === "USER" && !hasHouseDetails(user)) redirect = "/onboarding";
  if (input.next?.startsWith("/") && !input.next.startsWith("//")) redirect = input.next;
  return ok({ redirect });
});
