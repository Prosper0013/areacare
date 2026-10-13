import Link from "next/link";
import clsx from "clsx";

export function LogoMark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 40 40" className={clsx("h-9 w-9", className)} aria-hidden>
      <rect width="40" height="40" rx="11" fill="#1F7A4D" />
      {/* lid */}
      <rect x="10" y="11" width="20" height="3.2" rx="1.6" fill="#F2B705" />
      <rect x="17" y="8.5" width="6" height="3" rx="1.2" fill="#F2B705" />
      {/* bin body */}
      <path d="M12 15.5h16l-1.6 15.2a2.4 2.4 0 0 1-2.4 2.1h-8a2.4 2.4 0 0 1-2.4-2.1L12 15.5Z" fill="#fff" />
      {/* leaf */}
      <path d="M20 29c-3.4-1.3-4.4-5.2-1.5-8.6 1.9 1.7 4.7 3.6 1.5 8.6Z" fill="#1F7A4D" />
      <path d="M20 29c.9-2.9 3.5-4.9 5.2-5.2-.3 2.6-2.1 5-5.2 5.2Z" fill="#4FB582" />
    </svg>
  );
}

export function Logo({ href = "/", light = false }: { href?: string; light?: boolean }) {
  return (
    <Link href={href} className="inline-flex items-center gap-2.5" aria-label="AreaCare home">
      <LogoMark />
      <span className={clsx("font-display text-[22px] font-bold tracking-tight", light ? "text-white" : "text-forest-900")}>
        AreaCare
      </span>
    </Link>
  );
}
