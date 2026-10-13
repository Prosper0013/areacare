import { relations } from "drizzle-orm";
import {
  boolean,
  doublePrecision,
  index,
  integer,
  jsonb,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
} from "drizzle-orm/pg-core";

const id = () =>
  text("id")
    .primaryKey()
    .$defaultFn(() => crypto.randomUUID());
const createdAt = () => timestamp("created_at", { withTimezone: true }).defaultNow().notNull();

/* ---------- enums ---------- */

export const roleEnum = pgEnum("role", ["USER", "STAFF", "ADMIN", "SUPER_ADMIN"]);
export const membershipEnum = pgEnum("membership_status", [
  "UNREGISTERED",
  "ACTIVE",
  "OVERDUE",
  "SUSPENDED",
]);
// MONTHLY is kept only for payments made before pay-as-you-go; new payments never use it.
export const paymentTypeEnum = pgEnum("payment_type", ["REGISTRATION", "MONTHLY", "SOAKAWAY", "TOPUP"]);
export const walletEntryTypeEnum = pgEnum("wallet_entry_type", [
  "REGISTRATION_CREDIT", // starting credit included in the registration fee
  "TOPUP", // member added credit through Flutterwave or cash
  "PICKUP_CHARGE", // trash cans collected (negative)
  "PICKUP_REFUND", // pickup cancelled, charge returned
  "ADJUSTMENT", // set by the super admin
]);
export const paymentStatusEnum = pgEnum("payment_status", [
  "PENDING", // checkout started, not confirmed yet
  "SUCCESSFUL",
  "FAILED",
  "CANCELLED", // still unconfirmed after 3 days (see expireStalePayments)
]);
export const pickupStatusEnum = pgEnum("pickup_status", [
  "PENDING", // raised by the member
  "ACKNOWLEDGED", // a crew has accepted it
  "EN_ROUTE", // crew on the way
  "AWAITING_CONFIRMATION", // crew reported the bin cleared; waiting for the member to confirm
  "COMPLETED", // cleared and confirmed (by the member, or by management on their behalf)
  "CANCELLED",
]);

export const soakawayStatusEnum = pgEnum("soakaway_status", [
  "AWAITING_PAYMENT", // booked, not paid yet
  "PENDING_APPROVAL", // paid, waiting for an admin to approve and schedule
  "SCHEDULED", // approved with a date and time
  "COMPLETED",
  "REJECTED", // declined by an admin (refund handled offline)
  "CANCELLED", // member cancelled before paying
]);

export type Role = (typeof roleEnum.enumValues)[number];
export type SoakawayStatus = (typeof soakawayStatusEnum.enumValues)[number];
export type MembershipStatus = (typeof membershipEnum.enumValues)[number];
export type PickupStatus = (typeof pickupStatusEnum.enumValues)[number];
export type PaymentType = (typeof paymentTypeEnum.enumValues)[number];
export type PaymentStatus = (typeof paymentStatusEnum.enumValues)[number];
export type WalletEntryType = (typeof walletEntryTypeEnum.enumValues)[number];

/* ---------- tables ---------- */

export const zones = pgTable("zones", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAt(),
});

export const users = pgTable(
  "users",
  {
    id: id(),
    name: text("name").notNull(),
    email: text("email").notNull().unique(),
    phone: text("phone").notNull(),
    passwordHash: text("password_hash").notNull(),
    role: roleEnum("role").default("USER").notNull(),
    membershipStatus: membershipEnum("membership_status").default("UNREGISTERED").notNull(),
    registeredAt: timestamp("registered_at", { withTimezone: true }),
    paidThrough: timestamp("paid_through", { withTimezone: true }), // legacy (monthly billing), unused
    creditBalance: integer("credit_balance").default(0).notNull(), // naira available for pickups

    // House details captured at onboarding
    houseNumber: text("house_number"),
    street: text("street"),
    estate: text("estate"),
    city: text("city"),
    state: text("state"),
    landmark: text("landmark"),
    houseDescription: text("house_description"),
    homeLat: doublePrecision("home_lat"),
    homeLng: doublePrecision("home_lng"),
    zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),

    createdAt: createdAt(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull()
      .$onUpdate(() => new Date()),
  },
  (t) => [index("users_role_idx").on(t.role), index("users_zone_idx").on(t.zoneId)],
);

export const teams = pgTable("teams", {
  id: id(),
  name: text("name").notNull().unique(),
  description: text("description"),
  createdAt: createdAt(),
});

export const teamMembers = pgTable(
  "team_members",
  {
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    createdAt: createdAt(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.teamId] })],
);

