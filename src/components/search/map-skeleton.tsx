const PINS = [
  { left: "22%", top: "30%", delay: "0ms" },
  { left: "48%", top: "52%", delay: "200ms" },
  { left: "68%", top: "26%", delay: "400ms" },
  { left: "36%", top: "70%", delay: "600ms" },
  { left: "78%", top: "64%", delay: "800ms" },
];

/** Stand-in for the map while its code, style and first tiles load. Faint streets and pulsing pins, same palette as the page. */
export function MapSkeleton({ className = "" }: { className?: string }) {
  return (
    <div role="status" aria-label="Loading map" className={`absolute inset-0 overflow-hidden bg-muted ${className}`}>
      <svg
        className="absolute inset-0 h-full w-full text-border"
        viewBox="0 0 400 300"
        preserveAspectRatio="xMidYMid slice"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        aria-hidden
      >
        <path d="M-10 90 C 90 70, 160 130, 260 110 S 380 60, 420 80" strokeWidth="10" />
        <path d="M-10 220 C 70 200, 150 250, 240 215 S 360 190, 420 230" strokeWidth="10" />
        <path d="M120 -10 C 140 80, 100 150, 150 230 S 170 290, 160 310" strokeWidth="8" />
        <path d="M300 -10 C 280 70, 330 140, 290 210 S 320 280, 330 310" strokeWidth="8" />
        <path d="M-10 160 L 420 150" strokeWidth="4" />
        <path d="M210 -10 L 220 310" strokeWidth="4" />
      </svg>
      {PINS.map((p) => (
        <span
          key={p.left + p.top}
          className="absolute size-9 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-card bg-foreground/15 motion-safe:animate-pulse"
          style={{ left: p.left, top: p.top, animationDelay: p.delay }}
        />
      ))}
      <span className="sr-only">Loading map…</span>
    </div>
  );
}
