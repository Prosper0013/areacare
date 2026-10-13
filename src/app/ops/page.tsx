import { STAFF_ROLES, requireUser } from "@/lib/auth";
import { boardPickups, visibleZoneIds } from "@/lib/ops";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { LiveBoard, type BoardPickup } from "@/components/ops/LiveBoard";
import { PushToggle } from "@/components/shell/PushToggle";
import { StatusBanner } from "@/components/StatusBanner";

export const metadata = { title: "Live board" };
export const dynamic = "force-dynamic";

export default async function OpsPage() {
  const user = await requireUser(STAFF_ROLES);
  const [rows, clearedRows, zones] = await Promise.all([
    boardPickups(user, "open"),
    boardPickups(user, "cleared"),
    visibleZoneIds(user),
  ]);
  const initial = JSON.parse(JSON.stringify(rows)) as BoardPickup[];
  const initialCleared = JSON.parse(JSON.stringify(clearedRows)) as BoardPickup[];

  return (
    <AppShell user={user}>
      <PageTitle
        title="Live board"
        subtitle={
          user.role === "STAFF"
            ? "Open requests in the zones your team covers. This page refreshes on its own."
            : "Every open request across all zones. This page refreshes on its own."
        }
      />
      {zones && zones.length === 0 && (
        <StatusBanner
          tone="wait"
          text="You're not on a team that covers any zone yet. Ask the super admin to add you to a team."
          className="mb-6"
        />
      )}
      <PushToggle className="mb-6" />
      <LiveBoard initial={initial} initialCleared={initialCleared} canCancel={user.role !== "STAFF"} />
    </AppShell>
  );
}
