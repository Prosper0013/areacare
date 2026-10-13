import { naira } from "@/lib/format";

/** Bar chart of money received per month. Values are labelled directly so no axis is needed. */
export function RevenueChart({ months }: { months: { key: string; label: string; total: number; count: number }[] }) {
  const max = Math.max(1, ...months.map((m) => m.total));
  const compact = (n: number) =>
    n >= 1_000_000 ? `₦${(n / 1_000_000).toFixed(1)}m` : n >= 1000 ? `₦${Math.round(n / 1000)}k` : naira(n);

  return (
    <div className="mt-4 flex h-44 items-end gap-3" role="img" aria-label="Money received per month">
      {months.map((m, i) => {
        const current = i === months.length - 1;
        return (
          <div key={m.key} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5" title={`${m.key}: ${naira(m.total)} from ${m.count} payments`}>
            <span className="text-xs font-semibold">{m.total ? compact(m.total) : ""}</span>
            <div
              className={current ? "w-full rounded-t-md bg-vest-500" : "w-full rounded-t-md bg-forest-600"}
              style={{ height: `${(m.total / max) * 78}%`, minHeight: m.total ? 6 : 2, opacity: m.total ? 1 : 0.15 }}
            />
            <span className={current ? "text-xs font-semibold text-forest-900" : "text-xs text-moss"}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}
