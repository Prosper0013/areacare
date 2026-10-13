"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { CheckCircle2, Navigation, Phone, RefreshCw, RotateCcw, Trash2 } from "lucide-react";
import clsx from "clsx";
import type { AddressSnapshot, PickupStatus } from "@/db/schema";
import { api } from "@/lib/client";
import { addressLine, binsLabel, dateTime, mapsLink, timeAgo } from "@/lib/format";
import { Map, type MapPin } from "@/components/map/Map";
import { StatusChip } from "@/components/StatusChip";
import { PickupActions } from "./PickupActions";

export type BoardPickup = {
  id: string;
  status: PickupStatus;
  lat: number | null;
  lng: number | null;
  locationSource: string;
  note: string | null;
  binCount: number;
  address: AddressSnapshot;
  createdAt: string;
  team: { id: string; name: string } | null;
  handledBy: { id: string; name: string } | null;
  clearedBy: { id: string; name: string } | null;
  clearedAt: string | null;
  clearedNote: string | null;
  completedAt: string | null;
  confirmedBy: string | null;
  confirmReminders: number;
  reopenedCount: number;
  reopenNote: string | null;
};

type FilterKey = "all" | "PENDING" | "ACKNOWLEDGED" | "EN_ROUTE" | "AWAITING_CONFIRMATION" | "cleared";

const FILTERS: { key: FilterKey; label: string }[] = [
  { key: "all", label: "All open" },
  { key: "PENDING", label: "New" },
  { key: "ACKNOWLEDGED", label: "Accepted" },
  { key: "EN_ROUTE", label: "On the way" },
  { key: "AWAITING_CONFIRMATION", label: "Awaiting confirmation" },
  { key: "cleared", label: "Cleared today" },
];

