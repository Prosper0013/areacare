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
        subtitle="Pay-as-you-go prices. Changes apply to the next registration, pickup or booking — credit already in members' accounts is not touched."
      />
      <FeesForm initial={fees} />
    </AppShell>
  );
}
