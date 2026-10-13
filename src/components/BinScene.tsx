"use client";

import { motion, useReducedMotion } from "framer-motion";
import clsx from "clsx";

/**
 * The signature illustration: a street-side bin whose fill level animates,
 * with a refuse truck that rolls in when `truck` is true.
 *   level: 0..1   lidOpen: lifts the lid   truck: shows the truck arriving
 */
export function BinScene({
  level = 0.85,
  lidOpen = false,
  truck = false,
  className,
}: {
  level?: number;
  lidOpen?: boolean;
  truck?: boolean;
  className?: string;
}) {
  const reduce = useReducedMotion();
  const clamped = Math.max(0, Math.min(1, level));
  const binTop = 88;
  const binBottom = 252;
  const fillHeight = (binBottom - binTop - 8) * clamped;
  const full = clamped > 0.8;

  return (
    <svg viewBox="0 0 420 300" className={clsx("w-full", className)} role="img" aria-label="Waste bin and pickup truck">
      <defs>
        <clipPath id="binBody">
          <path d={`M118 ${binTop}h124l-12 ${binBottom - binTop - 6}a10 10 0 0 1-10 8h-80a10 10 0 0 1-10-8z`} />
        </clipPath>
        <pattern id="hazard" width="16" height="16" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
          <rect width="8" height="16" fill="#F2B705" />
          <rect x="8" width="8" height="16" fill="#14231C" />
        </pattern>
      </defs>

      {/* ground */}
      <rect x="0" y="262" width="420" height="6" rx="3" fill="#14231C" opacity=".12" />
      <ellipse cx="180" cy="262" rx="78" ry="7" fill="#14231C" opacity=".14" />

      {/* bin body */}
      <path
        d={`M118 ${binTop}h124l-12 ${binBottom - binTop - 6}a10 10 0 0 1-10 8h-80a10 10 0 0 1-10-8z`}
        fill="#1F7A4D"
      />
      <g clipPath="url(#binBody)">
        <motion.rect
          x="110"
          width="140"
          initial={false}
          animate={{ y: binBottom - fillHeight, height: fillHeight + 10 }}
          transition={{ duration: reduce ? 0 : 1.1, ease: [0.2, 0.7, 0.2, 1] }}
          fill={full ? "#F2B705" : "#4FB582"}
          opacity=".9"
        />
        {/* ribs */}
        {[150, 180, 210].map((x) => (
          <rect key={x} x={x - 3} y={binTop + 18} width="6" height={binBottom - binTop - 40} rx="3" fill="#14231C" opacity=".14" />
        ))}
      </g>
      {/* hazard band */}
      <rect x="126" y={binTop + 6} width="108" height="10" fill="url(#hazard)" opacity=".95" />

      {/* wheels */}
      <circle cx="136" cy="256" r="9" fill="#14231C" />
      <circle cx="224" cy="256" r="9" fill="#14231C" />
      <circle cx="136" cy="256" r="3.5" fill="#F3F6F2" />
      <circle cx="224" cy="256" r="3.5" fill="#F3F6F2" />

      {/* lid (hinged at the back-left) */}
      <g
        style={{
          transformBox: "view-box",
          transformOrigin: `110px ${binTop + 2}px`,
          transform: `rotate(${lidOpen ? -26 : 0}deg)`,
          transition: reduce ? "none" : "transform .6s cubic-bezier(.34,1.56,.64,1)",
        }}
      >
        <rect x="108" y={binTop - 14} width="144" height="16" rx="6" fill="#14231C" />
        <rect x="168" y={binTop - 22} width="24" height="10" rx="4" fill="#14231C" />
      </g>

      {/* overflow bits when full */}
      {full && (
        <g>
          {[
            [146, binTop - 18, 10, "#F2B705"],
            [172, binTop - 24, 8, "#4FB582"],
            [204, binTop - 16, 11, "#F3F6F2"],
          ].map(([x, y, r, c], i) => (
            <motion.circle
              key={i}
              cx={x as number}
              cy={y as number}
              r={r as number}
              fill={c as string}
              stroke="#14231C"
              strokeOpacity=".2"
              initial={{ scale: 0 }}
              animate={{ scale: lidOpen ? 1 : 0 }}
              transition={{ delay: reduce ? 0 : 0.15 * i, type: "spring", stiffness: 260, damping: 16 }}
            />
          ))}
        </g>
      )}

      {/* truck */}
      <motion.g
        initial={false}
        animate={{ x: truck ? 0 : 260, opacity: truck ? 1 : 0 }}
        transition={{ duration: reduce ? 0 : 1.4, ease: [0.16, 0.8, 0.3, 1] }}
      >
        <g transform="translate(262 168)">
          {/* body */}
          {/* cab faces the bin (left) */}
          <rect x="0" y="30" width="46" height="46" rx="8" fill="#1F7A4D" />
          <rect x="10" y="38" width="26" height="18" rx="4" fill="#DCEFE4" />
          <rect x="-4" y="62" width="8" height="10" rx="2" fill="#F2B705" />
          <rect x="46" y="10" width="96" height="66" rx="8" fill="#14231C" />
          <rect x="52" y="18" width="84" height="10" fill="url(#hazard)" />
          {/* wheels */}
          <circle cx="26" cy="80" r="13" fill="#14231C" />
          <circle cx="26" cy="80" r="5" fill="#F3F6F2" />
          <circle cx="116" cy="80" r="13" fill="#14231C" />
          <circle cx="116" cy="80" r="5" fill="#F3F6F2" />
          {/* beacon */}
          <motion.circle
            cx="24"
            cy="26"
            r="5"
            fill="#F2B705"
            animate={truck && !reduce ? { opacity: [1, 0.25, 1] } : { opacity: 1 }}
            transition={{ duration: 0.9, repeat: Infinity }}
          />
        </g>
      </motion.g>
    </svg>
  );
}
