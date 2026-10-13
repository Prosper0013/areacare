import { Suspense } from "react";
import { AuthShell } from "@/components/AuthShell";
import { AuthForm } from "@/components/forms/AuthForm";

export const metadata = { title: "Create account" };

export default function SignupPage() {
  return (
    <AuthShell title="Create your account" subtitle="It takes about two minutes. You'll add your house details next.">
      <Suspense>
        <AuthForm mode="signup" />
      </Suspense>
    </AuthShell>
  );
}
