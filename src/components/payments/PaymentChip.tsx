import { Ban, CheckCircle2, Clock, XCircle } from "lucide-react";
import type { PaymentStatus } from "@/db/schema";

export function PaymentChip({ status }: { status: PaymentStatus }) {
  if (status === "SUCCESSFUL")
    return (
      <span className="chip bg-forest-100 text-forest-700">
        <CheckCircle2 size={13} /> Paid
      </span>
    );
  if (status === "FAILED")
    return (
      <span className="chip bg-ember-100 text-ember-600">
        <XCircle size={13} /> Failed
      </span>
    );
  if (status === "CANCELLED")
    return (
      <span className="chip bg-forest-900/5 text-moss">
        <Ban size={13} /> Cancelled
      </span>
    );
  return (
    <span className="chip bg-vest-100 text-forest-900">
      <Clock size={13} /> Pending
    </span>
  );
}
