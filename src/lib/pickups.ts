import "server-only";
import { and, desc, eq, inArray, isNull, lt, notInArray, or } from "drizzle-orm";
import { db } from "@/db";
import {
  pickups,
  teamMembers,
  teamZones,
  teams,
  users,
  zones,
  type AddressSnapshot,
  type Pickup,
  type PickupStatus,
  type User,
} from "@/db/schema";
import { addressLine } from "./format";
import { notifyUsers } from "./notify";

/** Requests still in progress. A member can't raise a new one until theirs leaves this list. */
export const OPEN_STATUSES: PickupStatus[] = ["PENDING", "ACKNOWLEDGED", "EN_ROUTE", "AWAITING_CONFIRMATION"];

export async function openPickupFor(userId: string) {
  return db.query.pickups.findFirst({
    where: and(eq(pickups.userId, userId), inArray(pickups.status, OPEN_STATUSES)),
    orderBy: desc(pickups.createdAt),
  });
}

/** Teams that cover a zone, and the staff who belong to them. */
export async function crewsForZone(zoneId: string | null) {
  const covering = zoneId
    ? await db
        .select({ id: teams.id, name: teams.name })
        .from(teamZones)
        .innerJoin(teams, eq(teams.id, teamZones.teamId))
        .where(eq(teamZones.zoneId, zoneId))
    : [];

  const teamIds = covering.map((t) => t.id);
  const staff = teamIds.length
    ? await db
        .select({ id: users.id })
        .from(teamMembers)
        .innerJoin(users, eq(users.id, teamMembers.userId))
        .where(inArray(teamMembers.teamId, teamIds))
    : // No crew covers this zone yet: alert every staff member so nothing is missed.
      await db.select({ id: users.id }).from(users).where(eq(users.role, "STAFF"));

  return { teams: covering, staffIds: staff.map((s) => s.id) };
}

export async function managementIds() {
  const rows = await db
    .select({ id: users.id })
    .from(users)
    .where(inArray(users.role, ["ADMIN", "SUPER_ADMIN"]));
  return rows.map((r) => r.id);
}

export type NewPickupInput = {
  lat?: number | null;
  lng?: number | null;
  accuracy?: number | null;
  note?: string | null;
};

export async function createPickup(user: User, input: NewPickupInput) {
  const zone = user.zoneId ? await db.query.zones.findFirst({ where: eq(zones.id, user.zoneId) }) : null;

  const address: AddressSnapshot = {
    name: user.name,
    phone: user.phone,
    houseNumber: user.houseNumber,
    street: user.street,
    estate: user.estate,
    city: user.city,
    state: user.state,
    landmark: user.landmark,
    houseDescription: user.houseDescription,
    zone: zone?.name ?? null,
  };

  const hasLive = typeof input.lat === "number" && typeof input.lng === "number";
  const crews = await crewsForZone(user.zoneId);

  const [pickup] = await db
    .insert(pickups)
    .values({
      userId: user.id,
      lat: hasLive ? input.lat : user.homeLat,
      lng: hasLive ? input.lng : user.homeLng,
      accuracy: hasLive ? (input.accuracy ?? null) : null,
      locationSource: hasLive ? "live" : "home",
      note: input.note?.trim() || null,
      address,
      zoneId: user.zoneId,
      teamId: crews.teams[0]?.id ?? null,
    })
    .returning();

  const recipients = [...(await managementIds()), ...crews.staffIds].filter((id) => id !== user.id);
  await notifyUsers(recipients, {
    kind: "pickup",
    title: `Trash filled · ${zone?.name ?? "No zone"}`,
    body: `${user.name} — ${addressLine(address) || "address not set"}${
      address.landmark ? `\nLandmark: ${address.landmark}` : ""
    }\nPhone: ${user.phone}`,
    link: `/ops/requests/${pickup.id}`,
    email: true,
  });

  await notifyUsers([user.id], {
    kind: "pickup",
    title: "Pickup request sent",
    body: crews.teams.length
      ? `${crews.teams.map((t) => t.name).join(", ")} and management have been alerted.`
      : "Management has been alerted and will dispatch a crew.",
    link: "/dashboard",
  });

  return pickup;
}

/* ───────────── Status changes by crew and management ───────────── */

const CREW_TRANSITIONS: Partial<Record<PickupStatus, PickupStatus[]>> = {
  PENDING: ["ACKNOWLEDGED", "EN_ROUTE", "AWAITING_CONFIRMATION"],
  ACKNOWLEDGED: ["EN_ROUTE", "AWAITING_CONFIRMATION"],
  EN_ROUTE: ["AWAITING_CONFIRMATION"],
};

