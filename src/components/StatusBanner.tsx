import { AlertTriangle, CheckCircle2, Clock } from "lucide-react";
import clsx from "clsx";

export function StatusBanner({ tone, text, className }: { tone: "good" | "wait" | "bad"; text: string; className?: string }) {
  const Icon = tone === "good" ? CheckCircle2 : tone === "wait" ? Clock : AlertTriangle;
  return (
    <div
      role="status"
      className={clsx(
        "flex items-start gap-3 rounded-xl px-4 py-3 text-sm font-medium",
        tone === "good" && "bg-forest-100 text-forest-700",
        tone === "wait" && "bg-vest-100 text-forest-900",
        tone === "bad" && "bg-ember-100 text-ember-600",
        className,
      )}
    >
      <Icon size={18} className="mt-0.5 shrink-0" />
      <p>{text}</p>
    </div>
  );
}
