import { apiUser } from "@/lib/auth";
import { handler } from "@/lib/api";
import { listPayments, parseFilters, paymentMethod } from "@/lib/admin-payments";

function csvCell(v: unknown) {
  const s = v == null ? "" : v instanceof Date ? v.toISOString() : String(v);
  return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

// Downloads the payments that match the same filters as /admin/payments.
export const GET = handler(async (req: Request) => {
  await apiUser(["SUPER_ADMIN"]);
  const sp = Object.fromEntries(new URL(req.url).searchParams) as Record<string, string>;
  const { rows } = await listPayments(parseFilters(sp), { all: true });

  const header = [
    "Date created",
    "Date paid",
    "Member",
    "Email",
    "Phone",
    "Type",
    "Months",
    "Amount (NGN)",
    "Status",
    "Covers from",
    "Covers to",
    "Reference",
    "Flutterwave ID",
    "Method",
  ];
  const lines = rows.map((p) =>
    [
      p.createdAt,
      p.verifiedAt,
      p.user.name,
      p.user.email,
      p.user.phone,
      p.type === "REGISTRATION" ? "Registration" : "Monthly dues",
      p.months,
      p.amount,
      p.status,
      p.periodStart,
      p.periodEnd,
      p.txRef,
      p.flwTransactionId,
      paymentMethod(p),
    ]
      .map(csvCell)
      .join(","),
  );

  const stamp = new Date().toISOString().slice(0, 10);
  return new Response("﻿" + [header.join(","), ...lines].join("\n"), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="areacare-payments-${stamp}.csv"`,
    },
  });
});