const MEMBER_MESSAGES: Partial<Record<PickupStatus, [string, string]>> = {
  ACKNOWLEDGED: ["A crew has your request", "Your pickup has been assigned. We'll let you know when they set off."],
  EN_ROUTE: ["Crew on the way", "Our crew is heading to your house now. Please make the bin accessible."],
  CANCELLED: ["Pickup cancelled", "This pickup request was cancelled."],
};

export function confirmMessage(p: Pick<Pickup, "id" | "clearedNote">) {
  return {
    pickupId: p.id,
    kind: "pickup" as const,
    title: "Has your bin been cleared?",
    body: `Our crew says your trash has been collected${p.clearedNote ? ` (“${p.clearedNote}”)` : ""}. Tap to confirm, or tell us if it wasn't.`,
    link: "/dashboard?confirm=1",
    tag: "confirm",
  } satisfies Parameters<typeof notifyUsers>[1];
}

/**
 * Crew/management moves a request forward. "AWAITING_CONFIRMATION" is the crew's
 * "Report cleared" step; management can also cancel, or confirm on the member's behalf.
 */
export async function updatePickupStatus(pickup: Pickup, next: PickupStatus, actor: User, note?: string | null) {
  const isOwner = pickup.userId === actor.id;
  const isStaff = actor.role !== "USER";
  const isManagement = actor.role === "ADMIN" || actor.role === "SUPER_ADMIN";

  if (!isStaff) {
    if (!(isOwner && next === "CANCELLED" && pickup.status === "PENDING")) return { error: "You can't change this request." };
  } else {
    const allowed = [
      ...(CREW_TRANSITIONS[pickup.status] ?? []),
      ...(isManagement && pickup.status !== "COMPLETED" && pickup.status !== "CANCELLED" ? (["CANCELLED"] as const) : []),
      ...(isManagement && pickup.status === "AWAITING_CONFIRMATION" ? (["COMPLETED"] as const) : []),
    ];
    if (!allowed.includes(next)) {
      return {
        error:
          pickup.status === "AWAITING_CONFIRMATION"
            ? "Already reported cleared. Waiting for the member to confirm."
            : `This request is already ${pickup.status.toLowerCase().replace(/_/g, " ")}.`,
      };
    }
  }

  const now = new Date();
  const stamp: Partial<Pickup> =
    next === "ACKNOWLEDGED"
      ? { acknowledgedAt: now }
      : next === "EN_ROUTE"
        ? { enRouteAt: now, acknowledgedAt: pickup.acknowledgedAt ?? now }
        : next === "AWAITING_CONFIRMATION"
          ? {
              clearedAt: now,
              clearedById: actor.id,
              clearedNote: note?.trim() || null,
              acknowledgedAt: pickup.acknowledgedAt ?? now,
              enRouteAt: pickup.enRouteAt ?? now,
              confirmReminders: 0,
              lastReminderAt: now,
              escalatedAt: null,
            }
          : next === "COMPLETED"
            ? { completedAt: now, confirmedBy: "management" }
            : { cancelledAt: now };

  const [updated] = await db
    .update(pickups)
    .set({ status: next, ...stamp, handledById: isStaff && next !== "COMPLETED" ? actor.id : pickup.handledById })
    .where(and(eq(pickups.id, pickup.id), eq(pickups.status, pickup.status)))
    .returning();
  if (!updated) return { error: "Someone else just updated this request. Refresh to see the latest." };

  if (next === "AWAITING_CONFIRMATION") {
    await notifyUsers([pickup.userId], { ...confirmMessage(updated), email: true });
  } else if (next === "COMPLETED") {
    await notifyUsers([pickup.userId], {
      kind: "pickup",
      title: "Pickup marked as cleared",
      body: "AreaCare confirmed your bin was cleared. If that's not right, contact support.",
      link: "/dashboard",
    });
    await notifyCrew(updated, {
      title: "Pickup confirmed by management",
      body: `${pickup.address.name}'s pickup is now closed as cleared.`,
    });
  } else {
    const msg = MEMBER_MESSAGES[next];
    if (msg && !isOwner) await notifyUsers([pickup.userId], { kind: "pickup", title: msg[0], body: msg[1], link: "/dashboard" });
  }

  if (isOwner && next === "CANCELLED") {
    await notifyUsers(await managementIds(), {
      kind: "pickup",
      title: "Pickup cancelled by member",
      body: `${pickup.address.name} cancelled their request.`,
      link: `/ops/requests/${pickup.id}`,
    });
  }
  return { pickup: updated };
}

