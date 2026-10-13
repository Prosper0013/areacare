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
        title="Membership fees"
        subtitle="New prices apply to the next payment each member makes. Existing paid months aren't affected."
      />
      <FeesForm initial={fees} />
    </AppShell>
  );
}
