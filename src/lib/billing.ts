/**
 * Calendar-month billing in Lagos time (UTC+1 all year, no daylight saving).
 *
 *  - Registration covers the month you register in (to the last day of that month).
 *  - Each monthly payment adds whole calendar months after your current paid-through month.
 *  - If dues have lapsed, paying covers the current month first.
 *
 * Safe to import on the server and in the browser.
 */

const OFFSET_MS = 60 * 60_000; // Africa/Lagos = UTC+1

function lagosParts(d: Date) {
  const l = new Date(d.getTime() + OFFSET_MS);
  return { y: l.getUTCFullYear(), m: l.getUTCMonth(), day: l.getUTCDate() };
}

/** 00:00 Lagos time on the 1st of the month `d` falls in, shifted by `add` months. */
export function monthStart(d: Date, add = 0) {
  const { y, m } = lagosParts(d);
  return new Date(Date.UTC(y, m + add, 1) - OFFSET_MS);
}

/** The last millisecond of the month `d` falls in (Lagos time), shifted by `add` months. */
export function monthEnd(d: Date, add = 0) {
  return new Date(monthStart(d, add + 1).getTime() - 1);
}

/** True when `d` is the last instant of a Lagos calendar month. */
export function isMonthEnd(d: Date) {
  return monthEnd(d).getTime() === d.getTime();
}

/**
 * The period a payment of `months` months will cover.
 *  - still paid up → starts the month after the current paid-through month
 *  - lapsed or new → starts with the current month
 */
export function coverageFor(paidThrough: Date | null | undefined, months: number, now = new Date()) {
  if (paidThrough && paidThrough > now) {
    if (isMonthEnd(paidThrough)) {
      const start = new Date(paidThrough.getTime() + 1);
      return { start, end: monthEnd(start, months - 1) };
    }
    // Older mid-month dates: finish the current month, then add whole months.
    const start = new Date(paidThrough.getTime() + 1);
    return { start, end: monthEnd(paidThrough, months) };
  }
  const start = monthStart(now);
  return { start, end: monthEnd(now, months - 1) };
}

const MONTH_FMT = new Intl.DateTimeFormat("en-NG", { month: "long", year: "numeric", timeZone: "Africa/Lagos" });
const MONTH_SHORT = new Intl.DateTimeFormat("en-NG", { month: "short", year: "numeric", timeZone: "Africa/Lagos" });

export const monthName = (d: Date | string) => MONTH_FMT.format(new Date(d));

/** "November 2026" or "Nov 2026 – Jan 2027". */
export function periodLabel(start: Date | string | null | undefined, end: Date | string | null | undefined) {
  if (!start || !end) return "—";
  const s = new Date(start);
  const e = new Date(end);
  const sameMonth = MONTH_FMT.format(s) === MONTH_FMT.format(e);
  return sameMonth ? MONTH_FMT.format(e) : `${MONTH_SHORT.format(s)} – ${MONTH_SHORT.format(e)}`;
}
