export function WeightRing({ pct, size = 160 }: { pct: number; size?: number }) {
  const r = size / 2 - 14;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.min(100, Math.max(0, pct)) / 100) * c;
  const tone = pct === 100 ? "#10B981" : pct > 100 ? "#EF4444" : pct >= 50 ? "#F59E0B" : "#EF4444";
  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="rgba(255,255,255,0.06)"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke={tone}
          strokeWidth="10"
          strokeLinecap="round"
          fill="none"
          strokeDasharray={c}
          strokeDashoffset={offset}
          style={{
            transition: "stroke-dashoffset .8s cubic-bezier(.2,.8,.2,1), stroke .3s ease",
            filter: `drop-shadow(0 0 12px ${tone})`,
          }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className="font-mono-metric font-bold text-3xl" style={{ color: tone }}>
            {pct.toFixed(0)}%
          </div>
          <div className="text-[10px] tracking-[0.18em] uppercase text-muted-foreground mt-1">
            Allocated
          </div>
        </div>
      </div>
    </div>
  );
}
