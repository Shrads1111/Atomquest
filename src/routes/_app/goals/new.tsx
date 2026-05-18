import { createFileRoute, Link } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { GlassCard, StatusChip } from "../../../components/goalsync/Primitives";
import { WeightRing } from "../../../components/goalsync/WeightRing";
import { verifyGoalSheetCompositionIntegrity, type GoalNode } from "../../../lib/goal-validation";
import { AlertTriangle, ArrowLeft, ArrowRight, Check, Plus, Trash2, X } from "lucide-react";

export const Route = createFileRoute("/_app/goals/new")({
  head: () => ({
    meta: [
      { title: "New Goal — GoalSync" },
      { name: "description", content: "Multi-step goal registration wizard with live weight validation." },
    ],
  }),
  component: WizardPage,
});

const THRUST_AREAS = [
  "Product Scaling Frameworks",
  "Operational Efficiency Optimization",
  "Infrastructure System Reliability",
  "Compliance & Risk",
  "People & Leadership",
  "Innovation & Research",
];

const UOM: { id: GoalNode["uom"]; label: string; desc: string }[] = [
  { id: "numeric", label: "Numeric", desc: "Achievement ÷ Target" },
  { id: "percentage", label: "Percentage", desc: "% Completion baseline" },
  { id: "timeline", label: "Timeline", desc: "Inverse (Lower is Better)" },
  { id: "zero-based", label: "Zero-Based", desc: "Failure-vector floor at 0" },
];

