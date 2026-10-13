import Link from "next/link";
import { Download } from "lucide-react";
import clsx from "clsx";
import { requireUser } from "@/lib/auth";
import { listPayments, PAGE_SIZE, parseFilters, revenueByMonth } from "@/lib/admin-payments";
import { naira } from "@/lib/format";
import { AppShell, PageTitle } from "@/components/shell/AppShell";
import { PaymentsTable } from "@/components/payments/PaymentsTable";
import { RevenueChart } from "@/components/admin/RevenueChart";

export const metadata = { title: "Payments" };
export const dynamic = "force-dynamic";

export default async function AdminPaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const user = await requireUser(["SUPER_ADMIN"]);
  const sp = await searchParams;
  const f = parseFilters(sp);
  const [{ rows, totals }, months] = await Promise.all([listPayments(f), revenueByMonth(6)]);

  const qs = (extra: Record<string, string | number | undefined>) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries({ q: f.q, status: f.status, type: f.type, from: f.from, to: f.to, ...extra })) {
      if (v !== undefined && v !== "") params.set(k, String(v));
    }
    const s = params.toString();
    return s ? `?${s}` : "";
  };
  const filtered = Boolean(f.q || f.status || f.type || f.from || f.to);
  const pages = Math.max(1, Math.ceil(totals.count / PAGE_SIZE));

  return (
    <AppShell user={user}>
      <PageTitle
        title="Payments"
        subtitle="Every registration, credit top-up and soakaway payment, from every member."
        action={
          <a href={`/api/admin/payments/export${qs({})}`} className="btn-outline">
            <Download size={16} /> Export CSV
          </a>
        }
      />

      <div className="grid gap-4 lg:grid-cols-[1fr_1.25fr]">
        <dl className="grid grid-cols-2 gap-4">
          <div className="col-span-2 rounded-2xl bg-forest-900 p-5 text-white">
            <dt className="text-sm text-white/70">{filtered ? "Received (matching filters)" : "Received, all time"}</dt>
            <dd className="mt-1 font-display text-4xl font-extrabold">{naira(totals.paidAmount)}</dd>
            <p className="mt-1 text-sm text-white/70">
              {totals.paidCount} payment{totals.paidCount === 1 ? "" : "s"} · {naira(totals.registrationAmount)} registration ·{" "}
              {naira(totals.topupAmount)} top-ups · {naira(totals.soakawayAmount)} soakaway
            </p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <dt className="text-sm text-moss">Pending</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">{totals.pendingCount}</dd>
            <p className="mt-1 text-sm text-moss">{naira(totals.pendingAmount)} awaiting confirmation</p>
          </div>
          <div className="rounded-2xl bg-white p-5 shadow-ring">
            <dt className="text-sm text-moss">Failed or cancelled</dt>
            <dd className="mt-1 font-display text-2xl font-extrabold">{totals.failedCount}</dd>
            <p className="mt-1 text-sm text-moss">Unpaid checkouts close after 3 days</p>
          </div>
        </dl>
        <section className="panel p-5">
          <h2 className="font-display text-lg font-bold">Received per month</h2>
          <RevenueChart months={months} />
        </section>
      </div>

      {/* Filters */}
      <form action="/admin/payments" className="panel mt-6 grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-[2fr_1fr_1fr_1fr_1fr_auto]">
        <div>
          <label htmlFor="q" className="label text-xs">
            Search
          </label>
          <input id="q" name="q" defaultValue={f.q} placeholder="Name, email, phone or reference" className="field py-2.5" />
        </div>
        <div>
          <label htmlFor="status" className="label text-xs">
            Status
          </label>
          <select id="status" name="status" defaultValue={f.status ?? ""} className="field py-2.5">
            <option value="">Any</option>
            <option value="SUCCESSFUL">Paid</option>
            <option value="PENDING">Pending</option>
            <option value="FAILED">Failed</option>
            <option value="CANCELLED">Cancelled (unpaid 3 days)</option>
          </select>
        </div>
        <div>
          <label htmlFor="type" className="label text-xs">
            Type
          </label>
          <select id="type" name="type" defaultValue={f.type ?? ""} className="field py-2.5">
            <option value="">Any</option>
            <option value="REGISTRATION">Registration</option>
            <option value="TOPUP">Credit top-up</option>
            <option value="SOAKAWAY">Soakaway evacuation</option>
            <option value="MONTHLY">Monthly dues (old plan)</option>
          </select>
        </div>
        <div>
          <label htmlFor="from" className="label text-xs">
            From
          </label>
          <input id="from" name="from" type="date" defaultValue={f.from} className="field py-2" />
        </div>
        <div>
          <label htmlFor="to" className="label text-xs">
            To
          </label>
          <input id="to" name="to" type="date" defaultValue={f.to} className="field py-2" />
        </div>
        <div className="flex items-end gap-2">
          <button className="btn-dark py-2.5">Apply</button>
          {filtered && (
            <Link href="/admin/payments" className="btn-ghost py-2.5">
              Clear
            </Link>
          )}
        </div>
      </form>

      <section className="panel mt-4 overflow-hidden">
        <div className="flex items-center justify-between border-b border-forest-900/5 px-5 py-3 text-sm text-moss">
          <span>
            {totals.count} payment{totals.count === 1 ? "" : "s"}
            {filtered ? " match" : ""}
          </span>
          {pages > 1 && (
            <span>
              Page {f.page} of {pages}
            </span>
          )}
        </div>
        <PaymentsTable rows={rows} view="admin" empty="No payments match these filters." />
        {pages > 1 && (
          <div className="flex justify-between border-t border-forest-900/5 px-5 py-3">
            <Link
              href={qs({ page: (f.page ?? 1) - 1 })}
              className={clsx("btn-outline btn-sm", (f.page ?? 1) <= 1 && "pointer-events-none opacity-40")}
            >
              Newer
            </Link>
            <Link
              href={qs({ page: (f.page ?? 1) + 1 })}
              className={clsx("btn-outline btn-sm", (f.page ?? 1) >= pages && "pointer-events-none opacity-40")}
            >
              Older
            </Link>
          </div>
        )}
      </section>
    </AppShell>
  );
}
