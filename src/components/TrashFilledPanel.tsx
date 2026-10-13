"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import { Loader2, Lock, MapPin, Minus, Plus, Trash2, Wallet, X } from "lucide-react";
import { toast } from "sonner";
import { api, getPosition } from "@/lib/client";
import { PICKUP_STATUS_LABEL, binsLabel, naira } from "@/lib/format";
import { BinScene } from "./BinScene";
import { PickupTimeline, type TimelinePickup } from "./PickupTimeline";
import { ConfirmClearance } from "./confirm/ConfirmClearance";

type OpenPickup = TimelinePickup & { id: string; locationSource: string; clearedNote?: string | null; binCount?: number; charge?: number };

export function TrashFilledPanel({
  canRequest,
  lockedReason,
  balance: initialBalance,
  binPrice,
  maxBins,
  address,
  landmark,
  hasHomePin,
  initialPickup,
  startWithNo = false,
}: {
  canRequest: boolean;
  lockedReason: "register" | "topup" | "suspended" | null;
  balance: number;
  binPrice: number;
  maxBins: number;
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
  const [bins, setBins] = useState(1);
  const [balance, setBalance] = useState(initialBalance);
  useEffect(() => setBalance(initialBalance), [initialBalance]);
  const affordable = binPrice > 0 ? Math.floor(balance / binPrice) : 0;
  const pickLimit = Math.max(1, Math.min(maxBins, affordable));
  const cost = bins * binPrice;
  const enough = cost <= balance;

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
      const res = await api<{ pickup: OpenPickup; existing: boolean; balance: number }>("/api/pickups", {
        body: { bins, lat: coords?.lat ?? null, lng: coords?.lng ?? null, accuracy: coords?.accuracy ?? null, note: note || null },
      });
      setPickup(res.pickup);
      setBalance(res.balance);
      setConfirming(false);
      setNote("");
      setBins(1);
      toast.success(
        res.existing ? "You already have a pickup in progress" : `Pickup requested for ${binsLabel(res.pickup.binCount ?? bins)}`,
        res.existing ? undefined : { description: `${naira(res.pickup.charge ?? cost)} taken from your credit · ${naira(res.balance)} left` },
      );
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
      if (p.charge) setBalance((b) => b + (p.charge ?? 0));
      toast("Pickup cancelled", { description: p.charge ? `${naira(p.charge)} returned to your credit.` : undefined });
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
              <LockedCta reason={lockedReason} balance={balance} binPrice={binPrice} />
            ) : active ? (
              <span className={awaiting ? "chip bg-vest-500 px-4 py-2 text-sm text-forest-900" : "chip bg-forest-900 px-4 py-2 text-sm text-white"}>
                {awaiting ? "Cleared? Please confirm" : PICKUP_STATUS_LABEL[pickup!.status]}
              </span>
            ) : (
              <motion.button
                whileTap={{ scale: 0.94 }}
                onClick={() => {
                  setBins((b) => Math.min(b, pickLimit));
                  setConfirming(true);
                }}
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
          {canRequest && !active && (
            <Link
              href="/wallet"
              className="mx-auto mt-5 flex w-fit items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-semibold shadow-ring transition hover:shadow-lift"
            >
              <Wallet size={16} className="text-forest-600" />
              {naira(balance)} credit · {binsLabel(affordable)}
            </Link>
          )}
        </div>

        {/* Details */}
        <div className="p-6 sm:p-8">
          {active || finished ? (
            <>
              <h2 className="text-2xl font-bold">{finished ? "Last pickup · cleared" : "Your pickup"}</h2>
              <p className="mb-6 mt-1 text-moss">
                {pickup!.binCount ? `${binsLabel(pickup!.binCount)}${pickup!.charge ? ` · ${naira(pickup!.charge)}` : ""} · ` : ""}
                {pickup!.locationSource === "live" ? "sent with your live location." : "sent with your saved house pin."}
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
                Press the button, say how many trash cans are full, and your area crew gets your address and location
                immediately. Each can is {naira(binPrice)} from your credit.
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
                  `You choose how many cans are full — ${naira(binPrice)} each comes off your credit.`,
                  "Your crew and management get an alert with your address and location.",
                  "A crew member accepts it and you're told they're coming.",
                  "You get a message when your bins have been emptied. Cancel before then and the charge is refunded.",
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
              className="hazard-edge max-h-[92vh] w-full max-w-md overflow-y-auto rounded-t-3xl bg-white p-6 pt-8 sm:rounded-3xl"
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

              <p className="label mt-5">How many trash cans are full?</p>
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setBins((b) => Math.max(1, b - 1))}
                  disabled={bins <= 1 || !!sending}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-forest-900/10 transition hover:border-forest-900/30 disabled:opacity-30"
                  aria-label="One less trash can"
                >
                  <Minus size={18} />
                </button>
                <div className="flex-1 text-center" aria-live="polite">
                  <motion.p key={bins} initial={{ scale: 0.7, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="font-display text-5xl font-extrabold leading-none">
                    {bins}
                  </motion.p>
                  <p className="mt-1 text-sm text-moss">trash can{bins === 1 ? "" : "s"}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setBins((b) => Math.min(maxBins, b + 1))}
                  disabled={bins >= maxBins || !!sending}
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-xl border-2 border-forest-900/10 transition hover:border-forest-900/30 disabled:opacity-30"
                  aria-label="One more trash can"
                >
                  <Plus size={18} />
                </button>
              </div>
              <div className="mt-3 flex min-h-[28px] flex-wrap justify-center gap-1.5" aria-hidden>
                <AnimatePresence initial={false}>
                  {Array.from({ length: bins }, (_, i) => (
                    <motion.span
                      key={i}
                      initial={{ y: 10, scale: 0.5, opacity: 0 }}
                      animate={{ y: 0, scale: 1, opacity: 1 }}
                      exit={{ y: 10, scale: 0.5, opacity: 0 }}
                      className={i < affordable ? "text-forest-600" : "text-ember-600"}
                    >
                      <Trash2 size={22} />
                    </motion.span>
                  ))}
                </AnimatePresence>
              </div>
              <div className="mt-4 space-y-1.5 rounded-xl border border-forest-900/10 p-4 text-sm">
                <div className="flex justify-between">
                  <span className="text-moss">
                    {bins} × {naira(binPrice)}
                  </span>
                  <span className="font-display text-lg font-bold">{naira(cost)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-moss">Credit after</span>
                  <span className={enough ? "font-semibold" : "font-semibold text-ember-600"}>
                    {enough ? naira(balance - cost) : `Short by ${naira(cost - balance)}`}
                  </span>
                </div>
              </div>
              {!enough && (
                <p className="mt-3 text-sm">
                  Your {naira(balance)} covers {binsLabel(affordable)}.{" "}
                  <Link href="/wallet" className="font-semibold text-forest-600 hover:underline">
                    Top up credit
                  </Link>
                </p>
              )}

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
              <button onClick={send} disabled={!!sending || !enough} className="btn-vest mt-5 w-full py-4 text-base">
                {sending && <Loader2 size={18} className="animate-spin" />}
                {sending === "locating"
                  ? "Getting your location…"
                  : sending === "sending"
                    ? "Alerting your crew…"
                    : `Send request · ${naira(cost)}`}
              </button>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </section>
    </div>
  );
}

function LockedCta({
  reason,
  balance,
  binPrice,
}: {
  reason: "register" | "topup" | "suspended" | null;
  balance: number;
  binPrice: number;
}) {
  const text =
    reason === "topup"
      ? `Your button is off because your credit (${naira(balance)}) is less than one trash can (${naira(binPrice)}).`
      : reason === "suspended"
        ? "Your account is suspended. Contact AreaCare support."
        : "Your button turns on once your home is registered.";
  return (
    <div className="flex flex-col items-center gap-3 text-center">
      <button
        type="button"
        disabled
        aria-disabled="true"
        aria-label="Trash filled (inactive)"
        className="relative grid h-40 w-40 cursor-not-allowed place-items-center rounded-full bg-forest-900/10 text-forest-900/35 sm:h-44 sm:w-44"
      >
        <span className="absolute inset-3 rounded-full border-2 border-dashed border-forest-900/15" aria-hidden />
        <span className="relative font-display text-[26px] font-extrabold leading-[1.05]">
          Trash
          <br />
          filled
        </span>
        <span className="absolute -right-1 top-3 grid h-11 w-11 place-items-center rounded-full bg-forest-900 text-white shadow-lift">
          <Lock size={18} />
        </span>
      </button>
      <p className="max-w-xs text-sm font-medium text-forest-900">{text}</p>
      {reason !== "suspended" && (
        <Link href="/wallet" className="btn-vest btn-sm">
          {reason === "topup" ? "Top up credit" : "Register now"}
        </Link>
      )}
    </div>
  );
}
