import { asc } from "drizzle-orm";
import { db } from "@/db";
import { zones } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { HouseForm } from "@/components/forms/HouseForm";
import { Stepper } from "@/components/Stepper";

export const metadata = { title: "House details" };
export const dynamic = "force-dynamic";

export default async function OnboardingPage() {
  const user = await requireUser(["USER"]);
  const zoneList = await db.select().from(zones).orderBy(asc(zones.name));
  const editing = Boolean(user.registeredAt);

  return (
    <AppShell user={user}>
      {!editing && <Stepper current={2} />}
      <PageTitle
        title={editing ? "Your house details" : "Where should we collect from?"}
        subtitle="Crews see these details and the pin on your gate every time you request a pickup."
      />
      <HouseForm
        zones={zoneList}
        initial={user}
        submitLabel={editing ? "Save changes" : "Continue to registration"}
      />
    </AppShell>
  );
}
