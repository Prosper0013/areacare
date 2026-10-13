import { NextResponse } from "next/server";
import { confirmPayment } from "@/lib/payments";

// Flutterwave redirects the payer here: ?status=successful&tx_ref=...&transaction_id=...
export async function GET(req: Request) {
  const url = new URL(req.url);
  const txRef = url.searchParams.get("tx_ref");
  const transactionId = url.searchParams.get("transaction_id");
  const flwStatus = url.searchParams.get("status");
  const back = new URL("/membership", req.url);

  if (!txRef) {
    back.searchParams.set("payment", "failed");
    return NextResponse.redirect(back);
  }

  if (flwStatus === "cancelled") {
    back.searchParams.set("payment", "cancelled");
    return NextResponse.redirect(back);
  }

  try {
    const result = await confirmPayment(txRef, transactionId);
    back.searchParams.set("payment", result.status);
  } catch (err) {
    console.error(err);
    back.searchParams.set("payment", "pending");
  }
  return NextResponse.redirect(back);
}
