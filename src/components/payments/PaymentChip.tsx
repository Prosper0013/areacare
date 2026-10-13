import { CheckCircle2, Clock, XCircle } from "lucide-react";

export function PaymentChip({ status }: { status: "PENDING" | "SUCCESSFUL" | "FAILED" }) {
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
  return (
    <span className="chip bg-vest-100 text-forest-900">
      <Clock size={13} /> Pending
    </span>
  );
}
