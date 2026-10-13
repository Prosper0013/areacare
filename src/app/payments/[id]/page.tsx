import { notFound } from "next/navigation";
import Link from "next/link";
import { eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db } from "@/db";
import { payments, zones } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { addressLine, fullDateTime, isManualPayment, naira, shortDate } from "@/lib/format";
import { LogoMark } from "@/components/Logo";
import { PrintButton } from "@/components/payments/PrintButton";
import { paymentLabel } from "@/components/payments/PaymentsTable";

export const metadata = { title: "Receipt" };
export const dynamic = "force-dynamic";

export default async function ReceiptPage({ params }: { params: Promise<{ id: string }> }) {
  const viewer = await requireUser();
  const { id } = await params;
  const p = await db.query.payments.findFirst({ where: eq(payments.id, id), with: { user: true } });
  const isOwner = p?.userId === viewer.id;
  const isManagement = viewer.role === "ADMIN" || viewer.role === "SUPER_ADMIN";
  if (!p || p.status !== "SUCCESSFUL" || (!isOwner && !isManagement)) notFound();

  const member = p.user;
  const zone = member.zoneId ? await db.query.zones.findFirst({ where: eq(zones.id, member.zoneId) }) : null;
  const back = isOwner ? "/payments" : `/admin/users/${member.id}`;

  return (
    <div className="min-h-screen px-5 py-8 print:p-0 sm:py-12">
      <div className="mx-auto mb-5 flex max-w-2xl items-center justify-between print:hidden">
        <Link href={back} className="inline-flex items-center gap-1.5 text-sm font-semibold text-moss hover:text-forest-900">
          <ArrowLeft size={16} /> Back
        </Link>
        <PrintButton />
      </div>

      <article className="hazard-edge mx-auto max-w-2xl overflow-hidden rounded-3xl bg-white p-8 pt-10 shadow-ring print:max-w-none print:rounded-none print:shadow-none sm:p-12 sm:pt-14">
        <header className="flex flex-wrap items-start justify-between gap-6">
          <div className="flex items-center gap-3">
            <LogoMark className="h-11 w-11" />
            <div>
              <p className="font-display text-2xl font-bold">AreaCare</p>
              <p className="text-sm text-moss">Household waste pickup</p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-display text-3xl font-extrabold">Receipt</p>
            <p className="font-mono text-xs text-moss">{p.txRef}</p>
          </div>
        </header>

        <div className="mt-10 grid gap-8 sm:grid-cols-2">
          <div>
            <p className="text-sm text-moss">Billed to</p>
            <p className="mt-1 font-semibold">{member.name}</p>
            <p className="text-sm">{addressLine(member)}</p>
            {zone && <p className="text-sm">{zone.name} zone</p>}
            <p className="text-sm">{member.email}</p>
            <p className="text-sm">{member.phone}</p>
          </div>
          <dl className="space-y-2 text-sm sm:text-right">
            <div>
              <dt className="text-moss">Date paid</dt>
              <dd className="font-semibold">{fullDateTime(p.verifiedAt)}</dd>
            </div>
            <div>
              <dt className="text-moss">Paid via</dt>
              <dd className="font-semibold">
                {isManualPayment(p) ? "Cash / bank transfer" : `Flutterwave${p.flwTransactionId ? ` · #${p.flwTransactionId}` : ""}`}
              </dd>
            </div>
          </dl>
        </div>

        <table className="mt-10 w-full text-left text-sm">
          <thead>
            <tr className="border-b-2 border-forest-900 text-moss">
              <th className="py-3 font-semibold">Description</th>
              <th className="py-3 font-semibold">Period</th>
              <th className="py-3 text-right font-semibold">Amount</th>
            </tr>
          </thead>
          <tbody>
            <tr className="border-b border-forest-900/10">
              <td className="py-4">
                <p className="font-semibold">{paymentLabel(p)}</p>
                {p.type === "REGISTRATION" && <p className="text-moss">Includes the first month of pickups</p>}
              </td>
              <td className="py-4">
                {shortDate(p.periodStart)} – {shortDate(p.periodEnd)}
              </td>
              <td className="py-4 text-right font-semibold">{naira(p.amount)}</td>
            </tr>
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="pt-5 text-right font-semibold">
                Total paid
              </td>
              <td className="pt-5 text-right font-display text-2xl font-extrabold">{naira(p.amount)}</td>
            </tr>
          </tfoot>
        </table>

        <p className="mt-12 rounded-xl bg-forest-50 px-4 py-3 text-sm text-forest-700">
          Payment received with thanks. Membership is active until {shortDate(p.periodEnd)}.
        </p>
      </article>
    </div>
  );
}
