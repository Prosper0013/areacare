import { requireUser } from "@/lib/auth";
import { getFees } from "@/lib/settings";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { FeesForm } from "@/components/admin/FeesForm";

export const metadata = { title: "Fees" };
export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const user = await requireUser(["SUPER_ADMIN"]);
  const fees = await getFees();
  return (
    <AppShell user={user}>
      <PageTitle
        title="Prices"
        subtitle="New prices apply to the next payment or booking. Months already paid and existing bookings keep their price."
      />
      <FeesForm initial={fees} />
    </AppShell>
  );
}
