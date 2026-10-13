import clsx from "clsx";
import type { SoakawayStatus } from "@/db/schema";

export const SOAKAWAY_LABEL: Record<SoakawayStatus, string> = {
  AWAITING_PAYMENT: "Awaiting payment",
  PENDING_APPROVAL: "Paid · awaiting approval",
  SCHEDULED: "Approved · scheduled",
  COMPLETED: "Completed",
  REJECTED: "Declined",
  CANCELLED: "Cancelled",
};

const TONE: Record<SoakawayStatus, string> = {
  AWAITING_PAYMENT: "bg-ember-100 text-ember-600",
  PENDING_APPROVAL: "bg-vest-100 text-forest-900",
  SCHEDULED: "bg-forest-100 text-forest-700",
  COMPLETED: "bg-forest-600 text-white",
  REJECTED: "bg-forest-900/5 text-moss",
  CANCELLED: "bg-forest-900/5 text-moss",
};

export function SoakawayChip({ status, className }: { status: SoakawayStatus; className?: string }) {
  return (
    <span className={clsx("chip", TONE[status], className)}>
      {status === "PENDING_APPROVAL" && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" aria-hidden />}
      {SOAKAWAY_LABEL[status]}
    </span>
  );
}

export const TIME_LABEL: Record<string, string> = {
  morning: "Morning (8am – 12pm)",
  afternoon: "Afternoon (12pm – 5pm)",
  any: "Any time",
};