function WizardPage() {
  const [step, setStep] = useState(2);
  const [goals, setGoals] = useState<GoalNode[]>([
    { id: "n1", title: "Implement Core Platform Optimization Modules", thrustArea: "Product Scaling Frameworks", uom: "percentage", assignedWeightageFactor: 0.35 },
    { id: "n2", title: "Reduce Bundle Size Across Edge Runtime", thrustArea: "Operational Efficiency Optimization", uom: "numeric", assignedWeightageFactor: 0.30 },
    { id: "n3", title: "Launch Internal Developer Telemetry SDK", thrustArea: "Innovation & Research", uom: "percentage", assignedWeightageFactor: 0.20 },
  ]);

  const validation = useMemo(() => verifyGoalSheetCompositionIntegrity(goals), [goals]);

  const update = (id: string, patch: Partial<GoalNode>) =>
    setGoals((g) => g.map((x) => (x.id === id ? { ...x, ...patch } : x)));
  const remove = (id: string) => setGoals((g) => g.filter((x) => x.id !== id));
  const add = () =>
    setGoals((g) => [
      ...g,
      { id: `n${Date.now()}`, title: "", thrustArea: THRUST_AREAS[0], uom: "numeric", assignedWeightageFactor: 0.1 },
    ]);

  return (
    <div className="space-y-8">
      <div>
        <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Goal Registration Assistant</div>
        <h1 className="text-2xl font-bold mt-1">Multi-Step Optimization Wizard</h1>
      </div>

      {/* Stepper */}
      <div className="glass-card p-4">
        <div className="flex items-center gap-3 overflow-x-auto">
          {[
            { n: 1, label: "Context Map", state: "done" },
            { n: 2, label: "Core Metrics Allocation", state: "active" },
            { n: 3, label: "Approval Routing", state: "locked" },
          ].map((s, i, arr) => (
            <div key={s.n} className="flex items-center gap-3 shrink-0">
              <div
                className={`h-8 w-8 rounded-full grid place-items-center text-xs font-bold font-mono-metric border ${
                  s.state === "done"
                    ? "bg-emerald-500/15 text-emerald-300 border-emerald-500/40"
                    : s.state === "active"
                    ? "bg-indigo-500/20 text-indigo-200 border-indigo-500/50 shadow-[0_0_18px_var(--glow-brand-indigo)]"
                    : "bg-white/3 text-muted-foreground border-white/8"
                }`}
              >
                {s.state === "done" ? <Check className="h-4 w-4" /> : s.n}
              </div>
              <div className={s.state === "active" ? "text-white" : "text-muted-foreground"}>
                <div className="text-xs uppercase tracking-[0.16em] font-mono-metric">Step {s.n}</div>
                <div className="text-sm font-semibold">{s.label}</div>
              </div>
              {i < arr.length - 1 && <div className="w-12 h-px bg-white/10 mx-2" />}
            </div>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="grid grid-cols-1 lg:grid-cols-[1fr_400px] gap-6">
        {/* Form */}
        <div className="space-y-4">
          {goals.map((g, idx) => (
            <GlassCard key={g.id} className="p-5">
              <div className="flex items-center justify-between mb-3">
                <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                  Goal Node Instance #{idx + 1}
                </div>
                <button
                  onClick={() => remove(g.id)}
                  className="text-muted-foreground hover:text-rose-300"
                  aria-label="Remove goal"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="sm:col-span-1">
                  <Label>Thrust Area</Label>
                  <select
                    className="input-cinematic mt-1.5 appearance-none cursor-pointer"
                    value={g.thrustArea}
                    onChange={(e) => update(g.id, { thrustArea: e.target.value })}
                  >
                    {THRUST_AREAS.map((t) => (
                      <option key={t} value={t} className="bg-[#0C0E17]">{t}</option>
                    ))}
                  </select>
                </div>
                <div className="sm:col-span-2">
                  <Label>Objective Title</Label>
                  <input
                    className="input-cinematic mt-1.5"
                    placeholder="Define the qualitative baseline and measurable parameters of this target..."
                    value={g.title}
                    onChange={(e) => update(g.id, { title: e.target.value })}
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>Unit of Measure</Label>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-1.5">
                  {UOM.map((u) => {
                    const active = g.uom === u.id;
                    return (
                      <button
                        key={u.id}
                        onClick={() => update(g.id, { uom: u.id })}
                        className={`text-left rounded-lg p-3 border transition-all ${
                          active
                            ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_18px_var(--glow-brand-indigo)]"
                            : "border-white/8 bg-white/3 hover:border-white/15"
                        }`}
                      >
                        <div className="text-sm font-semibold">{u.label}</div>
                        <div className="text-[11px] text-muted-foreground font-mono-metric mt-0.5">{u.desc}</div>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="mt-5">
                <div className="flex items-center justify-between">
                  <Label>Weight Allocation</Label>
                  <div className="font-mono-metric text-sm">
                    <span className="text-indigo-300">{(g.assignedWeightageFactor * 100).toFixed(0)}%</span>
                  </div>
                </div>
                <input
                  type="range"
                  min={10}
                  max={80}
                  value={Math.round(g.assignedWeightageFactor * 100)}
                  onChange={(e) => update(g.id, { assignedWeightageFactor: Number(e.target.value) / 100 })}
                  className="w-full mt-2 accent-indigo-500"
                />
                <div className="flex justify-between text-[10px] text-muted-foreground font-mono-metric mt-1">
                  <span>10% floor</span><span>80% ceiling</span>
                </div>
              </div>
            </GlassCard>
          ))}

          <button onClick={add} className="btn-ghost w-full justify-center">
            <Plus className="h-4 w-4" /> Append Goal Node
          </button>

          <div className="flex items-center justify-between pt-2">
            <button onClick={() => setStep(Math.max(1, step - 1))} className="btn-ghost">
              <ArrowLeft className="h-4 w-4" /> Back
            </button>
            <Link
              to="/employee"
              className={`btn-primary ${!validation.isValidationChainPassed ? "opacity-60 pointer-events-none" : ""}`}
            >
              Route to Approval <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>

        {/* Right: integrity */}
        <div className="space-y-4 lg:sticky lg:top-24 lg:self-start">
          <GlassCard className="p-6">
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
              Live Integrity Runtime
            </div>
            <div className="mt-2 flex flex-col items-center">
              <WeightRing pct={validation.totalWeightPct} />
              <div className="mt-3 text-center">
                {validation.totalWeightPct === 100 ? (
                  <StatusChip tone="emerald">Balanced · Submit Ready</StatusChip>
                ) : validation.totalWeightPct < 100 ? (
                  <StatusChip tone="amber">Sheet Underloaded</StatusChip>
                ) : (
                  <StatusChip tone="crimson">Over-allocation Breach</StatusChip>
                )}
              </div>
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric mb-3">
              Structural Integrity
            </div>
            <ul className="space-y-2 text-sm">
              <CheckItem ok={goals.length <= 8} label={`Goals within bounds (${goals.length} / 8)`} />
              <CheckItem ok={goals.every((g) => g.assignedWeightageFactor >= 0.1)} label="Each goal ≥ 10% weight floor" />
              <CheckItem ok={Math.abs(validation.totalWeightPct - 100) < 0.05} label="Total weight = 100%" />
              <CheckItem ok={goals.every((g) => g.title.trim().length > 0)} label="All titles populated" />
            </ul>
          </GlassCard>

          {!validation.isValidationChainPassed && (
            <GlassCard className="p-5 border-amber-500/30 bg-amber-500/5">
              <div className="flex items-center gap-2 text-amber-300 text-[10px] uppercase tracking-[0.22em] font-mono-metric">
                <AlertTriangle className="h-3.5 w-3.5" /> Validation Conflicts
              </div>
              <ul className="mt-2 space-y-1.5 text-xs text-amber-100/80 font-mono-metric">
                {validation.activeErrorLogsTraceCollection.map((e, i) => (
                  <li key={i}>· {e}</li>
                ))}
              </ul>
            </GlassCard>
          )}
        </div>
      </div>
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">{children}</label>;
}
function CheckItem({ ok, label }: { ok: boolean; label: string }) {
  return (
    <li className="flex items-center gap-2">
      <span
        className={`h-5 w-5 rounded-full grid place-items-center text-[10px] ${
          ok ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/40" : "bg-rose-500/15 text-rose-300 border border-rose-500/40"
        }`}
      >
        {ok ? <Check className="h-3 w-3" /> : <X className="h-3 w-3" />}
      </span>
      <span className={ok ? "text-white/90" : "text-rose-200/90"}>{label}</span>
    </li>
  );
}
