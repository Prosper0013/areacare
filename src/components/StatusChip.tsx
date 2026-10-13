import clsx from "clsx";
import { Check } from "lucide-react";
import type { PickupStatus } from "@/db/schema";
import { PICKUP_STATUS_LABEL } from "@/lib/format";

const TONE: Record<PickupStatus, string> = {
  PENDING: "bg-ember-100 text-ember-600",
  ACKNOWLEDGED: "bg-vest-100 text-forest-900",
  EN_ROUTE: "bg-forest-100 text-forest-700",
  AWAITING_CONFIRMATION: "bg-vest-500 text-forest-900",
  COMPLETED: "bg-forest-600 text-white",
  CANCELLED: "bg-forest-900/5 text-moss",
};

export function StatusChip({ status, className }: { status: PickupStatus; className?: string }) {
  return (
    <span className={clsx("chip", TONE[status], className)}>
      {(status === "PENDING" || status === "AWAITING_CONFIRMATION") && (
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />
      )}
      {status === "COMPLETED" && <Check size={12} strokeWidth={3} aria-hidden />}
      {PICKUP_STATUS_LABEL[status]}
    </span>
  );
}
