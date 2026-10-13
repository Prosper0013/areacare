import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/forms/AuthForm";

export const metadata = { title: "Log in" };

export default function LoginPage() {
  return (
    <AuthShell title="Welcome back" subtitle="Log in to request a pickup or check your membership.">
      <Suspense>
        <AuthForm mode="login" />
      </Suspense>
    </AuthShell>
  );
}
