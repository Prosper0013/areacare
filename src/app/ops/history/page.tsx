import Link from "next/link";
import { STAFF_ROLES, requireUser } from "@/lib/auth";
import { boardPickups } from "@/lib/ops";
import { addressLine, dateTime } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { StatusChip } from "@/components/StatusChip";

export const metadata = { title: "History" };
export const dynamic = "force-dynamic";

export default async function OpsHistory() {
  const user = await requireUser(STAFF_ROLES);
  const rows = await boardPickups(user, "recent");

  return (
    <AppShell user={user}>
      <PageTitle title="Request history" subtitle="All requests from the last 30 days." />
      {rows.length === 0 ? (
        <div className="panel p-10 text-center text-moss">No requests in the last 30 days.</div>
      ) : (
        <div className="panel overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-sm">
            <thead className="text-moss">
              <tr className="border-b border-forest-900/10">
                <th className="px-5 py-3 font-semibold">Member</th>
                <th className="px-5 py-3 font-semibold">Address</th>
                <th className="px-5 py-3 font-semibold">Zone</th>
                <th className="px-5 py-3 font-semibold">Requested</th>
                <th className="px-5 py-3 font-semibold">Handled by</th>
                <th className="px-5 py-3 font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((p) => (
                <tr key={p.id} className="border-b border-forest-900/5 last:border-0 hover:bg-forest-50">
                  <td className="px-5 py-3 font-semibold">
                    <Link href={`/ops/requests/${p.id}`} className="hover:underline">
                      {p.address.name}
                    </Link>
                  </td>
                  <td className="px-5 py-3 text-moss">{addressLine(p.address)}</td>
                  <td className="px-5 py-3">{p.address.zone ?? "—"}</td>
                  <td className="px-5 py-3">{dateTime(p.createdAt)}</td>
                  <td className="px-5 py-3">{p.handledBy?.name ?? "—"}</td>
                  <td className="px-5 py-3">
                    <StatusChip status={p.status} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </AppShell>
  );
}
