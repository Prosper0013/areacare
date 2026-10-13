"use client";

import { motion } from "framer-motion";
import { Check, RotateCcw } from "lucide-react";
import clsx from "clsx";
import { dateTime } from "@/lib/format";

export type TimelinePickup = {
  status: "PENDING" | "ACKNOWLEDGED" | "EN_ROUTE" | "AWAITING_CONFIRMATION" | "COMPLETED" | "CANCELLED";
  createdAt: string | Date;
  acknowledgedAt: string | Date | null;
  enRouteAt: string | Date | null;
  clearedAt?: string | Date | null;
  completedAt: string | Date | null;
  confirmedBy?: string | null;
  reopenedCount?: number;
  reopenedAt?: string | Date | null;
  reopenNote?: string | null;
};

const ORDER = ["PENDING", "ACKNOWLEDGED", "EN_ROUTE", "AWAITING_CONFIRMATION", "COMPLETED"] as const;

/**
 * Request progress. `viewer` changes the wording of the last step:
 * members see "Confirmed by you", crews and management see who confirmed.
 */
export function PickupTimeline({ pickup, viewer = "member" }: { pickup: TimelinePickup; viewer?: "member" | "staff" }) {
  const reached = ORDER.indexOf(pickup.status as (typeof ORDER)[number]);
  const confirmedLabel =
    pickup.status === "COMPLETED"
      ? pickup.confirmedBy === "management"
        ? "Confirmed by AreaCare"
        : viewer === "member"
          ? "Confirmed by you"
          : "Confirmed by member"
      : viewer === "member"
        ? "Your confirmation"
        : "Member confirms";

  const steps = [
    { label: "Request sent", at: pickup.createdAt },
    { label: "Crew assigned", at: pickup.acknowledgedAt },
    { label: "On the way", at: pickup.enRouteAt },
    { label: "Reported cleared by crew", at: pickup.clearedAt ?? null },
    { label: confirmedLabel, at: pickup.completedAt },
  ];

  return (
    <div>
      {!!pickup.reopenedCount && pickup.status !== "COMPLETED" && (
        <div className="mb-5 flex gap-2.5 rounded-xl bg-ember-100 px-3.5 py-3 text-sm text-ember-600">
          <RotateCcw size={17} className="mt-0.5 shrink-0" />
          <p>
            <span className="font-semibold">
              {viewer === "member" ? "You said the bin wasn't cleared" : "Member said the bin wasn't cleared"}
              {pickup.reopenedAt ? ` (${dateTime(pickup.reopenedAt)})` : ""}.
            </span>{" "}
            {pickup.reopenNote ? `“${pickup.reopenNote}” ` : ""}
            {viewer === "member" ? "The crew has been sent back." : "Please go back."}
          </p>
        </div>
      )}
      <ol className="relative space-y-5">
        {steps.map((s, i) => {
          const done = i <= reached;
          const current = i === reached && pickup.status !== "COMPLETED";
          const waitingOnMember = i === 4 && pickup.status === "AWAITING_CONFIRMATION";
          return (
            <li key={i} className="relative flex gap-4">
              {i < steps.length - 1 && (
                <span className="absolute left-[13px] top-7 h-[calc(100%-4px)] w-0.5 bg-forest-900/10" aria-hidden>
                  <motion.span
                    className="block w-full bg-forest-600"
                    initial={false}
                    animate={{ height: i < reached ? "100%" : "0%" }}
                    transition={{ duration: 0.6 }}
                  />
                </span>
              )}
              <span
                className={clsx(
                  "relative z-10 grid h-7 w-7 shrink-0 place-items-center rounded-full border-2 transition",
                  done ? "border-forest-600 bg-forest-600 text-white" : waitingOnMember ? "border-vest-500 bg-vest-100" : "border-forest-900/15 bg-white",
                )}
              >
                {(current || waitingOnMember) && (
                  <span className={clsx("absolute inset-0 rounded-full animate-pulse-ring", waitingOnMember ? "bg-vest-500" : "bg-forest-600")} aria-hidden />
                )}
                {done && <Check size={14} strokeWidth={3} />}
              </span>
              <div>
                <p className={clsx("font-semibold", !done && !waitingOnMember && "text-moss")}>{s.label}</p>
                <p className="text-sm text-moss">
                  {s.at ? dateTime(s.at) : waitingOnMember ? "Waiting…" : current ? "In progress" : " "}
                </p>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
