"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { api } from "@/lib/client";
import { naira } from "@/lib/format";

export function MemberBookingActions({ id, amount }: { id: string; amount: number }) {
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);

  async function run(action: "pay" | "cancel") {
    if (action === "cancel" && !confirm("Cancel this booking?")) return;
    setBusy(action);
    try {
      const res = await api<{ link?: string }>(`/api/soakaway/${id}`, { body: { action } });
      if (res.link) {
        window.location.href = res.link;
        return;
      }
      toast("Booking cancelled");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
    setBusy(null);
  }

  return (
    <div className="flex flex-wrap gap-2">
      <button onClick={() => run("pay")} disabled={!!busy} className="btn-vest btn-sm">
        {busy === "pay" && <Loader2 size={15} className="animate-spin" />}
        Pay {naira(amount)}
      </button>
      <button onClick={() => run("cancel")} disabled={!!busy} className="btn-ghost btn-sm">
        Cancel booking
      </button>
    </div>
  );
}
