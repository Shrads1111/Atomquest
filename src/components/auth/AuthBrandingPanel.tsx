import { motion } from "framer-motion";
import { BarChart3, CheckCircle2, Lock, Target, TrendingUp, Users, Workflow } from "lucide-react";
import { Sparkline } from "@/components/goalsync/Sparkline";

const STATS = [
  { label: "OKR Alignment", value: "94%", tone: "text-indigo-400" },
  { label: "Goals On Track", value: "127", tone: "text-emerald-400" },
  { label: "Team Velocity", value: "+18%", tone: "text-amber-400" },
];

const PREVIEW_GOALS = [
  { title: "Reduce platform MTTR", progress: 78, color: "#10B981" },
  { title: "Launch Q3 OKR cycle", progress: 62, color: "#6366F1" },
  { title: "Customer NPS ≥ 72", progress: 91, color: "#10B981" },
];

export function AuthBrandingPanel() {
  return (
    <motion.section
      className="relative hidden lg:flex flex-col justify-between p-10 xl:p-12 overflow-hidden border-r border-border/50 auth-brand-panel"
      initial={{ opacity: 0, x: -24 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
    >
      <motion.div
        className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_left,rgba(79,70,229,0.22),transparent_55%)]"
        animate={{ opacity: [0.7, 1, 0.7] }}
        transition={{ duration: 6, repeat: Infinity }}
      />

      <div className="relative z-10 flex items-center gap-3">
        <motion.div
          className="h-11 w-11 rounded-xl bg-gradient-to-br from-indigo-500 to-blue-600 grid place-items-center shadow-lg shadow-indigo-500/30"
          whileHover={{ scale: 1.05, rotate: 3 }}
        >
          <Workflow className="h-5 w-5 text-white" />
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="text-xl font-bold tracking-tight">GoalSync</div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-muted-foreground font-mono">
            Enterprise Performance OS
          </div>
        </motion.div>
      </div>

      <div className="relative z-10 my-auto space-y-5">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
        >
          <h2 className="text-3xl xl:text-4xl font-bold tracking-tight leading-tight max-w-md">
            Align teams. <span className="text-gradient-indigo">Track what matters.</span>
          </h2>
          <p className="mt-3 text-muted-foreground max-w-md text-sm leading-relaxed">
            The modern OKR & performance platform for enterprises that run on clarity,
            accountability, and measurable outcomes.
          </p>
        </motion.div>

        <motion.div
          className="auth-glass-card p-5 space-y-4"
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.35 }}
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-muted-foreground">
              <BarChart3 className="h-3.5 w-3.5 text-indigo-400" />
              Live performance preview
            </div>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 font-mono">
              SYNC LIVE
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3">
            {STATS.map((s, i) => (
              <motion.div
                key={s.label}
                className="rounded-lg bg-background/30 border border-border/50 p-3 text-center"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.4 + i * 0.08 }}
              >
                <div className={`text-lg font-bold font-mono ${s.tone}`}>{s.value}</div>
                <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">
                  {s.label}
                </div>
              </motion.div>
            ))}
          </div>

          <div className="space-y-2.5">
            {PREVIEW_GOALS.map((g, i) => (
              <motion.div
                key={g.title}
                className="space-y-1"
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.1 }}
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="flex items-center gap-1.5 text-foreground/90">
                    <Target className="h-3 w-3 text-indigo-400" />
                    {g.title}
                  </span>
                  <span className="font-mono text-muted-foreground">{g.progress}%</span>
                </div>
                <div className="h-1.5 rounded-full bg-muted/50 overflow-hidden">
                  <motion.div
                    className="h-full rounded-full"
                    style={{ background: g.color }}
                    initial={{ width: 0 }}
                    animate={{ width: `${g.progress}%` }}
                    transition={{ delay: 0.7 + i * 0.15, duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </motion.div>
            ))}
          </div>

          <div className="pt-2 border-t border-border/40">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
                <TrendingUp className="h-3 w-3" /> Quarterly trajectory
              </span>
              <span className="chip chip-emerald text-[10px] py-0">+24.6%</span>
            </div>
            <Sparkline
              values={[42, 48, 52, 58, 61, 68, 72, 78, 82, 88, 91, 96]}
              stroke="#10B981"
              height={56}
            />
          </div>
        </motion.div>

        <motion.div
          className="flex flex-wrap gap-4 text-xs text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.65 }}
        >
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-indigo-400" /> 2,400+ teams
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-400" /> SOC2 certified
          </span>
        </motion.div>
      </div>

      <motion.div
        className="relative z-10 flex items-center gap-2 text-[11px] text-muted-foreground font-mono"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.75 }}
      >
        <Lock className="h-3.5 w-3.5" /> Firebase Auth · Firestore · GDPR ready
      </motion.div>
    </motion.section>
  );
}
