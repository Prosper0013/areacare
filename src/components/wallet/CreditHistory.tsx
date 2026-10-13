import Link from "next/link";
import { ArrowDownLeft, ArrowUpRight } from "lucide-react";
import clsx from "clsx";
import type { WalletEntry } from "@/db/schema";
import { binsLabel, dateTime, naira } from "@/lib/format";

const LABEL: Record<WalletEntry["type"], string> = {
  REGISTRATION_CREDIT: "Starting credit (registration)",
  TOPUP: "Credit top-up",
  PICKUP_CHARGE: "Trash pickup",
  PICKUP_REFUND: "Refund · pickup cancelled",
  ADJUSTMENT: "Adjustment by AreaCare",
};

export type CreditRow = WalletEntry & {
  pickup?: { id: string; binCount: number } | null;
  createdBy?: { name: string } | null;
};

/** Ledger of credit in and out, newest first. Admins get links to the pickup. */
export function CreditHistory({ rows, admin = false, empty = "Nothing yet." }: { rows: CreditRow[]; admin?: boolean; empty?: string }) {
  if (rows.length === 0) return <p className="px-5 py-10 text-center text-moss">{empty}</p>;
  return (
    <ul className="divide-y divide-forest-900/5">
      {rows.map((e) => {
        const plus = e.amount > 0;
        const title = e.type === "PICKUP_CHARGE" && e.pickup ? `Trash pickup · ${binsLabel(e.pickup.binCount)}` : LABEL[e.type];
        const showNote = e.note && e.type !== "TOPUP" && e.type !== "REGISTRATION_CREDIT";
        return (
          <li key={e.id} className="flex items-center gap-4 px-5 py-3.5">
            <span
              className={clsx(
                "grid h-10 w-10 shrink-0 place-items-center rounded-xl",
                plus ? "bg-forest-100 text-forest-700" : "bg-vest-100 text-forest-900",
              )}
            >
              {plus ? <ArrowDownLeft size={18} /> : <ArrowUpRight size={18} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="font-semibold">
                {admin && e.pickup ? (
                  <Link href={`/ops/requests/${e.pickup.id}`} className="hover:underline">
                    {title}
                  </Link>
                ) : (
                  title
                )}
              </p>
              <p className="truncate text-sm text-moss">
                {dateTime(e.createdAt)}
                {showNote ? ` · ${e.note}` : ""}
                {admin && e.createdBy ? ` · by ${e.createdBy.name}` : ""}
              </p>
            </div>
            <div className="shrink-0 text-right">
              <p className={clsx("font-display text-lg font-bold", plus && "text-forest-700")}>
                {plus ? "+" : "−"}
                {naira(Math.abs(e.amount))}
              </p>
              <p className="text-xs text-moss">Balance {naira(e.balanceAfter)}</p>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
