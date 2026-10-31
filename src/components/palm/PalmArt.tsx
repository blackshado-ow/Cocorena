/* Coconut & palm SVG art for Cocorena. No external image dependencies. */

interface CoconutVisualProps {
  size?: number;
  className?: string;
}

/** Status coconut used across the garden, dashboard strip, and timers. */
export type CoconutStatus = "qualified" | "missed" | "pending" | "future" | "growing";

const colors: Record<CoconutStatus, { fill: string; ring: string; label: string }> = {
  qualified: { fill: "var(--color-palm)", ring: "var(--color-palm-deep)", label: "Qualified day" },
  missed: { fill: "var(--color-miss)", ring: "#8c3531", label: "Missed day" },
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
        strokeWidth="2"
        strokeDasharray={dashed ? "3.5 3.5" : undefined}
      />
      {status === "qualified" || status === "growing" ? (
        <ellipse cx="13" cy="12.5" rx="3" ry="2" fill="rgba(255,255,255,0.32)" />
      ) : null}
      {status === "missed" ? (
        <path d="M11.5 11.5 L20.5 20.5 M20.5 11.5 L11.5 20.5" stroke="#fff" strokeWidth="2" strokeLinecap="round" opacity="0.85" />
      ) : null}
    </svg>
  );
}

/** The Cocorena logo mark: a coconut cradled by two fronds, drawn with thin joyful strokes. */
export function LogoMark({ size = 30, className }: CoconutVisualProps) {
  return (
    <svg width={size} height={size} viewBox="0 0 40 40" className={className} aria-hidden>
      <circle cx="20" cy="23" r="9.5" fill="var(--color-brown)" />
      <path
        d="M13.5 19.5 a8 6 0 0 1 6 -3"
        fill="none"
        stroke="rgba(255,255,255,0.4)"
        strokeWidth="2.4"
        strokeLinecap="round"
      />
      {/* three small dots: coconut pores */}
      <circle cx="17" cy="21.5" r="0.9" fill="var(--color-brown-deep)" opacity="0.85" />
      <circle cx="20.5" cy="20.8" r="0.9" fill="var(--color-brown-deep)" opacity="0.85" />
      <circle cx="24" cy="21.5" r="0.9" fill="var(--color-brown-deep)" opacity="0.85" />
      {/* left frond */}
      <path
        d="M16 15 C 11 9, 5.5 7.5, 2 9.5 C 4 5.5, 11 5, 17 11.5"
        fill="var(--color-palm)"
      />
      {/* right frond */}
      <path
        d="M24 15 C 29 9, 34.5 7.5, 38 9.5 C 36 5.5, 29 5, 23 11.5"
        fill="var(--color-palm-deep)"
      />
      {/* crown sprig */}
      <path d="M20 12.5 C 19.6 9.5, 20.2 7.5, 21.5 5.5" fill="none" stroke="var(--color-brown)" strokeWidth="1.4" strokeLinecap="round" opacity="0.7" />
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
      <ellipse cx="100" cy="205" rx="70" ry="8" fill="rgba(135,87,34,0.16)" />
      {/* trunk: gentle curve, segmented texture */}
      <path
        d="M97 202 C 93 172, 91 144, 99 116 C 104 100, 107 90, 105 78"
        strokeWidth="11"
        strokeLinecap="round"
        stroke="var(--color-brown)"
        fill="none"
      />
      <path
        d="M96 188 C 100 186, 105 186, 109 188 M94.5 168 C 98.5 166, 103 166, 107.5 168 M94 148 C 98 146, 102.5 146, 107 148"
        stroke="var(--color-brown-deep)"
        strokeWidth="1.8"
        fill="none"
        opacity="0.55"
        strokeLinecap="round"
      />
      {/* fronds: six leaves, deeper greens for depth */}
      <g>
        <path d="M106 76 C 92 58, 70 52, 48 62 C 74 58, 92 66, 104 80 Z" fill="var(--color-palm)" />
        <path d="M106 76 C 118 56, 140 48, 164 56 C 140 56, 122 66, 110 80 Z" fill="var(--color-palm-deep)" />
        <path d="M104 82 C 84 74, 66 82, 56 98 C 76 88, 92 86, 106 88 Z" fill="var(--color-forest-soft)" />
        <path d="M110 82 C 130 74, 150 80, 160 96 C 142 86, 126 86, 112 88 Z" fill="var(--color-palm)" />
        <path d="M107 84 C 103 64, 107 46, 116 34 C 110 50, 111 68, 113 84 Z" fill="var(--color-palm-deep)" />
        <path d="M108 84 C 112 66, 110 48, 102 38 C 108 50, 106 68, 104 84 Z" fill="var(--color-forest-soft)" />
      </g>
      {/* coconuts under the crown */}
      <g>
        {Array.from({ length: shown }).map((_, i) => (
          <circle
            key={i}
            cx={86 + (i % 3) * 14}
            cy={92 + Math.floor(i / 3) * 12}
            r="5.5"
            fill="var(--color-gold)"
            stroke="var(--color-brown)"
            strokeWidth="1.4"
          />
        ))}
        {growing ? (
          <circle cx="142" cy="96" r="6.5" fill="var(--color-gold)" stroke="var(--color-brown)" strokeWidth="1.8" className="animate-pulse" />
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
        strokeWidth="1.5"
        opacity="0.45"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** A single botanical sprig: stem with paired leaves, for margins and quiet corners. */
export function Sprig({ className, flip = false }: { className?: string; flip?: boolean }) {
  return (
    <svg
      viewBox="0 0 48 48"
      className={className}
      aria-hidden
      style={flip ? { transform: "scaleX(-1)" } : undefined}
    >
      <path d="M24 46 C 23 34, 23 20, 25 4" fill="none" stroke="var(--color-palm)" strokeWidth="1.6" strokeLinecap="round" />
      <path d="M24.4 36 C 19 34, 15 30, 14 24 C 19 26, 23 30, 24.6 34" fill="var(--color-palm)" opacity="0.8" />
      <path d="M24.4 26 C 30 24, 34 20, 35 14 C 30 16, 26 20, 24.6 24" fill="var(--color-palm-deep)" opacity="0.75" />
      <path d="M24.6 16 C 20.5 14.5, 18 11, 17.5 7 C 21 8.6, 23.5 11.5, 24.8 14.5" fill="var(--color-palm)" opacity="0.8" />
      <path d="M25 4 C 26.5 7, 26.5 10, 25 12.5" fill="none" stroke="var(--color-gold)" strokeWidth="1.4" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}
