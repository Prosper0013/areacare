"use client";

import { useState } from "react";
import { Loader2, Lock } from "lucide-react";
import { toast } from "sonner";
import clsx from "clsx";
import { api } from "@/lib/client";

/** Starts a Flutterwave checkout and sends the member to the hosted payment page. */
export function PayButton({
  type,
  amount,
  label,
  className,
  variant = "vest",
}: {
  type: "REGISTRATION" | "TOPUP";
  amount?: number;
  label: string;
  className?: string;
  variant?: "vest" | "primary" | "outline";
}) {
  const [busy, setBusy] = useState(false);

  async function pay() {
    setBusy(true);
    try {
      const { link } = await api<{ link: string }>("/api/payments/initiate", { body: { type, amount } });
      window.location.href = link;
    } catch (err) {
      toast.error((err as Error).message);
      setBusy(false);
    }
  }

  return (
    <button type="button" onClick={pay} disabled={busy || (type === "TOPUP" && !amount)} className={clsx(`btn-${variant}`, className)}>
      {busy ? <Loader2 size={18} className="animate-spin" /> : <Lock size={16} />}
      {busy ? "Opening secure checkout…" : label}
    </button>
  );
}

export function RecheckButton({ txRef }: { txRef: string }) {
  const [busy, setBusy] = useState(false);
  return (
    <button
      className="text-sm font-semibold text-forest-600 hover:underline disabled:opacity-50"
      disabled={busy}
      onClick={async () => {
        setBusy(true);
        try {
          const { status } = await api<{ status: string }>("/api/payments/verify", { body: { txRef } });
          if (status === "successful") {
            toast.success("Payment confirmed");
            window.location.reload();
          } else toast(status === "failed" ? "This payment failed." : "Still waiting for Flutterwave to confirm.");
        } catch (err) {
          toast.error((err as Error).message);
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? "Checking…" : "Check again"}
    </button>
  );
}
