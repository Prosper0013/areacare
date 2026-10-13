import type { AddressSnapshot, PickupStatus } from "@/db/schema";

/** All dates are shown in Lagos time, whatever timezone the server runs in. */
export const TZ = "Africa/Lagos";

/** e.g. "Thursday 16 October, 10:00 am" */
export const appointment = (d: Date | string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("en-NG", {
        weekday: "long",
        day: "numeric",
        month: "long",
        hour: "numeric",
        minute: "2-digit",
        timeZone: TZ,
      }).format(new Date(d))
    : "—";

export const naira = (amount: number) =>
  new Intl.NumberFormat("en-NG", { style: "currency", currency: "NGN", maximumFractionDigits: 0 }).format(amount);

export const shortDate = (d: Date | string | null | undefined) =>
  d ? new Intl.DateTimeFormat("en-NG", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(d)) : "—";

export const dateTime = (d: Date | string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "short",
        hour: "numeric",
        minute: "2-digit",
        timeZone: TZ,
      }).format(new Date(d))
    : "—";

export const fullDateTime = (d: Date | string | null | undefined) =>
  d
    ? new Intl.DateTimeFormat("en-NG", {
        day: "numeric",
        month: "long",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        timeZone: TZ,
      }).format(new Date(d))
    : "—";

export function timeAgo(d: Date | string) {
  const s = Math.round((Date.now() - new Date(d).getTime()) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  const days = Math.round(h / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
}

export const PICKUP_STATUS_LABEL: Record<PickupStatus, string> = {
  PENDING: "Waiting for a crew",
  ACKNOWLEDGED: "Crew assigned",
  EN_ROUTE: "Crew on the way",
  AWAITING_CONFIRMATION: "Cleared · awaiting confirmation",
  COMPLETED: "Cleared · confirmed",
  CANCELLED: "Cancelled",
};

export function addressLine(a: Partial<AddressSnapshot>) {
  return [a.houseNumber, a.street, a.estate, a.city, a.state].filter(Boolean).join(", ");
}

export const mapsLink = (lat: number, lng: number) =>
  `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;

/** Payments recorded by an admin (cash / direct transfer) carry an AC-CASH reference. */
export const isManualPayment = (p: { txRef: string }) => p.txRef.startsWith("AC-CASH");
export const paymentMethod = (p: { txRef: string }) =>
  isManualPayment(p) ? "Cash / transfer (recorded by admin)" : "Flutterwave";
