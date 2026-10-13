import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { pickups } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { binsLabel, dateTime, naira } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { StatusChip } from "@/components/StatusChip";

export const metadata = { title: "Pickups" };
export const dynamic = "force-dynamic";

export default async function HistoryPage() {
  const user = await requireUser(["USER"]);
  const rows = await db.query.pickups.findMany({
    where: eq(pickups.userId, user.id),
    orderBy: desc(pickups.createdAt),
    limit: 100,
  });

  return (
    <AppShell user={user}>
      <PageTitle title="Your pickups" subtitle="Every request you've made and when it was collected." />
      {rows.length === 0 ? (
        <div className="panel p-10 text-center">
          <p className="font-display text-xl font-bold">No pickups yet</p>
          <p className="mt-1 text-moss">When your bins fill up, press Trash filled on your home screen.</p>
        </div>
      ) : (
        <ul className="panel divide-y divide-forest-900/5">
          {rows.map((p) => (
            <li key={p.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4">
              <div>
                <p className="font-semibold">
                  {binsLabel(p.binCount)}
                  {p.charge ? ` · ${naira(p.charge)}${p.refundedAt ? " refunded" : ""}` : ""}
                  <span className="font-normal text-moss"> · {dateTime(p.createdAt)}</span>
                </p>
                <p className="text-sm text-moss">
                  {p.completedAt
                    ? `Cleared · confirmed ${dateTime(p.completedAt)}${p.confirmedBy === "management" ? " by AreaCare" : ""}`
                    : p.status === "AWAITING_CONFIRMATION"
                      ? "Crew reported it cleared — please confirm on your home screen"
                      : p.cancelledAt
                        ? `Cancelled ${dateTime(p.cancelledAt)}`
                        : "In progress"}
                  {p.note ? ` · “${p.note}”` : ""}
                </p>
              </div>
              <StatusChip status={p.status} />
            </li>
          ))}
        </ul>
      )}
    </AppShell>
  );
}
