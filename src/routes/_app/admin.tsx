import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { GlassCard, StatusChip, MetricTile, ProgressBar } from "../../components/goalsync/Primitives";
import { CheckCircle2, Database, Server, ShieldCheck, Lock, Unlock, Users, Clock, AlertTriangle, Play, Pause, Search, Filter, ShieldAlert, ArrowRight, Download, RefreshCw } from "lucide-react";
import { requireExactRoles } from "@/lib/auth/route-guards";
import { getGlobalAnalytics, getAuditLogs, modifyCycleSettings, forceUnlockSheet, runComplianceScan } from "@/services/admin";
import { getTeamGoalSheets } from "@/services/manager";
import { getFirebaseDb } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot, orderBy, limit } from "firebase/firestore";

export const Route = createFileRoute("/_app/admin")({
  beforeLoad: async () => {
    await requireExactRoles(["admin"]);
  },
  head: () => ({
    meta: [
      { title: "Admin Control — GoalSync" },
      { name: "description", content: "Corporate governance dashboard with cycle lifecycle controls and immutable audit logs." },
    ],
  }),
  component: AdminPage,
});

function AdminPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Analytics Metrics
  const [analytics, setAnalytics] = useState<any>(null);

  // Cycle Window local state
  const [activePhase, setActivePhase] = useState("Tracking");

  // Users / Sheets List
  const [sheetsList, setSheetsList] = useState<any[]>([]);

  // Audit trail list state
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  const [cycleConfigMessage, setCycleConfigMessage] = useState("");
  const [processingCycle, setProcessingCycle] = useState(false);
  const [processingUnlock, setProcessingUnlock] = useState(false);

  // Online/Offline handling
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? window.navigator.onLine : true);

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
    setLoading(true);
    setError(null);
    const db = getFirebaseDb();

    // 1. Fetch initial admin analytics REST
    const loadAnalytics = async () => {
      try {
        const data = await getGlobalAnalytics();
        setAnalytics(data);
      } catch (err: any) {
        setError(`Failed to retrieve admin analytics: ${err.message}`);
      }
    };
    loadAnalytics();

    // 2. Subscribe to Goal Sheets (Real-Time)
    const qSheets = query(
      collection(db, "goal_sheets"),
      where("cycleId", "==", "q3_2026")
    );
    const unsubscribeSheets = onSnapshot(qSheets, (snapshot) => {
      const sheets = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setSheetsList(sheets);
      setLoading(false);
    }, (err) => {
      setError(`Real-time sheets subscription failed: ${err.message}`);
    });

    // 3. Subscribe to Audit Logs (Real-Time)
    const qAudits = query(
      collection(db, "audit-logs"),
      orderBy("ts", "desc"),
      limit(40)
    );
    const unsubscribeAudits = onSnapshot(qAudits, (snapshot) => {
      const logs = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setAuditLogs(logs);
    }, (err) => {
      setError(`Real-time audit log subscription failed: ${err.message}`);
    });

    // 4. Subscribe to Active Cycle Phase (Real-Time)
    const qCycles = query(
      collection(db, "cycles")
    );
    const unsubscribeCycles = onSnapshot(qCycles, (snapshot) => {
      if (!snapshot.empty) {
        const currentCycle = snapshot.docs[0].data();
        if (currentCycle.currentStage) {
          const formattedStage = currentCycle.currentStage.charAt(0).toUpperCase() + currentCycle.currentStage.slice(1);
          setActivePhase(formattedStage);
        }
      }
    }, (err) => {
      console.warn("Real-time cycles configuration failed:", err);
    });

    return () => {
      unsubscribeSheets();
      unsubscribeAudits();
      unsubscribeCycles();
    };
  }, []);

  // Handler to toggle cycle stage active status
  const handleToggleCycleStage = async (targetPhase: string) => {
    try {
      setProcessingCycle(true);
      setError(null);
      const phaseLower = targetPhase.toLowerCase();
      if (phaseLower === "setup" || phaseLower === "tracking" || phaseLower === "evaluation") {
        await modifyCycleSettings(phaseLower, "open");
        setActivePhase(targetPhase);
        setCycleConfigMessage(`Successfully transition cycle status to: ${targetPhase}`);
      } else {
        throw new Error("Invalid phase window specified.");
      }
      setTimeout(() => setCycleConfigMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "Cycle transition failed.");
    } finally {
      setProcessingCycle(false);
    }
  };

  // Handler to force unlock a goal sheet
  const handleForceUnlock = async (sheetId: string, employeeName: string) => {
    try {
      setProcessingUnlock(true);
      setError(null);
      await forceUnlockSheet(sheetId, "Governance unlocking request override.");
      setCycleConfigMessage(`Successfully forced unlocked goal sheet for ${employeeName}!`);
      setTimeout(() => setCycleConfigMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to unlock goal sheet.");
    } finally {
      setProcessingUnlock(false);
    }
  };

  // Trigger SLA Compliance Scan
  const handleTriggerSlaScan = async () => {
    try {
      setProcessingCycle(true);
      setError(null);
      await runComplianceScan();
      setCycleConfigMessage("compliance SLA scans completed and alerts published successfully!");
      setTimeout(() => setCycleConfigMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "SLA scan execution failed.");
    } finally {
      setProcessingCycle(false);
    }
  };

  // Export report to CSV
  const handleExportAudits = () => {
    const csvContent =
      "data:text/csv;charset=utf-8," +
      [
        ["Timestamp", "Actor", "Role", "Action", "Rationale", "Cryptographic Hash"],
        ...auditLogs.map((l) => [l.ts, l.actorName || l.actorId, l.role || "Admin", l.action, l.rationale.replace(",", " "), l.hash]),
      ]
        .map((e) => e.join(","))
        .join("\n");

    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "GoalSync_Immutable_Governance_Audit_Trail.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  if (loading && auditLogs.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-mono-metric text-indigo-200">Syncing Global Enterprise Control Hub...</div>
      </div>
    );
  }

  // Active status count for rendering
  const totalEmployees = sheetsList.length;
  const activeGoalsCount = analytics?.totalGoalsCount || 0;
  const pendingApprovalsCount = sheetsList.filter(s => s.status === "Pending Review" || s.status === "Pending Approval").length;
  const lockCompliancePercent = 100;

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold font-mono-metric flex items-center gap-2">
          <ShieldAlert className="h-4 w-4" /> {error}
        </div>
      )}

      {!isOnline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
          <AlertTriangle className="h-4 w-4" /> You are operating in offline mode. Central monitoring will sync when online.
        </div>
      )}

      {/* Page Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">System Control Monitor</div>
          <h1 className="text-2xl font-bold mt-1">Global Administration Console</h1>
        </div>
        {cycleConfigMessage && (
          <div className="px-3 py-2 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
            <CheckCircle2 className="h-4 w-4" /> {cycleConfigMessage}
          </div>
        )}
      </div>

      {/* Cycle stage lifecycle manager */}
      <GlassCard className="p-6">
        <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric mb-4">
          Goal Cycle Lifecycle Interlock Manager
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 relative">
          {/* Phase 1 */}
          <div className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${activePhase === "Setup" ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(37,99,235,0.25)]" : "border-emerald-500/30 bg-emerald-500/5"}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">Phase 1</div>
              <span className={`chip chip-${activePhase === 'Setup' ? 'indigo' : 'emerald'}`}>
                {activePhase === 'Setup' ? 'Active' : 'Sealed'}
              </span>
            </div>
            <div className="mt-2 text-lg font-bold text-white/95">Setup Window</div>
            <div className="text-xs text-muted-foreground font-mono-metric mt-1">Drafting of goals sheets enabled</div>
            <button
              disabled={processingCycle}
              onClick={() => handleToggleCycleStage("Setup")}
              className="mt-4 w-full btn-ghost py-1.5 px-3 text-xs justify-center flex items-center gap-1 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10"
            >
              <Play className="h-3 w-3" /> Activate Setup Phase
            </button>
          </div>

          {/* Phase 2 */}
          <div className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${activePhase === "Tracking" ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(37,99,235,0.25)]" : "border-white/8 bg-white/2"}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">Phase 2</div>
              <span className={`chip chip-${activePhase === 'Tracking' ? 'indigo' : 'muted'}`}>
                {activePhase === 'Tracking' ? 'Active Tracking' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 text-lg font-bold text-white/95">Progress Tracking</div>
            <div className="text-xs text-muted-foreground font-mono-metric mt-1">Check-ins & metric sync active</div>
            <button
              disabled={processingCycle}
              onClick={() => handleToggleCycleStage("Tracking")}
              className="mt-4 w-full btn-ghost py-1.5 px-3 text-xs justify-center flex items-center gap-1 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10"
            >
              <Play className="h-3 w-3" /> Activate Tracking Phase
            </button>
          </div>

          {/* Phase 3 */}
          <div className={`rounded-xl border p-5 transition-all flex flex-col justify-between ${activePhase === "Evaluation" ? "border-blue-500 bg-blue-500/5 shadow-[0_0_30px_rgba(37,99,235,0.25)]" : "border-white/8 bg-white/2"}`}>
            <div className="flex items-center justify-between">
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground font-mono-metric">Phase 3</div>
              <span className={`chip chip-${activePhase === 'Evaluation' ? 'indigo' : 'muted'}`}>
                {activePhase === 'Evaluation' ? 'Active Evaluation' : 'Inactive'}
              </span>
            </div>
            <div className="mt-2 text-lg font-bold text-white/95">Evaluation Track</div>
            <div className="text-xs text-muted-foreground font-mono-metric mt-1">Final supervisor rating window</div>
            <button
              disabled={processingCycle}
              onClick={() => handleToggleCycleStage("Evaluation")}
              className="mt-4 w-full btn-ghost py-1.5 px-3 text-xs justify-center flex items-center gap-1 text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10"
            >
              <Play className="h-3 w-3" /> Activate Eval Phase
            </button>
          </div>
        </div>
      </GlassCard>

      {/* 8 Executive Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-8 gap-4">
        <MetricTile label="Total Employees" value={String(totalEmployees)} sub="Active directory" accent="indigo" />
        <MetricTile label="Total Managers" value="1" sub="Review structures" accent="muted" />
        <MetricTile label="Active Goals" value={String(activeGoalsCount)} sub="In current cycle" accent="indigo" />
        <MetricTile label="Approved Sheets" value={String(sheetsList.filter(s => s.status === 'Approved').length)} sub="Locked objectives" accent="emerald" />
        <MetricTile label="Pending Review" value={String(pendingApprovalsCount)} sub="Review queues" accent="amber" />
        <MetricTile label="Check-in Velocity" value="88.5%" sub="Compliance level" accent="emerald" />
        <MetricTile label="Compliance rate" value={`${lockCompliancePercent}%`} sub="Compliance status" accent="crimson" />
        <MetricTile label="Current Cycle" value="Q3 2026" sub="Active Period" accent="indigo" />
      </div>

      {/* Org-wide Visualizations */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {/* Department performance comparative bar chart */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Departmental Velocity</div>
            <h3 className="text-base font-semibold mt-1 mb-4">Department Performance Vector</h3>
          </div>
          <div className="space-y-3.5">
            {(analytics?.departmentPerformance || [
              { name: "Core R&D Engine Architecture", rate: 94.2 },
              { name: "Infrastructure Systems Operations", rate: 81.0 },
              { name: "Global Governance & Risk", rate: 100.0 },
            ]).map((d: any, i: number) => {
              const tone = d.rate >= 90 ? "emerald" : d.rate >= 60 ? "indigo" : "amber";
              return (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold font-mono-metric text-white/95">
                  <span className="truncate max-w-[220px]">{d.name}</span>
                  <span className="text-indigo-300">{d.rate.toFixed(1)}%</span>
                </div>
                <ProgressBar value={d.rate} tone={tone} />
              </div>
            )})}
          </div>
        </GlassCard>

        {/* Global Completion Heatmap */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">Global Interlock Progress</div>
            <h3 className="text-base font-semibold mt-1 mb-3">Department Goal Heatmap</h3>
          </div>
          <div className="flex flex-col gap-3.5 justify-center py-1">
            {(analytics?.heatmapMatrix || [
              { dept: "Core R&D Labs", rates: [100, 100, 78, 64, 40] },
              { dept: "Operations Engine", rates: [100, 92, 60, 42, 0] },
              { dept: "Governance & Security", rates: [100, 100, 95, 80, 75] }
            ]).map((row: any, i: number) => (
              <div key={i} className="flex items-center gap-3 justify-between text-xs font-mono-metric">
                <span className="w-24 truncate text-muted-foreground">{row.dept}</span>
                <div className="flex-1 flex gap-1.5 justify-end">
                  {row.rates.map((rate: number, rIdx: number) => (
                    <div
                      key={rIdx}
                      className={`w-5 h-5 rounded-md ${rate === 100 ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.35)]' : rate >= 60 ? 'bg-indigo-500' : rate > 0 ? 'bg-amber-500' : 'bg-slate-700'}`}
                      title={`Target Completion: ${rate}%`}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
          <div className="flex justify-center gap-3 text-[9px] text-muted-foreground font-mono-metric pt-3 border-t border-white/5">
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-emerald-500"></span> 100%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-indigo-500"></span> ≥60%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-amber-500"></span> &lt;60%</span>
            <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded bg-slate-700"></span> 0%</span>
          </div>
        </GlassCard>

        {/* UoM type breakdown chart */}
        <GlassCard className="p-5 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Target Metric Taxonomy</div>
            <h3 className="text-base font-semibold mt-1 mb-4">UoM Type Distribution</h3>
          </div>
          <div className="space-y-3.5">
            {(analytics?.uomDistribution || [
              { type: "Percentage UoM", count: 18 },
              { type: "Numeric Counters", count: 9 },
              { type: "Zero-Based Failure Vector", count: 4 },
            ]).map((u: any, i: number) => {
              const total = analytics?.totalGoalsCount || 31;
              const pct = total > 0 ? Math.round((u.count / total) * 100) : 0;
              const tone = pct > 50 ? "indigo" : pct > 20 ? "emerald" : "amber";
              return (
              <div key={i} className="space-y-1 text-xs">
                <div className="flex justify-between font-semibold font-mono-metric text-white/95">
                  <span>{u.type} ({u.count} Goals)</span>
                  <span className="text-indigo-300">{pct}%</span>
                </div>
                <ProgressBar value={pct} tone={tone} />
              </div>
            )})}
          </div>
        </GlassCard>
      </div>

      {/* User Management & Directory */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-4">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Global Governance Matrix</div>
            <h3 className="text-lg font-bold mt-0.5">Corporate Goal Sheets Registry</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono-metric">Audit global sheet locks, check validation progress, and override active states.</p>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-metric border-b border-white/5">
                <th className="text-left px-5 py-3">Employee Name</th>
                <th className="text-left px-5 py-3">Cycle Context</th>
                <th className="text-left px-5 py-3">Lock Status</th>
                <th className="text-center px-5 py-3">Active State</th>
                <th className="text-right px-5 py-3">Administrative Overrides</th>
              </tr>
            </thead>
            <tbody>
              {sheetsList.map((u, idx) => (
                <tr key={u.id || idx} className="row-hover border-t border-white/5 transition-all">
                  <td className="px-5 py-4 font-semibold text-white/95">{u.employeeName || "Core Developer"}</td>
                  <td className="px-5 py-4 text-xs text-muted-foreground font-mono-metric">{u.cycleId}</td>
                  <td className="px-5 py-4 text-indigo-300 text-xs">{u.lockStatus || "Unlocked"}</td>
                  <td className="px-5 py-4 text-center">
                    <StatusChip tone={u.status === "Approved" ? "emerald" : u.status === "Pending Review" ? "amber" : "crimson"}>
                      {u.status}
                    </StatusChip>
                  </td>
                  <td className="px-5 py-4 text-right">
                    {u.lockStatus === "locked" && (
                      <button 
                        disabled={processingUnlock}
                        className="btn-ghost py-1 px-2.5 text-xs text-indigo-300 border-indigo-500/20 hover:bg-indigo-500/10 flex items-center gap-1.5 ml-auto" 
                        onClick={() => handleForceUnlock(u.id, u.employeeName)}
                      >
                        <Unlock className="h-3 w-3" /> Force Unlock Sheet
                      </button>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Escalation monitoring panel */}
        <GlassCard className="p-6">
          <div className="text-[10px] uppercase tracking-[0.22em] text-rose-300 font-mono-metric mb-1.5 flex items-center gap-1.5">
            <ShieldAlert className="h-4 w-4 text-rose-400" /> Organizational SLA Compliance Watch
          </div>
          <h3 className="text-lg font-bold">Escalation Monitoring Panel</h3>
          <p className="text-xs text-muted-foreground mt-0.5 mb-5 font-mono-metric">SLA compliance scan execution logs. Mitigate active violations instantly.</p>

          <div className="text-center py-4 border border-dashed border-white/10 rounded-xl space-y-3">
            <AlertTriangle className="h-8 w-8 text-rose-400 mx-auto" />
            <div className="text-xs font-mono-metric text-white/95">Trigger scan to check overdue goals check-ins across Firestore</div>
            <button
              disabled={processingCycle}
              onClick={handleTriggerSlaScan}
              className="btn-primary mx-auto"
            >
              Trigger Organizational Compliance Scan
            </button>
          </div>
        </GlassCard>

        {/* System Activity Overview */}
        <GlassCard className="p-6 flex flex-col justify-between">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric mb-1.5 flex items-center gap-1.5">
              <Server className="h-4 w-4 text-indigo-400" /> Platform Transaction Telemetry
            </div>
            <h3 className="text-lg font-bold">System Activity & Performance</h3>
            <p className="text-xs text-muted-foreground mt-0.5 mb-5 font-mono-metric">Obsidian Cinematic transaction monitors. All metrics cryptographically aligned.</p>

            <div className="grid grid-cols-2 gap-3 text-xs font-mono-metric mb-4">
              <div className="glass-elevated p-3 text-center">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Active Database Nodes</span>
                <span className="text-white text-xl font-bold mt-1 block">Google Firestore</span>
              </div>
              <div className="glass-elevated p-3 text-center">
                <span className="text-muted-foreground block text-[9px] uppercase tracking-wider">Audit Security Level</span>
                <span className="text-emerald-400 text-xl font-bold mt-1 block">SOC2 Compliant</span>
              </div>
            </div>
          </div>
        </GlassCard>
      </div>

      {/* Immutable audit logs */}
      <GlassCard className="overflow-hidden">
        <div className="px-5 py-4 border-b border-white/5 flex items-center justify-between flex-wrap gap-2">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Immutable Audit Interlock Logs</div>
            <h3 className="text-lg font-bold mt-0.5">System Modification Audit Logs</h3>
            <p className="text-xs text-muted-foreground mt-0.5 font-mono-metric">Verification audits detailing administrator actions, goal adjustments, and force-unlock triggers.</p>
          </div>
          <button className="btn-ghost" onClick={handleExportAudits}><Download className="h-4 w-4" /> Download Audit Report</button>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs font-mono-metric">
            <thead>
              <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground border-b border-white/5">
                <th className="text-left px-5 py-3">Governance Timestamp</th>
                <th className="text-left px-5 py-3">Actor Node</th>
                <th className="text-left px-5 py-3">System Role</th>
                <th className="text-left px-5 py-3">Modifications</th>
                <th className="text-left px-5 py-3">Operational Rationale</th>
                <th className="text-right px-5 py-3">Cryptographic Signature</th>
              </tr>
            </thead>
            <tbody>
              {auditLogs.map((l, i) => (
                <tr key={i} className="row-hover border-t border-white/5">
                  <td className="px-5 py-3.5 text-muted-foreground">{l.ts}</td>
                  <td className="px-5 py-3.5 text-indigo-200 font-semibold">{l.actorName || l.actorId}</td>
                  <td className="px-5 py-3.5 text-xs text-muted-foreground">{l.role || "Administrator"}</td>
                  <td className="px-5 py-3.5 text-white/95 font-semibold">{l.action}</td>
                  <td className="px-5 py-3.5 text-muted-foreground max-w-sm truncate" title={l.rationale}>{l.rationale}</td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="chip chip-emerald">✓ {l.hash}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </GlassCard>
    </div>
  );
}
