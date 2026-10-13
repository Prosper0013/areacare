import "server-only";

// Overridable only for automated tests; leave unset in production.
const BASE = process.env.FLW_BASE_URL || "https://api.flutterwave.com/v3";

function secretKey() {
  const key = process.env.FLW_SECRET_KEY;
  if (!key) throw new Error("FLW_SECRET_KEY is not set.");
  return key;
}

async function flw<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) throw new Error(`Flutterwave ${path} failed (${res.status}): ${body.message ?? "unknown error"}`);
  return body;
}

export type CheckoutInput = {
  txRef: string;
  amount: number;
  redirectUrl: string;
  customer: { email: string; name: string; phone: string };
  title: string;
  description: string;
  meta?: Record<string, string>;
};

/** Creates a Flutterwave Standard checkout and returns the hosted payment link. */
export async function createCheckout(input: CheckoutInput): Promise<string> {
  const res = await flw<{ status: string; data?: { link: string } }>("/payments", {
    method: "POST",
    body: JSON.stringify({
      tx_ref: input.txRef,
      amount: input.amount,
      currency: "NGN",
      redirect_url: input.redirectUrl,
      payment_options: "card,banktransfer,ussd",
      customer: { email: input.customer.email, name: input.customer.name, phonenumber: input.customer.phone },
      customizations: {
        title: input.title,
        description: input.description,
        logo: process.env.NEXT_PUBLIC_APP_URL ? `${process.env.NEXT_PUBLIC_APP_URL}/icon.svg` : undefined,
      },
      meta: input.meta,
    }),
  });
  if (!res.data?.link) throw new Error("Flutterwave did not return a payment link.");
  return res.data.link;
}

export type FlwTransaction = {
  id: number;
  tx_ref: string;
  status: string;
  amount: number;
  charged_amount: number;
  currency: string;
};

export async function verifyTransaction(transactionId: string | number): Promise<FlwTransaction | null> {
  try {
    const res = await flw<{ status: string; data?: FlwTransaction }>(
      `/transactions/${encodeURIComponent(String(transactionId))}/verify`,
    );
    return res.data ?? null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

export async function verifyByReference(txRef: string): Promise<FlwTransaction | null> {
  try {
    const res = await flw<{ status: string; data?: FlwTransaction }>(
      `/transactions/verify_by_reference?tx_ref=${encodeURIComponent(txRef)}`,
    );
    return res.data ?? null;
  } catch (err) {
    console.error(err);
    return null;
  }
}

/** A transaction only counts if Flutterwave confirms it and it matches what we asked for. */
export function isGenuine(tx: FlwTransaction | null, expected: { txRef: string; amount: number }) {
  return (
    !!tx &&
    tx.status === "successful" &&
    tx.tx_ref === expected.txRef &&
    tx.currency === "NGN" &&
    Number(tx.amount) >= expected.amount
  );
}
