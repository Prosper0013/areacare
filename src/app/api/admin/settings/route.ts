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
  const current = await getFees();
  const input = z
    .object({
      registrationFee: z.number().int().min(100, "Registration fee must be at least ₦100.").max(10_000_000).optional(),
      registrationCredit: z.number().int().min(0, "Starting credit can't be negative.").max(10_000_000).optional(),
      binPrice: z.number().int().min(50, "Price per trash can must be at least ₦50.").max(1_000_000).optional(),
      soakawayFee: z.number().int().min(100, "Soakaway evacuation must cost at least ₦100.").max(10_000_000).optional(),
    })
    .refine(
      (f) => (f.registrationCredit ?? current.registrationCredit) <= (f.registrationFee ?? current.registrationFee),
      { message: "Starting credit can't be more than the registration fee.", path: ["registrationCredit"] },
    )
    .parse(await req.json());
  await setFees(input);
  revalidatePath("/"); // the home page shows the prices
  return ok(await getFees());
});
