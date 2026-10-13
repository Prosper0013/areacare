import { revalidatePath } from "next/cache";
import { z } from "zod";
import { apiUser } from "@/lib/auth";
import { handler, ok } from "@/lib/api";
import { getFees, setFees } from "@/lib/settings";

export const GET = handler(async () => {
  await apiUser(["SUPER_ADMIN"]);
  return ok(await getFees());
});

export const PUT = handler(async (req: Request) => {
  await apiUser(["SUPER_ADMIN"]);
  const fees = z
    .object({
      registrationFee: z.number().int().min(100, "Registration fee must be at least ₦100.").max(10_000_000),
      monthlyFee: z.number().int().min(100, "Monthly fee must be at least ₦100.").max(10_000_000),
      soakawayFee: z.number().int().min(100, "Soakaway evacuation must cost at least ₦100.").max(10_000_000).optional(),
    })
    .parse(await req.json());
  await setFees(fees);
  revalidatePath("/"); // the home page shows the prices
  return ok(fees);
});
