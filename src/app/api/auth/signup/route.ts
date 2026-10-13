import bcrypt from "bcryptjs";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { users } from "@/db/schema";
import { HttpError, homeFor, startSession } from "@/lib/auth";
import { handler, ok } from "@/lib/api";

const schema = z.object({
  name: z.string().trim().min(2, "Enter your full name."),
  email: z.string().trim().toLowerCase().email("Enter a valid email address."),
  phone: z
    .string()
    .trim()
    .regex(/^(\+?234|0)[789][01]\d{8}$/, "Enter a Nigerian phone number, e.g. 0803 123 4567."),
  password: z.string().min(8, "Use at least 8 characters for your password."),
});

export const POST = handler(async (req: Request) => {
  const input = schema.parse(await req.json());

  const exists = await db.query.users.findFirst({ where: eq(users.email, input.email) });
  if (exists) throw new HttpError(409, "An account with this email already exists. Log in instead.");

  const isOwner = process.env.SUPER_ADMIN_EMAIL?.toLowerCase() === input.email;
  const [user] = await db
    .insert(users)
    .values({
      name: input.name,
      email: input.email,
      phone: input.phone.replace(/\s/g, ""),
      passwordHash: await bcrypt.hash(input.password, 12),
      role: isOwner ? "SUPER_ADMIN" : "USER",
    })
    .returning();

  await startSession(user);
  return ok({ redirect: user.role === "USER" ? "/onboarding" : homeFor(user.role) });
});
