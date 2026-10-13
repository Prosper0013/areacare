"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { CalendarCheck, CheckCheck, Loader2, X } from "lucide-react";
import { toast } from "sonner";
import type { SoakawayStatus } from "@/db/schema";
import { api } from "@/lib/client";

/** "2026-10-16T09:00" typed by the admin is always read as Lagos time. */
const toLagosIso = (local: string) => `${local}:00+01:00`;

function defaultSlot(preferredDate: string | null, preferredTime: string | null) {
  const tomorrow = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Lagos" }).format(new Date(Date.now() + 86_400_000));
  const day = preferredDate && preferredDate >= tomorrow ? preferredDate : tomorrow;
  return `${day}T${preferredTime === "afternoon" ? "13:00" : "09:00"}`;
}

export function ManageBooking({
  id,
  status,
  preferredDate,
  preferredTime,
  scheduledLocal,
}: {
  id: string;
  status: SoakawayStatus;
  preferredDate: string | null;
  preferredTime: string | null;
  scheduledLocal: string | null;
}) {
  const router = useRouter();
  const [mode, setMode] = useState<"approve" | "reject" | null>(status === "PENDING_APPROVAL" ? "approve" : null);
  const [when, setWhen] = useState(scheduledLocal ?? defaultSlot(preferredDate, preferredTime));
  const [note, setNote] = useState("");
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<string | null>(null);

  async function act(body: Record<string, unknown>, done: string) {
    setBusy(String(body.action));
    try {
      await api(`/api/soakaway/${id}`, { body });
      toast.success(done);
      setMode(null);
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setBusy(null);
    }
  }

  if (status !== "PENDING_APPROVAL" && status !== "SCHEDULED") return null;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        {status === "SCHEDULED" && (
          <button
            onClick={() => confirm("Mark this evacuation as done? The member will be notified.") && act({ action: "complete" }, "Marked as completed")}
            disabled={!!busy}
            className="btn-primary btn-sm"
          >
            {busy === "complete" ? <Loader2 size={15} className="animate-spin" /> : <CheckCheck size={15} />}
            Mark completed
          </button>
        )}
        <button onClick={() => setMode(mode === "approve" ? null : "approve")} className={status === "SCHEDULED" ? "btn-outline btn-sm" : "btn-dark btn-sm"}>
          <CalendarCheck size={15} /> {status === "SCHEDULED" ? "Reschedule" : "Approve & schedule"}
        </button>
        <button onClick={() => setMode(mode === "reject" ? null : "reject")} className="btn-danger btn-sm">
          <X size={15} /> Decline
        </button>
      </div>

      <AnimatePresence initial={false}>
        {mode === "approve" && (
          <motion.form
            key="approve"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              act(
                { action: "approve", scheduledFor: toLagosIso(when), note: note || null },
                status === "SCHEDULED" ? "Rescheduled. The member has been told the new time." : "Approved. The member has been notified.",
              );
            }}
          >
            <div className="grid gap-3 rounded-xl bg-canvas p-4 sm:grid-cols-[1fr_1.4fr]">
              <div>
                <label htmlFor={`when-${id}`} className="label text-sm">
                  Date and time (Lagos)
                </label>
                <input id={`when-${id}`} type="datetime-local" required value={when} onChange={(e) => setWhen(e.target.value)} className="field py-2.5" />
              </div>
              <div>
                <label htmlFor={`note-${id}`} className="label text-sm">
                  Message to the member <span className="font-normal text-moss">(optional)</span>
                </label>
                <input
                  id={`note-${id}`}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  maxLength={400}
                  placeholder="Please keep the gate open from 9am"
                  className="field py-2.5"
                />
              </div>
              <button className="btn-vest btn-sm sm:col-span-2" disabled={!!busy}>
                {busy === "approve" && <Loader2 size={15} className="animate-spin" />}
                {status === "SCHEDULED" ? "Save new time and notify member" : "Approve and notify member"}
              </button>
            </div>
          </motion.form>
        )}
        {mode === "reject" && (
          <motion.form
            key="reject"
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
            onSubmit={(e) => {
              e.preventDefault();
              act({ action: "reject", reason }, "Declined. The member has been notified.");
            }}
          >
            <div className="rounded-xl bg-ember-100/60 p-4">
              <label htmlFor={`reason-${id}`} className="label text-sm">
                Reason (sent to the member)
              </label>
              <input
                id={`reason-${id}`}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                required
                minLength={3}
                maxLength={400}
                placeholder="Our truck can't reach this street yet."
                className="field py-2.5"
              />
              <p className="hint">They've already paid — refund them from your Flutterwave dashboard.</p>
              <button className="btn btn-sm mt-2 bg-ember-600 text-white hover:bg-ember-600/90" disabled={!!busy}>
                {busy === "reject" && <Loader2 size={15} className="animate-spin" />}
                Decline booking
              </button>
            </div>
          </motion.form>
        )}
      </AnimatePresence>
    </div>
  );
}