export function LiveBoard({
  initial,
  initialCleared,
  canCancel,
}: {
  initial: BoardPickup[];
  initialCleared: BoardPickup[];
  canCancel: boolean;
}) {
  const [items, setItems] = useState(initial);
  const [cleared, setCleared] = useState(initialCleared);
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<string | null>(null);
  const [syncing, setSyncing] = useState(false);
  const [, tick] = useState(0);

  const load = useCallback(async () => {
    setSyncing(true);
    try {
      const [open, done] = await Promise.all([
        api<{ pickups: BoardPickup[] }>("/api/ops/pickups?scope=open"),
        api<{ pickups: BoardPickup[] }>("/api/ops/pickups?scope=cleared"),
      ]);
      setItems(open.pickups);
      setCleared(done.pickups);
    } catch {
      /* keep last good data */
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    const t = setInterval(() => document.visibilityState === "visible" && load(), 10000);
    const clock = setInterval(() => tick((n) => n + 1), 30000); // refresh "x min ago"
    return () => {
      clearInterval(t);
      clearInterval(clock);
    };
  }, [load]);

  const shown = useMemo(
    () => (filter === "all" ? items : filter === "cleared" ? cleared : items.filter((p) => p.status === filter)),
    [items, cleared, filter],
  );
  const counts = useMemo(
    () => ({
      all: items.length,
      PENDING: items.filter((p) => p.status === "PENDING").length,
      ACKNOWLEDGED: items.filter((p) => p.status === "ACKNOWLEDGED").length,
      EN_ROUTE: items.filter((p) => p.status === "EN_ROUTE").length,
      AWAITING_CONFIRMATION: items.filter((p) => p.status === "AWAITING_CONFIRMATION").length,
      cleared: cleared.length,
    }),
    [items, cleared],
  );

  const pins: MapPin[] = shown
    .filter((p) => p.lat != null && p.lng != null)
    .map((p) => ({
      id: p.id,
      lat: p.lat!,
      lng: p.lng!,
      label: `${p.address.name} — ${binsLabel(p.binCount ?? 1)} — ${p.address.street ?? ""}`,
      href: `/ops/requests/${p.id}`,
      tone: p.status === "PENDING" || p.reopenedCount > 0 ? "ember" : p.status === "EN_ROUTE" || p.status === "COMPLETED" ? "forest" : "vest",
    }));

  function updateLocal(id: string, status: PickupStatus) {
    setItems((xs) => (["COMPLETED", "CANCELLED"].includes(status) ? xs.filter((x) => x.id !== id) : xs.map((x) => (x.id === id ? { ...x, status } : x))));
    load();
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_1.05fr]">
      <div className="order-2 xl:order-1">
        <div className="mb-4 flex flex-wrap items-center gap-2">
          {FILTERS.map((f) => {
            const n = counts[f.key];
            return (
              <button
                key={f.key}
                onClick={() => setFilter(f.key)}
                className={clsx(
                  "rounded-full px-4 py-2 text-sm font-semibold transition",
                  filter === f.key ? "bg-forest-900 text-white" : "bg-white text-forest-900 shadow-ring hover:bg-forest-50",
                )}
              >
                {f.label} <span className="ml-1 opacity-60">{n}</span>
              </button>
            );
          })}
          <button onClick={load} className="ml-auto grid h-9 w-9 place-items-center rounded-full text-moss hover:bg-white" aria-label="Refresh">
            <RefreshCw size={16} className={clsx(syncing && "animate-spin")} />
          </button>
        </div>

        {shown.length === 0 ? (
          <div className="panel flex flex-col items-center px-6 py-16 text-center">
            <span className="grid h-14 w-14 place-items-center rounded-2xl bg-forest-100 text-2xl">✓</span>
            <p className="mt-4 font-display text-xl font-bold">{filter === "cleared" ? "Nothing cleared yet today" : "All clear"}</p>
            <p className="mt-1 max-w-xs text-moss">
              {filter === "cleared"
                ? "Pickups appear here once the member confirms their bin was cleared."
                : filter === "AWAITING_CONFIRMATION"
                  ? "No members are waiting to confirm."
                  : "No open requests right now. New ones appear here and ring your device."}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            <AnimatePresence initial={false}>
              {shown.map((p) => (
                <motion.li
                  key={p.id}
                  layout
                  initial={{ opacity: 0, y: -12, scale: 0.98 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, x: 40 }}
                  transition={{ type: "spring", stiffness: 380, damping: 34 }}
                  onMouseEnter={() => setSelected(p.id)}
                  className={clsx(
                    "panel relative overflow-hidden p-5 transition",
                    (p.status === "PENDING" || p.reopenedCount > 0) && p.status !== "COMPLETED" && "hazard-edge pt-6",
                    selected === p.id && "ring-2 ring-forest-600",
                  )}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <Link href={`/ops/requests/${p.id}`} className="font-display text-lg font-bold hover:underline">
                        {p.address.name}
                      </Link>
                      <p className="text-sm text-moss">{addressLine(p.address) || "No address"}</p>
                    </div>
                    <div className="flex shrink-0 flex-col items-end gap-1.5">
                      <StatusChip status={p.status} />
                      <span className="chip bg-vest-500 text-forest-900">
                        <Trash2 size={13} /> {binsLabel(p.binCount ?? 1)}
                      </span>
                    </div>
                  </div>

                  {p.reopenedCount > 0 && p.status !== "COMPLETED" && p.status !== "AWAITING_CONFIRMATION" && (
                    <p className="mt-3 flex gap-2 rounded-lg bg-ember-100 px-3 py-2 text-sm font-medium text-ember-600">
                      <RotateCcw size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Member says the bin was NOT cleared{p.reopenNote ? `: “${p.reopenNote}”` : ""}. Please go back.
                      </span>
                    </p>
                  )}
                  {p.status === "COMPLETED" && (
                    <p className="mt-3 flex gap-2 rounded-lg bg-forest-100 px-3 py-2 text-sm font-medium text-forest-700">
                      <CheckCircle2 size={16} className="mt-0.5 shrink-0" />
                      <span>
                        Cleared{p.clearedBy ? ` by ${p.clearedBy.name}` : ""}
                        {p.clearedAt ? ` at ${dateTime(p.clearedAt)}` : ""} · confirmed by{" "}
                        {p.confirmedBy === "management" ? "management" : "the member"}
                        {p.completedAt ? ` at ${dateTime(p.completedAt)}` : ""}
                      </span>
                    </p>
                  )}
                  {p.status === "AWAITING_CONFIRMATION" && p.clearedNote && (
                    <p className="mt-3 text-sm text-moss">Crew note: “{p.clearedNote}”</p>
                  )}
                  {(p.address.landmark || p.note) && p.status !== "COMPLETED" && (
                    <div className="mt-3 space-y-1 text-sm">
                      {p.address.landmark && (
                        <p>
                          <span className="font-semibold">Landmark:</span> {p.address.landmark}
                        </p>
                      )}
                      {p.note && <p className="rounded-lg bg-vest-100 px-3 py-2">“{p.note}”</p>}
                    </div>
                  )}

                  <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-moss">
                    <span>{timeAgo(p.createdAt)}</span>
                    {p.address.zone && <span>{p.address.zone}</span>}
                    {p.team && <span>{p.team.name}</span>}
                    {p.handledBy && <span>Handled by {p.handledBy.name}</span>}
                  </div>

                  {p.status !== "COMPLETED" && (
                  <div className="mt-4 flex flex-wrap items-center gap-2">
                    {p.lat != null && p.lng != null && (
                      <a href={mapsLink(p.lat, p.lng)} target="_blank" rel="noopener noreferrer" className="btn-outline btn-sm">
                        <Navigation size={15} /> Directions
                      </a>
                    )}
                    <a href={`tel:${p.address.phone}`} className="btn-outline btn-sm">
                      <Phone size={15} /> Call
                    </a>
                    <div className="min-w-[180px] flex-1">
                      <PickupActions
                        id={p.id}
                        status={p.status}
                        onChange={(s) => updateLocal(p.id, s)}
                        allowCancel={canCancel}
                        isManagement={canCancel}
                        reminders={p.confirmReminders}
                      />
                    </div>
                  </div>
                  )}
                </motion.li>
              ))}
            </AnimatePresence>
          </ul>
        )}
      </div>

      <div className="order-1 xl:order-2">
        <div className="panel sticky top-24 overflow-hidden p-2">
          <div className="h-[320px] overflow-hidden rounded-xl sm:h-[420px] xl:h-[calc(100vh-170px)]">
            <Map pins={pins} className="h-full w-full" />
          </div>
        </div>
      </div>
    </div>
  );
}