export const teamZones = pgTable(
  "team_zones",
  {
    teamId: text("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    zoneId: text("zone_id")
      .notNull()
      .references(() => zones.id, { onDelete: "cascade" }),
  },
  (t) => [primaryKey({ columns: [t.teamId, t.zoneId] })],
);

export type AddressSnapshot = {
  name: string;
  phone: string;
  houseNumber: string | null;
  street: string | null;
  estate: string | null;
  city: string | null;
  state: string | null;
  landmark: string | null;
  houseDescription: string | null;
  zone: string | null;
};

export const pickups = pgTable(
  "pickup_requests",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: pickupStatusEnum("status").default("PENDING").notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    accuracy: doublePrecision("accuracy"),
    locationSource: text("location_source").default("live").notNull(),
    note: text("note"),
    binCount: integer("bin_count").default(1).notNull(), // filled trash cans to collect
    binPrice: integer("bin_price").default(0).notNull(), // naira per can at request time
    charge: integer("charge").default(0).notNull(), // naira taken from credit (binCount × binPrice)
    refundedAt: timestamp("refunded_at", { withTimezone: true }),
    address: jsonb("address").$type<AddressSnapshot>().notNull(),
    zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),
    teamId: text("team_id").references(() => teams.id, { onDelete: "set null" }),
    handledById: text("handled_by_id").references(() => users.id, { onDelete: "set null" }),
    acknowledgedAt: timestamp("acknowledged_at", { withTimezone: true }),
    enRouteAt: timestamp("en_route_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }), // = confirmed time
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),

    // Crew report: "bin cleared"
    clearedAt: timestamp("cleared_at", { withTimezone: true }),
    clearedById: text("cleared_by_id").references(() => users.id, { onDelete: "set null" }),
    clearedNote: text("cleared_note"),

    // Member confirmation
    confirmedBy: text("confirmed_by"), // "member" | "management"
    confirmReminders: integer("confirm_reminders").default(0).notNull(),
    lastReminderAt: timestamp("last_reminder_at", { withTimezone: true }),
    escalatedAt: timestamp("escalated_at", { withTimezone: true }),

    // Member said "not cleared"
    reopenedCount: integer("reopened_count").default(0).notNull(),
    reopenNote: text("reopen_note"),
    reopenedAt: timestamp("reopened_at", { withTimezone: true }),

    createdAt: createdAt(),
  },
  (t) => [
    index("pickups_status_idx").on(t.status, t.createdAt),
    index("pickups_user_idx").on(t.userId, t.createdAt),
  ],
);

export const soakawayBookings = pgTable(
  "soakaway_bookings",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    status: soakawayStatusEnum("status").default("AWAITING_PAYMENT").notNull(),
    amount: integer("amount").notNull(), // naira, fixed at booking time
    preferredDate: text("preferred_date"), // yyyy-mm-dd
    preferredTime: text("preferred_time"), // morning | afternoon | any
    note: text("note"),
    address: jsonb("address").$type<AddressSnapshot>().notNull(),
    lat: doublePrecision("lat"),
    lng: doublePrecision("lng"),
    zoneId: text("zone_id").references(() => zones.id, { onDelete: "set null" }),
    paidAt: timestamp("paid_at", { withTimezone: true }),
    scheduledFor: timestamp("scheduled_for", { withTimezone: true }),
    adminNote: text("admin_note"),
    approvedById: text("approved_by_id").references(() => users.id, { onDelete: "set null" }),
    approvedAt: timestamp("approved_at", { withTimezone: true }),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    rejectedAt: timestamp("rejected_at", { withTimezone: true }),
    rejectReason: text("reject_reason"),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    remindedAt: timestamp("reminded_at", { withTimezone: true }),
    createdAt: createdAt(),
  },
  (t) => [
    index("soakaway_status_idx").on(t.status, t.createdAt),
    index("soakaway_user_idx").on(t.userId, t.createdAt),
  ],
);

export const payments = pgTable(
  "payments",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    txRef: text("tx_ref").notNull().unique(),
    flwTransactionId: text("flw_transaction_id"),
    type: paymentTypeEnum("type").notNull(),
    bookingId: text("booking_id").references(() => soakawayBookings.id, { onDelete: "set null" }),
    amount: integer("amount").notNull(), // naira
    currency: text("currency").default("NGN").notNull(),
    months: integer("months").default(1).notNull(),
    creditAmount: integer("credit_amount").default(0).notNull(), // naira added to the member's credit when paid
    status: paymentStatusEnum("status").default("PENDING").notNull(),
    periodStart: timestamp("period_start", { withTimezone: true }),
    periodEnd: timestamp("period_end", { withTimezone: true }),
    createdAt: createdAt(),
    verifiedAt: timestamp("verified_at", { withTimezone: true }),
  },
  (t) => [index("payments_user_idx").on(t.userId, t.createdAt)],
);

