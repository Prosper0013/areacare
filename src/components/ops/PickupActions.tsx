"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { BellRing, CheckCheck, Loader2 } from "lucide-react";
import { toast } from "sonner";
import type { PickupStatus } from "@/db/schema";
import { api } from "@/lib/client";

const NEXT: Partial<Record<PickupStatus, { to: PickupStatus; label: string; cls: string }[]>> = {
  PENDING: [
    { to: "ACKNOWLEDGED", label: "Accept", cls: "btn-dark" },
    { to: "EN_ROUTE", label: "Start trip", cls: "btn-primary" },
  ],
  ACKNOWLEDGED: [
    { to: "EN_ROUTE", label: "Start trip", cls: "btn-primary" },
    { to: "AWAITING_CONFIRMATION", label: "Report cleared", cls: "btn-vest" },
  ],
  EN_ROUTE: [{ to: "AWAITING_CONFIRMATION", label: "Report cleared", cls: "btn-vest" }],
};

const DONE_TOAST: Partial<Record<PickupStatus, string>> = {
  ACKNOWLEDGED: "Accepted. The member has been told a crew has it.",
  EN_ROUTE: "Trip started. The member knows you're on the way.",
  AWAITING_CONFIRMATION: "Reported cleared. The member is being asked to confirm.",
  COMPLETED: "Closed as cleared on the member's behalf.",
  CANCELLED: "Request cancelled.",
};

export function PickupActions({
  id,
  status,
  onChange,
  size = "sm",
  allowCancel = false,
  isManagement = false,
  reminders = 0,
}: {
  id: string;
  status: PickupStatus;
  onChange?: (status: PickupStatus) => void;
  size?: "sm" | "lg";
  allowCancel?: boolean;
  isManagement?: boolean;
  reminders?: number;
}) {
  const [busy, setBusy] = useState<PickupStatus | null>(null);
  const [reporting, setReporting] = useState(false);
  const [note, setNote] = useState("");

  async function move(to: PickupStatus, withNote?: string) {
    if (to === "CANCELLED" && !confirm("Cancel this pickup request? The member will be notified.")) return;
    if (to === "COMPLETED" && !confirm("Close this pickup as cleared without the member's confirmation?")) return;
    setBusy(to);
    try {
      await api(`/api/pickups/${id}`, { method: "PATCH", body: { status: to, note: withNote || null } });
      toast.success(DONE_TOAST[to] ?? "Updated");
      setReporting(false);
      setNote("");
      onChange?.(to);
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  const sz = size === "sm" ? "btn-sm" : "py-3.5";

  if (status === "AWAITING_CONFIRMATION") {
    return (
      <div className="space-y-2">
        <p className="flex items-center gap-2 rounded-xl bg-vest-100 px-3 py-2 text-sm text-forest-900">
          <BellRing size={16} className="shrink-0" />
          <span>
            Waiting for the member to confirm
            {reminders ? ` · reminded ${reminders} time${reminders === 1 ? "" : "s"}` : ""}
          </span>
        </p>
        {isManagement && (
          <button onClick={() => move("COMPLETED")} disabled={!!busy} className={`btn-outline ${sz} w-full`}>
            {busy === "COMPLETED" ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
            Confirm for member
          </button>
        )}
      </div>
    );
  }

  const options = NEXT[status] ?? [];
  if (!options.length) return null;

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {options.map((o) =>
          o.to === "AWAITING_CONFIRMATION" ? (
            <button key={o.to} onClick={() => setReporting((v) => !v)} disabled={!!busy} className={`${o.cls} ${sz} flex-1`} aria-expanded={reporting}>
              {o.label}
            </button>
          ) : (
            <button key={o.to} onClick={() => move(o.to)} disabled={!!busy} className={`${o.cls} ${sz} flex-1`}>
              {busy === o.to && <Loader2 size={15} className="animate-spin" />}
              {o.label}
            </button>
          ),
        )}
        {allowCancel && (
          <button onClick={() => move("CANCELLED")} disabled={!!busy} className={`btn-danger ${sz}`}>
            Cancel
          </button>
        )}
      </div>
      <AnimatePresence initial={false}>
        {reporting && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden">
            <div className="mt-3 rounded-xl bg-canvas p-3">
              <label htmlFor={`note-${id}`} className="label text-sm">
                Note for the member <span className="font-normal text-moss">(optional)</span>
              </label>
              <input
                id={`note-${id}`}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={280}
                placeholder="Emptied 2 bags, bin returned by the gate"
                className="field py-2.5"
              />
              <button onClick={() => move("AWAITING_CONFIRMATION", note)} disabled={!!busy} className="btn-vest btn-sm mt-2 w-full">
                {busy === "AWAITING_CONFIRMATION" ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
                Send cleared report
              </button>
              <p className="mt-2 text-xs text-moss">The member is asked to confirm and reminded until they do.</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
