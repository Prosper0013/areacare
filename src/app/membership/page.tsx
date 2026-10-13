import { redirect } from "next/navigation";

// Membership is now pay-as-you-go credit; old links (emails, notifications) land on the wallet.
export default async function MembershipRedirect({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const qs = new URLSearchParams(await searchParams).toString();
  redirect(`/wallet${qs ? `?${qs}` : ""}`);
}
