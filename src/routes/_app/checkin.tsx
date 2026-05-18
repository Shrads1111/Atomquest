import { createFileRoute } from "@tanstack/react-router";
import { GlassCard, StatusChip, ProgressBar } from "../../components/goalsync/Primitives";
import { AtSign, Flag, Paperclip, Send, RefreshCw, AlertCircle, CheckCircle2 } from "lucide-react";
import { useState, useEffect } from "react";
import { getMyGoals, Goal } from "@/services/goals";
import { getMyCheckins, submitCheckin, Checkin } from "@/services/checkins";
import { Dropzone } from "@/components/goalsync/Dropzone";
import { getFirebaseDb } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";
import { useAuth } from "@/contexts/auth-context";

export const Route = createFileRoute("/_app/checkin")({
  head: () => ({
    meta: [
      { title: "Quarterly Check-In — GoalSync" },
      {
        name: "description",
        content:
          "Collaborative quarterly check-in workspace coordinating metrics with supervisor reviews.",
      },
    ],
  }),
  component: CheckinPage,
});

const BANDS = [
  { id: "crit", label: "Critical Underperformance", range: "<50%", tone: "crimson" },
  { id: "appr", label: "Approaching Objectives", range: "50–79%", tone: "amber" },
  { id: "align", label: "Target Alignment Verified", range: "80–100%", tone: "emerald" },
  { id: "exc", label: "Exceeding Projections", range: "101–120%", tone: "indigo" },
  { id: "expand", label: "Exceptional Expansion", range: ">120%", tone: "indigo" },
];

function CheckinPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Core dynamic datasets
  const [goals, setGoals] = useState<Goal[]>([]);
  const [checkins, setCheckins] = useState<Checkin[]>([]);

  // Selected goal tracking
  const [selectedGoalId, setSelectedGoalId] = useState("");

  // New check-in state
  const [achievementVal, setAchievementVal] = useState("");
  const [remarksVal, setRemarksVal] = useState("");
  const [evidenceUrl, setEvidenceUrl] = useState("");
  const [evidenceName, setEvidenceName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [checkinMessage, setCheckinMessage] = useState("");

  // Online/Offline handling
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  // REAL-TIME FIREBASE SYNCHRONIZATION
  useEffect(() => {
    if (!user?.id) return;
    setLoading(true);
    setError(null);
    const db = getFirebaseDb();

    // 1. Subscribe to Goals (Real-Time)
    const qGoals = query(collection(db, "goals"), where("employeeId", "==", user.id));
    const unsubscribeGoals = onSnapshot(
      qGoals,
      (snapshot) => {
        const activeGoals = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as unknown as Goal,
        );
        setGoals(activeGoals);

        if (activeGoals.length > 0 && !selectedGoalId) {
          setSelectedGoalId(activeGoals[0].id || "");
        }
        setLoading(false);
      },
      (err) => {
        setError(`Goals sync dropped: ${err.message}`);
      },
    );

    // 2. Subscribe to Check-ins (Real-Time)
    const qCheckins = query(collection(db, "checkins"), where("employeeId", "==", user.id));
    const unsubscribeCheckins = onSnapshot(
      qCheckins,
      (snapshot) => {
        const checkinRes = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as unknown as Checkin,
        );
        setCheckins(checkinRes);
      },
      (err) => {
        setError(`Checkins sync dropped: ${err.message}`);
      },
    );

    return () => {
      unsubscribeGoals();
      unsubscribeCheckins();
    };
  }, [user?.id]);

  const handleCommitCheckin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !achievementVal) {
      setCheckinMessage("Please insert an achievement value.");
      return;
    }

    const val = parseFloat(achievementVal);
    if (isNaN(val)) {
      setCheckinMessage("Achievement value must be a valid number.");
      return;
    }

    try {
      setSubmitting(true);
      setError(null);

      await submitCheckin({
        goal_id: selectedGoalId,
        achieved: val,
        remarks: remarksVal,
        evidence_link: evidenceUrl || undefined,
        status: val >= (selectedGoal?.target || 100) ? "Completed" : "On Track",
      });

      setAchievementVal("");
      setRemarksVal("");
      setEvidenceUrl("");
      setEvidenceName("");
      setCheckinMessage("Check-in submitted successfully!");
      setTimeout(() => setCheckinMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to commit check-in.");
    } finally {
      setSubmitting(false);
    }
  };

  const handleEvidenceUploadSuccess = (url: string, name: string) => {
    setEvidenceUrl(url);
    setEvidenceName(name);
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-mono-metric text-indigo-200">
          Syncing Check-in Workspace Environment...
        </div>
      </div>
    );
  }

  // Get active selected goal
  const selectedGoal = goals.find((g) => g.id === selectedGoalId) || goals[0];

  // Map qualitative performance band based on progress score
  const progressPercent = selectedGoal?.progress ?? 0;
  const currentBandId =
    progressPercent < 50
      ? "crit"
      : progressPercent < 80
        ? "appr"
        : progressPercent <= 100
          ? "align"
          : progressPercent <= 120
            ? "exc"
            : "expand";

  // Filter check-in history threads for selected goal
  const selectedCheckins = checkins.filter((c) => c.goalId === selectedGoal?.id);

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold font-mono-metric flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {!isOnline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
          <AlertCircle className="h-4 w-4" /> You are operating offline. File uploads are disabled.
        </div>
      )}

      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
            Quarterly Progress Hub
          </div>
          <h1 className="text-2xl font-bold mt-1">Performance Check-In Workspace</h1>
        </div>

        {/* Goal Selector */}
        {goals.length > 0 && (
          <div className="relative">
            <select
              value={selectedGoalId}
              onChange={(e) => setSelectedGoalId(e.target.value)}
              className="bg-slate-950 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
            >
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title.substring(0, 40)}...
                </option>
              ))}
            </select>
          </div>
        )}
      </div>

      {goals.length === 0 ? (
        <GlassCard className="p-10 text-center text-xs text-muted-foreground font-mono-metric">
          ⚠ No active goals drafted for this cycle. Draft goals first inside the Employee Dashboard.
        </GlassCard>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Panel A - Telemetry Metrics */}
          <GlassCard className="p-6">
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                Panel A · Metrics Radar Engine
              </div>
              <StatusChip tone={progressPercent >= 80 ? "emerald" : "amber"}>
                Active Node
              </StatusChip>
            </div>
            <h3 className="text-lg font-semibold mt-2 leading-snug">{selectedGoal?.title}</h3>
            <p className="text-xs text-muted-foreground mt-1">
              {selectedGoal?.description || "No description provided."}
            </p>

            <div className="mt-5 grid grid-cols-2 gap-3">
              <Tile
                label="Target Metric"
                value={`${selectedGoal?.target} (${selectedGoal?.uom})`}
              />
              <Tile
                label="Observed Achieved"
                value={`${selectedGoal?.achieved} (${selectedGoal?.uom})`}
                accent="emerald"
              />
            </div>

            <div className="mt-5 glass-elevated p-4">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">
                Performance Formula Trace
              </div>
              <div className="mt-2 font-mono-metric text-sm">
                <span className="text-indigo-200">Score</span> ={" "}
                <span className="text-emerald-300">Observed</span> ÷{" "}
                <span className="text-amber-200">Target</span>
              </div>
              <div className="mt-1 font-mono-metric text-sm text-white/80">
                {selectedGoal?.achieved} / {selectedGoal?.target} ={" "}
                <span className="text-emerald-300">{progressPercent.toFixed(1)}%</span>
              </div>
            </div>

            <div className="mt-5">
              <ProgressBar
                value={progressPercent}
                tone={progressPercent >= 80 ? "emerald" : "amber"}
              />
              <div className="mt-2 text-xs text-muted-foreground font-mono-metric">
                {progressPercent.toFixed(1)}% Baseline Completion Factor Mapped
              </div>
            </div>

            <div className="mt-6">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric mb-2">
                Qualitative Performance Band
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {BANDS.map((b) => {
                  const active = currentBandId === b.id;
                  return (
                    <div
                      key={b.id}
                      className={`text-left rounded-lg p-3 border transition-all ${
                        active
                          ? "border-indigo-500/60 bg-indigo-500/10 shadow-[0_0_18px_rgba(99,102,241,0.25)]"
                          : "border-white/5 bg-white/2 opacity-60"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">{b.label}</div>
                        <span className={`chip chip-${b.tone}`}>{b.range}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </GlassCard>

          {/* Panel B - Supervisor Collaboration Thread */}
          <GlassCard className="p-6 flex flex-col justify-between">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">
                  Panel B · Supervisor Collaboration
                </div>
                <StatusChip tone="indigo">{selectedCheckins.length} Updates</StatusChip>
              </div>

              <div className="mt-5 space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {selectedCheckins.length === 0 ? (
                  <div className="p-8 text-center text-xs text-muted-foreground font-mono-metric border border-dashed border-white/10 rounded-xl">
                    No collaboration log thread for this objective yet. Use the submit console below
                    to register progress.
                  </div>
                ) : (
                  selectedCheckins.map((c, i) => (
                    <div
                      key={c.id || i}
                      className="rounded-lg p-4 glass-elevated border-l-[3px] space-y-2"
                      style={{ borderLeftColor: c.managerRemarks ? "#10B981" : "#4F46E5" }}
                    >
                      <div className="flex items-center justify-between text-xs text-muted-foreground font-mono-metric">
                        <span>Self Check-in</span>
                        <span>{c.ts ? c.ts.substring(0, 16) : "Just now"}</span>
                      </div>
                      <div className="text-sm text-white/95 font-semibold font-mono-metric">
                        Observed Achievement: {c.achieved} ({progressPercent.toFixed(1)}% complete)
                      </div>
                      {c.remarks && (
                        <p className="text-xs text-muted-foreground italic">“ {c.remarks} ”</p>
                      )}

                      {c.evidenceLink && (
                        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300 hover:text-indigo-200">
                          <Paperclip className="h-3.5 w-3.5" />
                          <a
                            href={c.evidenceLink}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="hover:underline"
                          >
                            View Uploaded Evidence attachment
                          </a>
                        </div>
                      )}

                      {c.managerRemarks ? (
                        <div className="mt-3 pt-3 border-t border-white/5 space-y-1">
                          <div className="text-[9px] uppercase tracking-wider text-emerald-400 font-mono-metric">
                            Supervisor Assessment — {c.managerStatus}
                          </div>
                          <p className="text-xs text-indigo-200">“ {c.managerRemarks} ”</p>
                        </div>
                      ) : (
                        <div className="mt-2 text-[9px] text-amber-400 font-mono-metric">
                          ⏳ Awaiting supervisor rating & feedback signature.
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Submit checkin section inside Panel B */}
            <div className="mt-5 pt-4 border-t border-white/5 space-y-4">
              {/* Evidence upload dropzone */}
              {isOnline && (
                <div className="space-y-1.5">
                  <label className="block text-[9px] uppercase tracking-wider text-indigo-300 font-mono-metric">
                    Check-in evidence PDF/Image upload
                  </label>
                  <Dropzone onUploadSuccess={handleEvidenceUploadSuccess} />
                </div>
              )}

              <form onSubmit={handleCommitCheckin} className="space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric mb-1">
                      Actual Observed Achievement
                    </label>
                    <input
                      type="number"
                      step="any"
                      required
                      placeholder={`e.g. ${selectedGoal?.target || 10}`}
                      value={achievementVal}
                      onChange={(e) => setAchievementVal(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono-metric"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric mb-1">
                      Objective Status
                    </label>
                    <span className="w-full block bg-slate-900 border border-white/5 text-muted-foreground rounded-lg p-2 text-xs font-mono-metric font-semibold">
                      {progressPercent >= 100 ? "Completed" : "On Track"}
                    </span>
                  </div>
                </div>

                <div>
                  <textarea
                    rows={2}
                    placeholder="Append self-evaluation or operational constraint notes..."
                    value={remarksVal}
                    onChange={(e) => setRemarksVal(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                <div className="flex items-center justify-between gap-2 flex-wrap">
                  {checkinMessage && (
                    <div className="text-xs text-emerald-400 font-mono-metric flex items-center gap-1.5 animate-pulse">
                      <CheckCircle2 className="h-3.5 w-3.5" /> {checkinMessage}
                    </div>
                  )}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="btn-primary text-xs py-2 px-3 ml-auto"
                  >
                    {submitting ? (
                      <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                    ) : (
                      <Send className="h-3.5 w-3.5" />
                    )}
                    Commit Progress Score
                  </button>
                </div>
              </form>
            </div>
          </GlassCard>
        </div>
      )}
    </div>
  );
}

function Tile({
  label,
  value,
  accent = "indigo",
}: {
  label: string;
  value: string;
  accent?: "indigo" | "emerald";
}) {
  return (
    <div className="glass-elevated p-4">
      <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">
        {label}
      </div>
      <div
        className={`mt-1 text-2xl font-bold font-mono-metric ${accent === "emerald" ? "text-emerald-300" : "text-indigo-200"}`}
      >
        {value}
      </div>
    </div>
  );
}
