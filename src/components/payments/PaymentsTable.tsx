import Link from "next/link";
import { FileText } from "lucide-react";
import type { Payment } from "@/db/schema";
import { dateTime, isManualPayment, naira, shortDate } from "@/lib/format";
import { PaymentChip } from "./PaymentChip";
import { RecheckButton } from "../PayButton";

export type PaymentRow = Pick<
  Payment,
  "id" | "txRef" | "type" | "amount" | "months" | "status" | "periodStart" | "periodEnd" | "createdAt" | "verifiedAt" | "flwTransactionId"
> & { user?: { id: string; name: string; email: string } };

export function paymentLabel(p: Pick<Payment, "type" | "months">) {
  return p.type === "REGISTRATION" ? "Registration" : `Monthly dues × ${p.months}`;
}

/**
 * One table for both sides:
 *  - members see their own payments with receipts and "check again" on pending ones
 *  - the super admin sees everyone's, with the member linked to their profile
 */
export function PaymentsTable({
  rows,
  view,
  hideMember = false,
  empty = "No payments yet.",
}: {
  rows: PaymentRow[];
  view: "member" | "admin";
  hideMember?: boolean;
  empty?: string;
}) {
  if (rows.length === 0) return <p className="px-5 py-10 text-center text-moss">{empty}</p>;
  const admin = view === "admin";
  const showMember = admin && !hideMember;

  return (
    <>
      {/* Phones: one compact row per payment */}
      <ul className="divide-y divide-forest-900/5 sm:hidden">
        {rows.map((p) => {
          const inner = (
            <div className="flex items-start justify-between gap-3 px-4 py-3.5">
              <div className="min-w-0">
                {showMember && p.user && <p className="truncate font-semibold">{p.user.name}</p>}
                <p className={showMember ? "text-sm" : "font-semibold"}>
                  {paymentLabel(p)}
                  {isManualPayment(p) && <span className="text-moss"> · cash</span>}
                </p>
                <p className="text-xs text-moss">
                  {dateTime(p.verifiedAt ?? p.createdAt)}
                  {p.periodEnd ? ` · to ${shortDate(p.periodEnd)}` : ""}
                </p>
                <p className="mt-0.5 truncate font-mono text-[11px] text-moss">{p.txRef}</p>
              </div>
              <div className="flex shrink-0 flex-col items-end gap-1.5">
                <span className="font-display text-base font-bold">{naira(p.amount)}</span>
                <PaymentChip status={p.status} />
                {!admin && p.status === "PENDING" && <RecheckButton txRef={p.txRef} />}
              </div>
            </div>
          );
          return (
            <li key={p.id}>
              {p.status === "SUCCESSFUL" ? (
                <Link href={`/payments/${p.id}`} className="block transition hover:bg-forest-50">
                  {inner}
                </Link>
              ) : (
                inner
              )}
            </li>
          );
        })}
      </ul>

    <div className="hidden overflow-x-auto sm:block">
      <table className={`w-full text-left text-sm ${showMember ? "min-w-[960px]" : "min-w-[760px]"}`}>
        <thead className="text-moss">
          <tr className="border-b border-forest-900/10">
            <th className="px-4 py-3 font-semibold">Date</th>
            {showMember && <th className="px-4 py-3 font-semibold">Member</th>}
            <th className="px-4 py-3 font-semibold">For</th>
            <th className="px-4 py-3 font-semibold">Covers</th>
            <th className="px-4 py-3 text-right font-semibold">Amount</th>
            <th className="px-4 py-3 font-semibold">Status</th>
            <th className="px-4 py-3 font-semibold">Reference</th>
            <th className="px-4 py-3" />
          </tr>
        </thead>
        <tbody>
          {rows.map((p) => (
            <tr key={p.id} className="border-b border-forest-900/5 last:border-0 hover:bg-forest-50/60">
              <td className="whitespace-nowrap px-4 py-3">{dateTime(p.verifiedAt ?? p.createdAt)}</td>
              {showMember && (
                <td className="px-4 py-3">
                  {p.user ? (
                    <Link href={`/admin/users/${p.user.id}`} className="whitespace-nowrap font-semibold hover:underline">
                      {p.user.name}
                      <span className="block text-xs font-normal text-moss">{p.user.email}</span>
                    </Link>
                  ) : (
                    "—"
                  )}
                </td>
              )}
              <td className="whitespace-nowrap px-4 py-3">
                {paymentLabel(p)}
                {isManualPayment(p) && <span className="mt-0.5 block text-xs text-moss">Cash / transfer</span>}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-moss">
                {p.periodStart && p.periodEnd ? `${shortDate(p.periodStart)} – ${shortDate(p.periodEnd)}` : "—"}
              </td>
              <td className="whitespace-nowrap px-4 py-3 text-right font-display text-base font-bold">{naira(p.amount)}</td>
              <td className="whitespace-nowrap px-4 py-3">
                <PaymentChip status={p.status} />
                {!admin && p.status === "PENDING" && (
                  <span className="ml-2">
                    <RecheckButton txRef={p.txRef} />
                  </span>
                )}
              </td>
              <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-moss">{p.txRef}</td>
              <td className="px-4 py-3 text-right">
                {p.status === "SUCCESSFUL" && (
                  <Link
                    href={`/payments/${p.id}`}
                    className="inline-flex items-center gap-1 text-sm font-semibold text-forest-600 hover:underline"
                  >
                    <FileText size={14} /> Receipt
                  </Link>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
    </>
  );
}