/** Every change to a member's credit balance. `amount` is signed; `balanceAfter` is the running balance. */
export const walletEntries = pgTable(
  "wallet_entries",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    type: walletEntryTypeEnum("type").notNull(),
    amount: integer("amount").notNull(),
    balanceAfter: integer("balance_after").notNull(),
    pickupId: text("pickup_id").references(() => pickups.id, { onDelete: "set null" }),
    paymentId: text("payment_id").references(() => payments.id, { onDelete: "set null" }),
    note: text("note"),
    createdById: text("created_by_id").references(() => users.id, { onDelete: "set null" }),
    createdAt: createdAt(),
  },
  (t) => [index("wallet_user_idx").on(t.userId, t.createdAt)],
);

export const notifications = pgTable(
  "notifications",
  {
    id: id(),
    userId: text("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    title: text("title").notNull(),
    body: text("body").notNull(),
    link: text("link"),
    kind: text("kind").default("info").notNull(), // pickup | payment | info
    read: boolean("read").default(false).notNull(),
    createdAt: createdAt(),
  },
  (t) => [index("notifications_user_idx").on(t.userId, t.read, t.createdAt)],
);

export const pushSubscriptions = pgTable("push_subscriptions", {
  id: id(),
  userId: text("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  endpoint: text("endpoint").notNull().unique(),
  p256dh: text("p256dh").notNull(),
  auth: text("auth").notNull(),
  createdAt: createdAt(),
});

export const settings = pgTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .defaultNow()
    .notNull()
    .$onUpdate(() => new Date()),
});

/* ---------- relations ---------- */

export const usersRelations = relations(users, ({ one, many }) => ({
  zone: one(zones, { fields: [users.zoneId], references: [zones.id] }),
  teams: many(teamMembers),
  pickups: many(pickups, { relationName: "requester" }),
  payments: many(payments),
}));

export const zonesRelations = relations(zones, ({ many }) => ({
  teams: many(teamZones),
  users: many(users),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  members: many(teamMembers),
  zones: many(teamZones),
}));

export const teamMembersRelations = relations(teamMembers, ({ one }) => ({
  user: one(users, { fields: [teamMembers.userId], references: [users.id] }),
  team: one(teams, { fields: [teamMembers.teamId], references: [teams.id] }),
}));

export const teamZonesRelations = relations(teamZones, ({ one }) => ({
  team: one(teams, { fields: [teamZones.teamId], references: [teams.id] }),
  zone: one(zones, { fields: [teamZones.zoneId], references: [zones.id] }),
}));

export const pickupsRelations = relations(pickups, ({ one }) => ({
  user: one(users, { fields: [pickups.userId], references: [users.id], relationName: "requester" }),
  handledBy: one(users, { fields: [pickups.handledById], references: [users.id], relationName: "handler" }),
  clearedBy: one(users, { fields: [pickups.clearedById], references: [users.id], relationName: "clearer" }),
  team: one(teams, { fields: [pickups.teamId], references: [teams.id] }),
  zone: one(zones, { fields: [pickups.zoneId], references: [zones.id] }),
}));

export const paymentsRelations = relations(payments, ({ one }) => ({
  user: one(users, { fields: [payments.userId], references: [users.id] }),
  booking: one(soakawayBookings, { fields: [payments.bookingId], references: [soakawayBookings.id] }),
}));

export const walletEntriesRelations = relations(walletEntries, ({ one }) => ({
  user: one(users, { fields: [walletEntries.userId], references: [users.id], relationName: "wallet" }),
  pickup: one(pickups, { fields: [walletEntries.pickupId], references: [pickups.id] }),
  payment: one(payments, { fields: [walletEntries.paymentId], references: [payments.id] }),
  createdBy: one(users, { fields: [walletEntries.createdById], references: [users.id], relationName: "walletAdmin" }),
}));

export const soakawayRelations = relations(soakawayBookings, ({ one, many }) => ({
  user: one(users, { fields: [soakawayBookings.userId], references: [users.id], relationName: "booker" }),
  approvedBy: one(users, { fields: [soakawayBookings.approvedById], references: [users.id], relationName: "approver" }),
  zone: one(zones, { fields: [soakawayBookings.zoneId], references: [zones.id] }),
  payments: many(payments),
}));

export type User = typeof users.$inferSelect;
export type Pickup = typeof pickups.$inferSelect;
export type Payment = typeof payments.$inferSelect;
export type Zone = typeof zones.$inferSelect;
export type Team = typeof teams.$inferSelect;
export type Notification = typeof notifications.$inferSelect;
export type SoakawayBooking = typeof soakawayBookings.$inferSelect;
export type WalletEntry = typeof walletEntries.$inferSelect;
