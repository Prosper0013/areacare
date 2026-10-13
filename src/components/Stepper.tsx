import { Check } from "lucide-react";
import clsx from "clsx";

/** Sign-up progress: account → house details → registration. */
export function Stepper({ current }: { current: 1 | 2 | 3 }) {
  const steps = ["Account", "House details", "Registration"];
  return (
    <ol className="mb-8 flex items-center gap-2 text-sm">
      {steps.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex flex-1 items-center gap-2">
            <span
              className={clsx(
                "grid h-7 w-7 shrink-0 place-items-center rounded-full text-xs font-bold",
                done && "bg-forest-600 text-white",
                active && "bg-vest-500 text-forest-900",
                !done && !active && "bg-forest-900/10 text-moss",
              )}
            >
              {done ? <Check size={14} strokeWidth={3} /> : n}
            </span>
            <span className={clsx("hidden font-semibold sm:inline", active ? "text-forest-900" : "text-moss")}>{label}</span>
            {n < steps.length && <span className={clsx("h-0.5 flex-1 rounded", done ? "bg-forest-600" : "bg-forest-900/10")} />}
          </li>
        );
      })}
    </ol>
  );
}
