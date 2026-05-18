import { createFileRoute, Link } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import {
  MetricTile,
  GlassCard,
  StatusChip,
  ProgressBar,
} from "../../components/goalsync/Primitives";
import { Sparkline } from "../../components/goalsync/Sparkline";
import { useAuth } from "@/contexts/auth-context";
import { getMyGoals, saveGoalDraft, submitGoalSheet, Goal } from "@/services/goals";
import { getMyCheckins, submitCheckin, Checkin } from "@/services/checkins";
import {
  Clock,
  Lock,
  Plus,
  TrendingUp,
  AlertCircle,
  Bell,
  UserCheck,
  RefreshCw,
} from "lucide-react";
import { getFirebaseDb } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const Route = createFileRoute("/_app/employee")({
  head: () => ({
    meta: [
      { title: "Workspace — GoalSync" },
      {
        name: "description",
        content: "Employee performance workspace with live goal tracking and progress vectors.",
      },
    ],
  }),
  component: EmployeePage,
});

function EmployeePage() {
  const { user } = useAuth();
  const displayName = user?.fullName || "Employee";
  const title = user?.department || "Core R&D Engine";
  const initials =
    displayName
      ?.split(" ")
      .map((n) => n[0])
      .join("")
      .slice(0, 2)
      .toUpperCase() || "GS";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sheet, setSheet] = useState<any>(null);
  const [goals, setGoals] = useState<Goal[]>([]);
  const [sharedGoals, setSharedGoals] = useState<Goal[]>([]);
  const [activities, setActivities] = useState<any[]>([]);
  const [velocityData, setVelocityData] = useState<number[]>([45, 60, 55, 70, 85, 95]);
  const [notifications, setNotifications] = useState<any[]>([]);

  // Online/Offline handling
  const [isOnline, setIsOnline] = useState(
    typeof window !== "undefined" ? window.navigator.onLine : true,
  );

  // Check-in form state
  const [selectedGoalId, setSelectedGoalId] = useState("");
  const [achievementVal, setAchievementVal] = useState("");
  const [remarksVal, setRemarksVal] = useState("");
  const [checkinStatus, setCheckinStatus] = useState("On Track");
  const [checkinMessage, setCheckinMessage] = useState("");
  const [submittingCheckin, setSubmittingCheckin] = useState(false);
  const [submittingSheet, setSubmittingSheet] = useState(false);

  // Syncing connection detectors
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

    // 1. Subscribe to the active Q3 2026 Sheet
    const qSheet = query(
      collection(db, "goal_sheets"),
      where("employeeId", "==", user.id),
      where("cycleId", "==", "q3_2026"),
    );
    const unsubscribeSheet = onSnapshot(
      qSheet,
      (snapshot) => {
        if (!snapshot.empty) {
          const docData = snapshot.docs[0].data();
          setSheet({ id: snapshot.docs[0].id, ...docData });
        } else {
          setSheet(null);
        }
      },
      (err) => {
        setError(`Real-time sheet connection dropped: ${err.message}`);
      },
    );

    // 2. Subscribe to Goals
    const qGoals = query(collection(db, "goals"), where("employeeId", "==", user.id));
    const unsubscribeGoals = onSnapshot(
      qGoals,
      (snapshot) => {
        const allGoals = snapshot.docs.map((d) => ({ id: d.id, ...d.data() }) as unknown as Goal);
        const primary = allGoals.filter((g) => !g.isShared);
        const shared = allGoals.filter((g) => g.isShared);

        setGoals(primary);
        setSharedGoals(shared);

        if (primary.length > 0 && !selectedGoalId) {
          setSelectedGoalId(primary[0].id || "");
        }
        setLoading(false);
      },
      (err) => {
        setError(`Real-time goals connection dropped: ${err.message}`);
      },
    );

    // 3. Subscribe to Check-ins
    const qCheckins = query(collection(db, "checkins"), where("employeeId", "==", user.id));
    const unsubscribeCheckins = onSnapshot(
      qCheckins,
      (snapshot) => {
        const activeCheckins = snapshot.docs.map(
          (d) => ({ id: d.id, ...d.data() }) as unknown as Checkin,
        );

        // Map check-ins to dynamic Timeline Activities
        const activeTimeline = activeCheckins.map((c: Checkin) => ({
          id: c.id,
          type: "checkin",
          text: `Check-in completed with progress ${c.progress}%`,
          time: c.ts ? c.ts.substring(5, 16) : "Just now",
        }));
        setActivities(activeTimeline.slice(0, 4));

        // Map check-ins to Velocity Sparkline
        if (activeCheckins.length > 0) {
          const sorted = [...activeCheckins].sort((a, b) => (a.ts || "").localeCompare(b.ts || ""));
          const vals = sorted.map((c) => c.progress);
          if (vals.length === 1) vals.unshift(0);
          setVelocityData(vals.slice(-10));
        } else {
          setVelocityData([0, 0]);
        }
      },
      (err) => {
        setError(`Real-time check-ins connection dropped: ${err.message}`);
      },
    );

    // Clean up connections on unmount
    return () => {
      unsubscribeSheet();
      unsubscribeGoals();
      unsubscribeCheckins();
    };
  }, [user?.id]);

  // Handle building notifications dynamically when sheet changes
  useEffect(() => {
    const baseNotifications: any[] = [
      {
        id: 1,
        type: "reminder",
        text: "Quarterly check-in window closes soon. Complete all metrics updates.",
        tone: "amber",
      },
    ];
    if (sheet?.status === "Approved") {
      baseNotifications.unshift({
        id: 2,
        type: "success",
        text: "Q3 Goal Sheet has been officially validated and locked.",
        tone: "emerald" as const,
      });
    } else if (sheet?.status === "Rework") {
      baseNotifications.unshift({
        id: 3,
        type: "comment",
        text: `Rework Requested: "${sheet.reworkReason || "Check weight allocations"}"`,
        tone: "amber" as const,
      });
    }
    setNotifications(baseNotifications);
  }, [sheet]);

  // Handler to perform interactive check-in
  const handleCheckinSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedGoalId || !achievementVal) {
      setCheckinMessage("Please select a goal and input the achievement value.");
      return;
    }

    const value = parseFloat(achievementVal);
    if (isNaN(value)) {
      setCheckinMessage("Achievement value must be a valid number.");
      return;
    }

    try {
      setSubmittingCheckin(true);
      setCheckinMessage("");

      await submitCheckin({
        goal_id: selectedGoalId,
        achieved: value,
        remarks: remarksVal,
        status: checkinStatus,
      });

      setAchievementVal("");
      setRemarksVal("");
      setCheckinMessage("Check-in successfully recorded!");
      setTimeout(() => setCheckinMessage(""), 4000);
    } catch (e: any) {
      setCheckinMessage(`Error: ${e.message}`);
    } finally {
      setSubmittingCheckin(false);
    }
  };

  // Submit sheet
  const handleLockSubmit = async () => {
    if (!sheet) return;
    try {
      setSubmittingSheet(true);
      setError(null);
      await submitGoalSheet(sheet.id, "q3_2026");
    } catch (e: any) {
      setError(e.message || "Failed to submit goal sheet.");
    } finally {
      setSubmittingSheet(false);
    }
  };

  // Shared weightage adjusting handler
  const handleWeightageChange = async (id: string, newWeight: number) => {
    setSharedGoals((prev) =>
      prev.map((sg) => (sg.id === id ? { ...sg, weightage: newWeight } : sg)),
    );

    const targetGoal = sharedGoals.find((g) => g.id === id);
    if (targetGoal) {
      try {
        await saveGoalDraft({
          cycle_id: "q3_2026",
          goal_id: id,
          goal_title: targetGoal.title,
          thrust_area: targetGoal.thrustArea,
          uom_type: targetGoal.uom,
          target: targetGoal.target,
          weightage: newWeight,
          is_shared: true,
          shared_goal_id: targetGoal.sharedGoalId || null,
        });
      } catch (e) {
        console.warn("Failed to persist shared goal weight change:", e);
      }
    }
  };

  if (loading && goals.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-mono-metric text-indigo-200">
          Syncing with Secure Performance Telemetry...
        </div>
      </div>
    );
  }

  // Calculate dynamic average progress dynamically
  const totalGoalsCount = goals.length + sharedGoals.length;
  const avgProgress =
    totalGoalsCount > 0
      ? (goals.reduce((acc, curr) => acc + (curr.progress || 0), 0) +
          sharedGoals.reduce((acc, curr) => acc + (curr.progress || 0), 0)) /
        totalGoalsCount
      : 0;

  // Weightage sums check
  const totalWeightage =
    goals.reduce((acc, curr) => acc + (curr.weightage || 0), 0) +
    sharedGoals.reduce((acc, curr) => acc + (curr.weightage || 0), 0);

  const locked = sheet?.lockStatus === "locked";

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold font-mono-metric flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {!isOnline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
          <AlertCircle className="h-4 w-4" /> You are operating in offline mode. Changes will be
          synced when connection is restored.
        </div>
      )}

      {/* Profile Welcome Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div className="flex items-center gap-4">
          <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-indigo-500/20 to-blue-600/20 border border-indigo-500/30 grid place-items-center text-indigo-200 font-bold text-lg shadow-[0_0_20px_rgba(99,102,241,0.15)] relative shrink-0">
            {initials}
            <span
              className="absolute -bottom-0.5 -right-0.5 h-3.5 w-3.5 rounded-full bg-emerald-500 border-2 border-[#090d16]"
              title="Active Network Node"
            />
          </div>
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
              {title}
            </div>
            <h1 className="text-2xl font-bold mt-0.5">Welcome, {displayName}</h1>
          </div>
        </div>

        {/* Lock status banner */}
        <div className="flex items-center gap-2.5">
          <div
            className={`px-3 py-2 rounded-lg border text-xs font-mono-metric flex items-center gap-2 ${
              sheet?.status === "Approved"
                ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300"
                : sheet?.status === "Draft"
                  ? "bg-blue-500/10 border-blue-500/20 text-blue-300"
                  : sheet?.status === "Rework"
                    ? "bg-rose-500/10 border-rose-500/20 text-rose-300"
                    : "bg-amber-500/10 border-amber-500/20 text-amber-300"
            }`}
          >
            {sheet?.status === "Approved" ? (
              <UserCheck className="h-4 w-4" />
            ) : (
              <Clock className="h-4 w-4" />
            )}
            Stage: {sheet?.status || "Draft"}
          </div>

          {!locked && sheet?.status !== "Approved" && (
            <button
              onClick={handleLockSubmit}
              disabled={submittingSheet || totalWeightage !== 100}
              className={`btn-primary flex items-center gap-1.5 ${totalWeightage !== 100 ? "opacity-50 cursor-not-allowed" : ""}`}
            >
              {submittingSheet ? (
                <RefreshCw className="h-4 w-4 animate-spin" />
              ) : (
                <Lock className="h-4 w-4" />
              )}
              {totalWeightage !== 100 ? "Complete Weights to Lock" : "Lock & Submit Goal Sheet"}
            </button>
          )}

          {locked && (
            <div className="px-3.5 py-2 bg-slate-900 border border-white/5 text-muted-foreground text-xs font-mono-metric flex items-center gap-1.5 rounded-lg">
              <Lock className="h-4 w-4 text-emerald-400" /> Read-Only Sheet Locked
            </div>
          )}
        </div>
      </div>

      {/* Interactive visual metrics cards */}
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-4">
        <MetricTile
          label="Total Goals"
          value={String(totalGoalsCount)}
          sub="Active objectives"
          accent="indigo"
        />
        <MetricTile
          label="Approved Sheets"
          value={sheet?.status === "Approved" ? "1" : "0"}
          sub="Sealed locks"
          accent="emerald"
        />
        <MetricTile
          label="Goals Under Review"
          value={sheet?.status === "Pending Review" ? String(totalGoalsCount) : "0"}
          sub="Review queue"
          accent="amber"
        />
        <MetricTile
          label="Goals Completed"
          value={String(
            goals.filter((g) => g.progress >= 100).length +
              sharedGoals.filter((g) => g.progress >= 100).length,
          )}
          sub="100% achieved"
          accent="emerald"
        />
        <MetricTile
          label="Average Progress"
          value={`${avgProgress.toFixed(1)}%`}
          sub="Overall performance"
          accent="indigo"
        />
        <MetricTile
          label="Total Weightage"
          value={`${totalWeightage}%`}
          sub="Must equal 100%"
          accent={totalWeightage === 100 ? "emerald" : "crimson"}
        />
      </div>

      {/* Dynamic Notifications Banner */}
      {notifications.length > 0 && (
        <div className="space-y-2">
          {notifications.map((n) => (
            <div
              key={n.id}
              className={`p-4 rounded-xl border flex items-start gap-3 text-xs leading-relaxed transition-all ${
                n.tone === "emerald"
                  ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.08)]"
                  : n.tone === "amber"
                    ? "bg-amber-500/10 border-amber-500/20 text-amber-300 shadow-[0_0_15px_rgba(245,158,11,0.08)]"
                    : "bg-indigo-500/10 border-indigo-500/20 text-indigo-300 shadow-[0_0_15px_rgba(99,102,241,0.08)]"
              }`}
            >
              <Bell className="h-4 w-4 shrink-0 mt-0.5" />
              <div className="flex-1">{n.text}</div>
            </div>
          ))}
        </div>
      )}

      {/* Goal drafting workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                  Q3 Fiscal Objectives Matrix
                </div>
                <h3 className="text-base font-bold mt-0.5">Primary Key Performance Indicators</h3>
              </div>
              {!locked && sheet?.status !== "Approved" && (
                <Link
                  to="/goals/new"
                  className="btn-ghost py-1.5 px-3 text-xs flex items-center gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Draft Custom Goal
                </Link>
              )}
            </div>

            <div className="divide-y divide-white/5">
              {goals.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground font-mono-metric">
                  No primary custom goals drafted. Select 'Draft Custom Goal' above to get started.
                </div>
              ) : (
                goals.map((g) => (
                  <div key={g.id} className="p-5 space-y-4 hover:bg-white/1 transition-all group">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-indigo-300 font-mono-metric bg-indigo-500/10 px-2 py-0.5 rounded border border-indigo-500/20">
                            {g.thrustArea}
                          </span>
                          <span className="text-[10px] uppercase tracking-wider text-emerald-300 font-mono-metric bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Weight: {g.weightage}%
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white/95 mt-1.5 leading-snug group-hover:text-indigo-200 transition-colors">
                          {g.title}
                        </h4>
                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-xl">
                          {g.description || "No operational description provided."}
                        </p>
                      </div>
                      {!locked && sheet?.status !== "Approved" && (
                        <a
                          href={`/goals/${g.id}`}
                          className="text-xs text-indigo-300 hover:text-indigo-200 hover:underline shrink-0"
                        >
                          Modify Draft
                        </a>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Target
                        </span>
                        <div className="text-xs font-bold font-mono-metric text-indigo-200">
                          {g.target} ({g.uom})
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Achieved
                        </span>
                        <div className="text-xs font-bold font-mono-metric text-emerald-300">
                          {g.achieved} ({g.uom})
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Completion Score
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono-metric text-indigo-200">
                            {g.progress.toFixed(1)}%
                          </span>
                          <div className="w-24">
                            <ProgressBar
                              value={g.progress}
                              tone={g.progress >= 80 ? "emerald" : "indigo"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>

          {/* Department Shared KPIs Console */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">
                Broadcaster Pushed OKRs
              </div>
              <h3 className="text-base font-bold mt-0.5">Corporate & Departmental Shared Goals</h3>
            </div>

            <div className="divide-y divide-white/5">
              {sharedGoals.length === 0 ? (
                <div className="p-10 text-center text-xs text-muted-foreground font-mono-metric">
                  No pushed corporate OKRs active for this cycle.
                </div>
              ) : (
                sharedGoals.map((g) => (
                  <div key={g.id} className="p-5 space-y-4 hover:bg-white/1 transition-all">
                    <div className="flex items-start justify-between gap-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] uppercase tracking-wider text-emerald-400 font-mono-metric bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            {g.thrustArea}
                          </span>
                          <span className="text-[9px] uppercase tracking-wider text-indigo-300 font-mono-metric bg-indigo-500/5 px-2 py-0.5 rounded border border-indigo-500/10">
                            Shared OKR Node
                          </span>
                        </div>
                        <h4 className="text-sm font-semibold text-white/95 mt-1.5 leading-snug">
                          {g.title}
                        </h4>
                      </div>

                      {/* Interactive Weight Slider for Shared Goal */}
                      {!locked && sheet?.status !== "Approved" && (
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-xs text-indigo-300 font-mono-metric">
                            Weight: {g.weightage}%
                          </span>
                          <input
                            type="range"
                            min="5"
                            max="40"
                            step="5"
                            value={g.weightage}
                            onChange={(e) => handleWeightageChange(g.id!, parseInt(e.target.value))}
                            className="w-24 accent-indigo-500 bg-slate-950 border border-white/10 rounded-lg cursor-pointer h-1.5"
                          />
                        </div>
                      )}

                      {(locked || sheet?.status === "Approved") && (
                        <span className="text-xs text-indigo-300 font-mono-metric">
                          Weight: {g.weightage}%
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 border-t border-white/5">
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Target OKR Metric
                        </span>
                        <div className="text-xs font-bold font-mono-metric text-indigo-200">
                          {g.target} ({g.uom})
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Observed
                        </span>
                        <div className="text-xs font-bold font-mono-metric text-emerald-300">
                          {g.achieved} ({g.uom})
                        </div>
                      </div>
                      <div className="space-y-1">
                        <span className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                          Completion Score
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold font-mono-metric text-indigo-200">
                            {g.progress.toFixed(1)}%
                          </span>
                          <div className="w-24">
                            <ProgressBar
                              value={g.progress}
                              tone={g.progress >= 80 ? "emerald" : "indigo"}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Side panels */}
        <div className="space-y-6">
          {/* Quick Check-in Module */}
          {locked && sheet?.status !== "Approved" && (
            <GlassCard className="p-5 space-y-4">
              <div>
                <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                  Active check-in controller
                </div>
                <h3 className="text-base font-bold mt-0.5">Register Goal Progress</h3>
              </div>

              {goals.length === 0 ? (
                <div className="text-xs text-muted-foreground font-mono-metric">
                  No active goals to update check-ins.
                </div>
              ) : (
                <form onSubmit={handleCheckinSubmit} className="space-y-3.5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                      Target Objective
                    </label>
                    <select
                      value={selectedGoalId}
                      onChange={(e) => setSelectedGoalId(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                    >
                      {goals.map((g) => (
                        <option key={g.id} value={g.id}>
                          {g.title.substring(0, 30)}...
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                        Observed Achieved
                      </label>
                      <input
                        type="number"
                        step="any"
                        required
                        placeholder="e.g. 85.5"
                        value={achievementVal}
                        onChange={(e) => setAchievementVal(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono-metric"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                        Trajectory State
                      </label>
                      <select
                        value={checkinStatus}
                        onChange={(e) => setCheckinStatus(e.target.value)}
                        className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                      >
                        <option value="On Track">On Track</option>
                        <option value="Awaiting Signoff">Awaiting Signoff</option>
                        <option value="At Risk">At Risk</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">
                      Remarks / Context
                    </label>
                    <textarea
                      rows={2}
                      placeholder="e.g. Cluster integration test completed successfully."
                      value={remarksVal}
                      onChange={(e) => setRemarksVal(e.target.value)}
                      className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                    />
                  </div>

                  {checkinMessage && (
                    <div
                      className={`p-2 rounded text-[10px] font-mono-metric ${
                        checkinMessage.startsWith("Error")
                          ? "bg-red-500/10 border border-red-500/20 text-red-300"
                          : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                      }`}
                    >
                      {checkinMessage}
                    </div>
                  )}

                  <button
                    type="submit"
                    disabled={submittingCheckin}
                    className="w-full btn-primary text-xs py-2 px-3 justify-center flex items-center gap-1.5"
                  >
                    {submittingCheckin ? (
                      <RefreshCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <TrendingUp className="h-4 w-4" />
                    )}
                    Commit Progress Update
                  </button>
                </form>
              )}
            </GlassCard>
          )}

          {/* Sparkline Completion Velocity */}
          <GlassCard className="p-5 flex flex-col justify-between">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">
                Weekly Velocity Trace
              </div>
              <h3 className="text-base font-bold mt-0.5">Completion Velocity Profile</h3>
              <p className="text-xs text-muted-foreground mt-0.5">
                Visual representation of organizational milestone achievement speed.
              </p>
            </div>
            <div className="py-4">
              <Sparkline values={velocityData} />
            </div>
          </GlassCard>

          {/* Activity timeline feed */}
          <GlassCard className="p-5">
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">
              Platform Transaction Logs
            </div>
            <h3 className="text-base font-bold mt-0.5 mb-4">Workspace Activity Feed</h3>

            <div className="space-y-4">
              {activities.length === 0 ? (
                <div className="text-xs text-muted-foreground font-mono-metric py-2 text-center">
                  No transaction logs recorded yet.
                </div>
              ) : (
                activities.map((act) => (
                  <div key={act.id} className="flex gap-3 text-xs leading-relaxed group">
                    <div className="h-2 w-2 rounded-full bg-indigo-500 shrink-0 mt-1.5 shadow-[0_0_8px_rgba(99,102,241,0.5)] group-hover:scale-125 transition-transform" />
                    <div className="flex-1 space-y-0.5">
                      <div className="text-white/80">{act.text}</div>
                      <div className="text-[10px] text-muted-foreground font-mono-metric">
                        {act.time}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
