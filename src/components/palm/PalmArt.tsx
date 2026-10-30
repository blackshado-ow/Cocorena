/* Coconut & palm SVG art for Cocorena. No external image dependencies. */

interface CoconutVisualProps {
  size?: number;
  className?: string;
}

/** Status coconut used across the garden, dashboard strip, and timers. */
export type CoconutStatus = "qualified" | "missed" | "pending" | "future" | "growing";

const colors: Record<CoconutStatus, { fill: string; ring: string; label: string }> = {
  qualified: { fill: "var(--color-palm)", ring: "var(--color-palm-deep)", label: "Qualified day" },
  missed: { fill: "var(--color-miss)", ring: "#8f2f2a", label: "Missed day" },
  pending: { fill: "transparent", ring: "var(--color-brown)", label: "Today — still pending" },
  future: { fill: "transparent", ring: "var(--color-line)", label: "Not yet" },
  growing: { fill: "var(--color-gold)", ring: "var(--color-brown)", label: "Session in progress" },
};

export function CoconutDot({ status, size = 26, className }: CoconutVisualProps & { status: CoconutStatus }) {
  const c = colors[status];
  const dashed = status === "pending" || status === "future";
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label={c.label}
      className={className}
    >
      <circle
        cx="16"
        cy="16"
        r="10"
        fill={c.fill}
        stroke={c.ring}
        strokeWidth="2.5"
        strokeDasharray={dashed ? "3.5 3.5" : undefined}
      />
      {status === "qualified" || status === "growing" ? (
        <ellipse cx="13" cy="12.5" rx="3" ry="2" fill="rgba(255,255,255,0.35)" />
      ) : null}
      {status === "missed" ? (
        <path d="M11 11 L21 21 M21 11 L11 21" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.8" />
      ) : null}
    </svg>
  );
}

/** The Cocorena logo mark: a coconut with two palm fronds. */
export function LogoMark({ size = 30, className }: CoconutVisualProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="24" r="11" fill="var(--color-brown)" />
      <ellipse cx="17" cy="20" rx="4" ry="2.5" fill="rgba(255,255,255,0.28)" />
      <path
        d="M20 14 C 15 8, 9 8, 4 11 C 10 9, 15 11, 19 15"
        fill="var(--color-palm)"
      />
      <path
        d="M21 14 C 26 8, 33 8, 37 12 C 31 9, 26 11, 21 15"
        fill="var(--color-palm-deep)"
      />
    </svg>
  );
}

interface PalmTreeProps {
  coconuts?: number;
  growing?: boolean;
  className?: string;
}

/** Hero tree: coconuts render as healthy harvest up to 6, cap for sanity. */
export function PalmTree({ coconuts = 0, growing = false, className }: PalmTreeProps) {
  const shown = Math.max(0, Math.min(6, coconuts));
  return (
    <svg viewBox="0 0 200 220" className={className} role="img" aria-label="A coconut tree bearing today's harvest">
      {/* ground */}
      <ellipse cx="100" cy="205" rx="72" ry="9" fill="rgba(138,90,43,0.18)" />
      {/* trunk */}
      <path
        d="M97 200 C 94 168, 92 140, 100 112 C 105 96, 108 88, 106 76"
        strokeWidth="12"
        strokeLinecap="round"
        stroke="var(--color-brown)"
        fill="none"
      />
      <path
        d="M96 186 C 100 184, 104 184, 108 186 M95 166 C 99 164, 103 164, 107 166 M95 146 C 99 144, 103 144, 107 146"
        stroke="var(--color-brown-deep)"
        strokeWidth="2"
        fill="none"
        opacity="0.6"
      />
      {/* fronds: 6 leaves */}
      <g fill="var(--color-palm)">
        <path d="M106 76 C 92 58, 70 52, 48 62 C 74 58, 92 66, 104 80 Z" />
        <path d="M106 76 C 118 56, 140 48, 164 56 C 140 56, 122 66, 110 80 Z" fill="var(--color-palm-deep)" />
        <path d="M104 82 C 84 74, 66 82, 56 98 C 76 88, 92 86, 106 88 Z" fill="var(--color-forest-soft)" />
        <path d="M110 82 C 130 74, 150 80, 160 96 C 142 86, 126 86, 112 88 Z" fill="var(--color-palm)" />
        <path d="M107 84 C 103 64, 107 48, 116 36 C 110 52, 111 68, 113 84 Z" fill="var(--color-palm-deep)" />
        <path d="M108 84 C 112 66, 110 50, 102 40 C 108 52, 106 68, 104 84 Z" fill="var(--color-forest-soft)" />
      </g>
      {/* coconuts under the crown */}
      <g>
        {Array.from({ length: shown }).map((_, i) => {
          const cols = 3;
          const cx = 86 + (i % cols) * 14;
          const cy = 92 + Math.floor(i / cols) * 12;
          return <circle key={i} cx={cx} cy={cy} r="5" fill="var(--color-gold)" stroke="var(--color-brown)" strokeWidth="1.5" />;
        })}
        {growing ? (
          <circle cx="140" cy="96" r="6" fill="var(--color-gold)" stroke="var(--color-brown)" strokeWidth="2" className="animate-pulse" />
        ) : null}
      </g>
    </svg>
  );
}

/** Subtle decorative frond strip for section breaks. */
export function FrondDivider({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 16" className={className} aria-hidden>
      <path
        d="M0 8 C 40 0, 80 16, 120 8 C 160 0, 200 16, 240 8"
        fill="none"
        stroke="var(--color-palm)"
        strokeWidth="2"
        opacity="0.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
