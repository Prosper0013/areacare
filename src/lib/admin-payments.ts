import "server-only";
import { and, count, desc, eq, gte, ilike, lt, or, sql, sum, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { payments, users } from "@/db/schema";
export { paymentMethod } from "./format";

export type PaymentFilters = {
  q?: string; // member name, email, phone or payment reference
  status?: "SUCCESSFUL" | "PENDING" | "FAILED";
  type?: "REGISTRATION" | "MONTHLY";
  from?: string; // yyyy-mm-dd (inclusive)
  to?: string; // yyyy-mm-dd (inclusive)
  page?: number;
};

export const PAGE_SIZE = 50;

export function parseFilters(sp: Record<string, string | undefined>): PaymentFilters {
  const date = (v?: string) => (v && /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : undefined);
  return {
    q: sp.q?.trim() || undefined,
    status: (["SUCCESSFUL", "PENDING", "FAILED"] as const).find((s) => s === sp.status),
    type: (["REGISTRATION", "MONTHLY"] as const).find((t) => t === sp.type),
    from: date(sp.from),
    to: date(sp.to),
    page: Math.max(1, Number(sp.page) || 1),
  };
}

function where(f: PaymentFilters): SQL | undefined {
  const parts: SQL[] = [];
  if (f.status) parts.push(eq(payments.status, f.status));
  if (f.type) parts.push(eq(payments.type, f.type));
  // Lagos is UTC+1 all year, so a calendar day there starts at 23:00 UTC the day before.
  if (f.from) parts.push(gte(payments.createdAt, new Date(`${f.from}T00:00:00+01:00`)));
  if (f.to) {
    const end = new Date(`${f.to}T00:00:00+01:00`);
    end.setDate(end.getDate() + 1);
    parts.push(lt(payments.createdAt, end));
  }
  if (f.q) {
    const like = `%${f.q}%`;
    parts.push(or(ilike(users.name, like), ilike(users.email, like), ilike(users.phone, like), ilike(payments.txRef, like))!);
  }
  return parts.length ? and(...parts) : undefined;
}

export async function listPayments(f: PaymentFilters, opts: { all?: boolean } = {}) {
  const w = where(f);
  const base = db
    .select({
      id: payments.id,
      txRef: payments.txRef,
      flwTransactionId: payments.flwTransactionId,
      type: payments.type,
      amount: payments.amount,
      months: payments.months,
      status: payments.status,
      periodStart: payments.periodStart,
      periodEnd: payments.periodEnd,
      createdAt: payments.createdAt,
      verifiedAt: payments.verifiedAt,
      user: { id: users.id, name: users.name, email: users.email, phone: users.phone },
    })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .where(w)
    .orderBy(desc(payments.createdAt));

  const rows = opts.all ? await base.limit(20000) : await base.limit(PAGE_SIZE).offset(((f.page ?? 1) - 1) * PAGE_SIZE);

  const [totals] = await db
    .select({
      count: count(),
      paidCount: sql<number>`count(*) filter (where ${payments.status} = 'SUCCESSFUL')`.mapWith(Number),
      paidAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESSFUL'), 0)`.mapWith(Number),
      pendingCount: sql<number>`count(*) filter (where ${payments.status} = 'PENDING')`.mapWith(Number),
      pendingAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'PENDING'), 0)`.mapWith(Number),
      failedCount: sql<number>`count(*) filter (where ${payments.status} = 'FAILED')`.mapWith(Number),
      registrationAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESSFUL' and ${payments.type} = 'REGISTRATION'), 0)`.mapWith(Number),
      monthlyAmount: sql<number>`coalesce(sum(${payments.amount}) filter (where ${payments.status} = 'SUCCESSFUL' and ${payments.type} = 'MONTHLY'), 0)`.mapWith(Number),
    })
    .from(payments)
    .innerJoin(users, eq(users.id, payments.userId))
    .where(w);

  return { rows, totals };
}

/** Successful payment totals per month (Lagos time) for the last `months` months, oldest first. */
export async function revenueByMonth(months = 6) {
  const start = new Date();
  start.setDate(1);
  start.setHours(0, 0, 0, 0);
  start.setMonth(start.getMonth() - (months - 1));

  const monthExpr = sql<string>`to_char(${payments.verifiedAt} at time zone 'Africa/Lagos', 'YYYY-MM')`;
  const rows = await db
    .select({ month: monthExpr, total: sum(payments.amount), n: count() })
    .from(payments)
    .where(and(eq(payments.status, "SUCCESSFUL"), gte(payments.verifiedAt, start)))
    .groupBy(monthExpr);

  return Array.from({ length: months }, (_, i) => {
    const d = new Date(start);
    d.setMonth(start.getMonth() + i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const hit = rows.find((r) => r.month === key);
    return {
      key,
      label: d.toLocaleDateString("en-NG", { month: "short" }),
      total: Number(hit?.total ?? 0),
      count: hit?.n ?? 0,
    };
  });
}