/** Crew who handled the request, plus management. */
async function notifyCrew(p: Pickup, msg: { title: string; body: string; urgent?: boolean }) {
  const ids = new Set(await managementIds());
  if (p.handledById) ids.add(p.handledById);
  if (p.clearedById) ids.add(p.clearedById);
  if (msg.urgent && p.zoneId) (await crewsForZone(p.zoneId)).staffIds.forEach((id) => ids.add(id));
  await notifyUsers([...ids], { kind: "pickup", title: msg.title, body: msg.body, link: `/ops/requests/${p.id}`, email: msg.urgent });
}

/* ───────────── Member confirmation ───────────── */

export async function confirmPickup(pickup: Pickup, member: User, cleared: boolean, note?: string | null) {
  if (pickup.userId !== member.id) return { error: "Request not found." };
  if (pickup.status !== "AWAITING_CONFIRMATION") {
    return { error: pickup.status === "COMPLETED" ? "You've already confirmed this pickup." : "This pickup isn't waiting for confirmation." };
  }
  const now = new Date();

  if (cleared) {
    const [updated] = await db
      .update(pickups)
      .set({ status: "COMPLETED", completedAt: now, confirmedBy: "member" })
      .where(and(eq(pickups.id, pickup.id), eq(pickups.status, "AWAITING_CONFIRMATION")))
      .returning();
    if (!updated) return { error: "This pickup was just updated. Refresh to see the latest." };
    await notifyCrew(updated, {
      title: "Cleared ✓ confirmed by member",
      body: `${pickup.address.name} confirmed their bin was cleared.`,
    });
    return { pickup: updated };
  }

  // "Not cleared": reopen it for the crew and raise the alarm.
  const [updated] = await db
    .update(pickups)
    .set({
      status: "ACKNOWLEDGED",
      reopenedCount: pickup.reopenedCount + 1,
      reopenedAt: now,
      reopenNote: note?.trim() || null,
      clearedAt: null,
      enRouteAt: null,
      confirmReminders: 0,
      lastReminderAt: null,
      escalatedAt: null,
    })
    .where(and(eq(pickups.id, pickup.id), eq(pickups.status, "AWAITING_CONFIRMATION")))
    .returning();
  if (!updated) return { error: "This pickup was just updated. Refresh to see the latest." };
  await notifyCrew(updated, {
    title: "⚠ Member says bin NOT cleared",
    body: `${pickup.address.name} — ${addressLine(pickup.address)}${note ? `\n“${note.trim()}”` : ""}\nPlease go back.`,
    urgent: true,
  });
  return { pickup: updated };
}

/* ───────────── Repeated reminders until the member confirms ───────────── */

export const REMINDER_EVERY_MIN = Number(process.env.CONFIRM_REMINDER_MINUTES ?? 30);
export const MAX_REMINDERS = Number(process.env.CONFIRM_MAX_REMINDERS ?? 12);

/**
 * Re-buzzes every member whose bin was reported cleared but who hasn't answered yet.
 * After MAX_REMINDERS, management is alerted once so someone can follow up by phone.
 * Safe to call as often as you like: it only acts on requests that are due.
 */
export async function sendConfirmationReminders() {
  const now = new Date();
  const due = new Date(now.getTime() - REMINDER_EVERY_MIN * 60_000);

  const waiting = await db.query.pickups.findMany({
    where: and(
      eq(pickups.status, "AWAITING_CONFIRMATION"),
      or(isNull(pickups.lastReminderAt), lt(pickups.lastReminderAt, due)),
    ),
    limit: 200,
  });

  let reminded = 0;
  let escalated = 0;
  for (const p of waiting) {
    if (p.confirmReminders < MAX_REMINDERS) {
      // Claim the row first so overlapping runs never double-send.
      const [claimed] = await db
        .update(pickups)
        .set({ confirmReminders: p.confirmReminders + 1, lastReminderAt: now })
        .where(and(eq(pickups.id, p.id), eq(pickups.confirmReminders, p.confirmReminders)))
        .returning({ id: pickups.id });
      if (!claimed) continue;
      const msg = confirmMessage(p);
      await notifyUsers([p.userId], { ...msg, title: `Reminder: ${msg.title}` });
      reminded++;
    } else if (!p.escalatedAt) {
      const [claimed] = await db
        .update(pickups)
        .set({ escalatedAt: now, lastReminderAt: now })
        .where(and(eq(pickups.id, p.id), isNull(pickups.escalatedAt)))
        .returning({ id: pickups.id });
      if (!claimed) continue;
      await notifyUsers(await managementIds(), {
        kind: "pickup",
        title: "Member hasn't confirmed pickup",
        body: `${p.address.name} (${p.address.phone}) hasn't confirmed after ${MAX_REMINDERS} reminders. Call them, or confirm on their behalf.`,
        link: `/ops/requests/${p.id}`,
        email: true,
      });
      escalated++;
    }
  }
  return { reminded, escalated };
}
