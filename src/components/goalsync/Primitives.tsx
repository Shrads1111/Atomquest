import { type ReactNode } from "react";

export function GlassCard({
  children,
  className = "",
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  glow?: boolean;
}) {
  return (
    <div className={`glass-card ${glow ? "ring-indigo-glow" : ""} ${className}`}>{children}</div>
  );
}

export function MetricTile({
  label,
  value,
  sub,
  accent = "indigo",
  mono = true,
}: {
  label: string;
  value: string;
  sub?: string;
  accent?: "indigo" | "emerald" | "amber" | "crimson" | "muted";
  mono?: boolean;
}) {
  const accentMap: Record<string, string> = {
    indigo: "from-indigo-500/60 to-blue-500/0",
    emerald: "from-emerald-500/60 to-emerald-500/0",
    amber: "from-amber-500/60 to-amber-500/0",
    crimson: "from-rose-500/60 to-rose-500/0",
    muted: "from-white/15 to-white/0",
  };
  const textMap: Record<string, string> = {
    indigo: "text-indigo-300",
    emerald: "text-emerald-300",
    amber: "text-amber-300",
    crimson: "text-rose-300",
    muted: "text-white",
  };
  return (
    <div className="glass-card relative overflow-hidden p-5">
      <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-metric">
        {label}
      </div>
      <div
        className={`mt-2 text-3xl font-bold ${mono ? "font-mono-metric" : ""} ${textMap[accent]}`}
      >
        {value}
      </div>
      {sub && <div className="mt-1.5 text-xs text-muted-foreground">{sub}</div>}
      <div
        className={`pointer-events-none absolute bottom-0 left-0 right-0 h-[2px] bg-gradient-to-r ${accentMap[accent]} pulse-accent`}
      />
    </div>
  );
}

export function StatusChip({
  tone,
  children,
}: {
  tone: "emerald" | "amber" | "crimson" | "indigo" | "muted";
  children: ReactNode;
}) {
  return <span className={`chip chip-${tone}`}>{children}</span>;
}

export function ProgressBar({
  value,
  tone = "emerald",
}: {
  value: number;
  tone?: "emerald" | "indigo" | "amber" | "crimson";
}) {
  return (
    <div className="progress-track">
      <div
        className={`progress-fill progress-fill-${tone}`}
        style={{ width: `${Math.min(100, Math.max(0, value))}%` }}
      />
    </div>
  );
}
