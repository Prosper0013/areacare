"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, MapPin, X } from "lucide-react";
import { toast } from "sonner";
import { api, getPosition } from "@/lib/client";
import { PICKUP_STATUS_LABEL } from "@/lib/format";
import { BinScene } from "./BinScene";
import { PickupTimeline, type TimelinePickup } from "./PickupTimeline";
import { ConfirmClearance } from "./confirm/ConfirmClearance";

type OpenPickup = TimelinePickup & { id: string; locationSource: string; clearedNote?: string | null };

export function TrashFilledPanel({
  canRequest,
  lockedReason,
  address,
  landmark,
  hasHomePin,
  initialPickup,
  startWithNo = false,
}: {
  canRequest: boolean;
  lockedReason: "register" | "renew" | "suspended" | null;
  address: string;
  landmark: string | null;
  hasHomePin: boolean;
  initialPickup: OpenPickup | null;
  startWithNo?: boolean;
}) {
  const router = useRouter();
  const [pickup, setPickup] = useState<OpenPickup | null>(initialPickup);
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState<"locating" | "sending" | null>(null);
  const [note, setNote] = useState("");

  // Follow the open request until it closes.
  const refresh = useCallback(async () => {
    if (!pickup) return;
    try {
      const { pickup: p } = await api<{ pickup: OpenPickup }>(`/api/pickups/${pickup.id}`);
      if (p.status !== pickup.status) {
        setPickup(p);
        if (p.status === "AWAITING_CONFIRMATION") toast("The crew says your bin is cleared", { description: "Please confirm below." });
        if (p.status === "EN_ROUTE") toast("Crew on the way", { description: "Please make your bin accessible." });
      }
    } catch {
      /* ignore */
    }
  }, [pickup]);

  useEffect(() => {
    if (!pickup || pickup.status === "COMPLETED" || pickup.status === "CANCELLED") return;
    const t = setInterval(refresh, 12000);
    return () => clearInterval(t);
  }, [pickup, refresh]);

  async function send() {
    setSending("locating");
    let coords: { lat: number; lng: number; accuracy: number } | null = null;
    try {
      coords = await getPosition(10000);
    } catch (err) {
      if (!hasHomePin) {
        toast.error((err as Error).message);
        setSending(null);
        return;
      }
      toast("Using your saved house pin", { description: "We couldn't read your live location." });
    }
    setSending("sending");
    try {
      const res = await api<{ pickup: OpenPickup; existing: boolean }>("/api/pickups", {
        body: { lat: coords?.lat ?? null, lng: coords?.lng ?? null, accuracy: coords?.accuracy ?? null, note: note || null },
      });
      setPickup(res.pickup);
      setConfirming(false);
      setNote("");
      toast.success(res.existing ? "You already have a pickup in progress" : "Pickup requested. Your crew has been alerted.");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setSending(null);
    }
  }

  async function cancel() {
    if (!pickup || !confirm("Cancel this pickup request?")) return;
    try {
      const { pickup: p } = await api<{ pickup: OpenPickup }>(`/api/pickups/${pickup.id}`, {
        method: "PATCH",
        body: { status: "CANCELLED" },
      });
      setPickup(p);
      toast("Pickup cancelled");
      router.refresh();
    } catch (err) {
      toast.error((err as Error).message);
    }
  }

  async function afterConfirm(cleared: boolean) {
    if (!pickup) return;
    try {
      const { pickup: p } = await api<{ pickup: OpenPickup }>(`/api/pickups/${pickup.id}`);
      setPickup(p);
    } catch {
      setPickup({ ...pickup, status: cleared ? "COMPLETED" : "ACKNOWLEDGED", completedAt: cleared ? new Date() : null });
    }
  }

  const active = pickup && !["COMPLETED", "CANCELLED"].includes(pickup.status);
  const awaiting = pickup?.status === "AWAITING_CONFIRMATION";
  const finished = pickup && pickup.status === "COMPLETED";
  const level = finished || awaiting ? 0.06 : active ? 0.92 : 0.7;

  return (
    <div className="space-y-6">
    {awaiting && (
      <ConfirmClearance
        pickup={{ id: pickup!.id, clearedAt: pickup!.clearedAt ?? null, clearedNote: pickup!.clearedNote ?? null }}
        variant="card"
        startWithNo={startWithNo}
        onDone={afterConfirm}
      />
    )}
    <section className="relative overflow-hidden rounded-[28px] bg-white shadow-ring">
      <div className="grid lg:grid-cols-[1.1fr_1fr]">
        {/* Scene */}
        <div className="relative bg-forest-50 px-6 pb-14 pt-10 sm:px-10">
          <BinScene
            level={level}
            lidOpen={!!active && !awaiting && pickup!.status !== "EN_ROUTE"}
            truck={!!active && (pickup!.status === "EN_ROUTE" || awaiting)}
            className="mx-auto max-w-md"
          />

          <div className="mt-6 flex justify-center">
            {!canRequest ? (
              <LockedCta reason={lockedReason} />
            ) : active ? (
              <span className={awaiting ? "chip bg-vest-500 px-4 py-2 text-sm text-forest-900" : "chip bg-forest-900 px-4 py-2 text-sm text-white"}>
                {awaiting ? "Cleared? Please confirm" : PICKUP_STATUS_LABEL[pickup!.status]}
              </span>
            ) : (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => setConfirming(true)}
                aria-label="Trash filled"
                className="relative grid h-40 w-40 place-items-center rounded-full bg-vest-500 text-forest-900 shadow-lift transition hover:bg-vest-400 sm:h-44 sm:w-44"
              >
                <span className="absolute inset-0 rounded-full bg-vest-500 animate-pulse-ring" aria-hidden />
                <span className="absolute inset-3 rounded-full border-2 border-dashed border-forest-900/25" aria-hidden />
                <span className="relative font-display text-[26px] font-extrabold leading-[1.05]">
                  Trash
                  <br />
                  filled
                </span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Details */}
        <div className="p-6 sm:p-8">
          {active || finished ? (
            <>
              <h2 className="text-2xl font-bold">{finished ? "Last pickup · cleared" : "Your pickup"}</h2>
              <p className="mb-6 mt-1 text-moss">
                {pickup!.locationSource === "live" ? "Sent with your live location." : "Sent with your saved house pin."}
              </p>
              <PickupTimeline pickup={pickup!} viewer="member" />
              {active && pickup!.status === "PENDING" && (
                <button onClick={cancel} className="btn-ghost btn-sm mt-6 text-ember-600">
                  Cancel request
                </button>
              )}
              {finished && canRequest && (
                <button onClick={() => setPickup(null)} className="btn-outline btn-sm mt-6">
                  Request another pickup
                </button>
              )}
            </>
          ) : (
            <>
              <h2 className="text-2xl font-bold">Bin full?</h2>
              <p className="mt-1 text-moss">
                Press the button and your area crew and management get your address and location immediately.
              </p>
              <div className="mt-6 rounded-xl bg-canvas p-4">
                <p className="flex items-start gap-2 font-semibold">
                  <MapPin size={18} className="mt-0.5 shrink-0 text-forest-600" />
                  {address || "No address yet"}
                </p>
                {landmark && <p className="ml-6 mt-1 text-sm text-moss">Landmark: {landmark}</p>}
                <Link href="/onboarding" className="ml-6 mt-2 inline-block text-sm font-semibold text-forest-600 hover:underline">
                  Edit house details
                </Link>
              </div>
              <h3 className="mt-8 text-lg font-bold">What happens when you press it</h3>
              <ol className="mt-3 space-y-3 text-[15px]">
                {[
                  "Your crew and management get an alert with your address and location.",
                  "A crew member accepts it and you're told they're coming.",
                  "You get a message when your bin has been emptied.",
                ].map((t, i) => (
                  <li key={t} className="flex gap-3">
                    <span className="grid h-6 w-6 shrink-0 place-items-center rounded-full bg-forest-100 text-xs font-bold text-forest-700">
                      {i + 1}
                    </span>
                    <span className="text-moss">{t}</span>
                  </li>
                ))}
              </ol>
            </>
          )}
        </div>
      </div>

      {/* Confirm sheet */}
      <AnimatePresence>
        {confirming && (
          <motion.div
            className="fixed inset-0 z-50 flex items-end justify-center bg-forest-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-6"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => !sending && setConfirming(false)}
          >
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-labelledby="confirm-title"
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: 40, opacity: 0 }}
              transition={{ type: "spring", stiffness: 380, damping: 32 }}
              onClick={(e) => e.stopPropagation()}
              className="hazard-edge w-full max-w-md rounded-t-3xl bg-white p-6 pt-8 sm:rounded-3xl"
            >
              <div className="flex items-start justify-between">
                <h3 id="confirm-title" className="text-2xl font-bold">
                  Send a pickup request?
                </h3>
                <button onClick={() => setConfirming(false)} className="rounded-lg p-1 text-moss hover:bg-canvas" aria-label="Close">
                  <X size={20} />
                </button>
              </div>
              <p className="mt-2 text-moss">We'll share your live location so the crew can find your gate.</p>
              <div className="mt-5 rounded-xl bg-canvas p-4 text-sm">
                <p className="font-semibold">{address}</p>
                {landmark && <p className="text-moss">Landmark: {landmark}</p>}
              </div>
              <label htmlFor="note" className="label mt-5">
                Note for the crew <span className="font-normal text-moss">(optional)</span>
              </label>
              <textarea
                id="note"
                rows={2}
                maxLength={280}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="field resize-none"
                placeholder="Two bags beside the bin today"
              />
              <button onClick={send} disabled={!!sending} className="btn-vest mt-5 w-full py-4 text-base">
                {sending && <Loader2 size={18} className="animate-spin" />}
                {sending === "locating" ? "Getting your location…" : sending === "sending" ? "Alerting your crew…" : "Send request"}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </div>
  );
}

function LockedCta({ reason }: { reason: "register" | "renew" | "suspended" | null }) {
  const text =
    reason === "renew"
      ? "Renew your monthly dues to request pickups."
      : reason === "suspended"
        ? "Your account is suspended. Contact support."
        : "Complete registration to request pickups.";
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <span className="grid h-32 w-32 place-items-center rounded-full bg-forest-900/5 text-moss">
        <Lock size={34} />
      </span>
      <p className="max-w-xs text-sm text-moss">{text}</p>
      {reason !== "suspended" && (
        <Link href="/membership" className="btn-primary btn-sm">
          {reason === "renew" ? "Renew membership" : "Register now"}
        </Link>
      )}
    </div>
  );
}
