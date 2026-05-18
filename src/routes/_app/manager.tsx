import { createFileRoute } from "@tanstack/react-router";
import { useState, useEffect } from "react";
import { GlassCard, MetricTile, StatusChip, ProgressBar } from "../../components/goalsync/Primitives";
import { ChevronDown, Filter, Search, CheckCircle2, XCircle, Send, Users, Clock, RefreshCw, AlertCircle } from "lucide-react";
import { requireRole } from "@/lib/auth/route-guards";
import { getTeamMembers, getTeamGoalSheets, approveSheet, rejectSheet } from "@/services/manager";
import { getTeamCheckins, reviewCheckin } from "@/services/checkins";
import { pushSharedGoal } from "@/services/goals";
import { getFirebaseDb } from "@/lib/firebase/config";
import { collection, query, where, onSnapshot } from "firebase/firestore";

export const Route = createFileRoute("/_app/manager")({
  beforeLoad: async () => {
    await requireRole("manager");
  },
  head: () => ({
    meta: [
      { title: "Team Governance — GoalSync" },
      { name: "description", content: "Manager governance console for team performance and inline goal sheet overrides." },
    ],
  }),
  component: ManagerPage,
});

function ManagerPage() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Team state
  const [teamState, setTeamState] = useState<any[]>([]);

  // Pending goal sheets approvals state
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  // Team Check-ins
  const [teamCheckins, setTeamCheckins] = useState<any[]>([]);

  // Online/Offline handling
  const [isOnline, setIsOnline] = useState(typeof window !== "undefined" ? window.navigator.onLine : true);

  // Shared Goals list
  const [sharedGoals, setSharedGoals] = useState<any[]>([
    { id: "sg1", title: "Federalized AI Observability Cluster Integration", thrustArea: "Infrastructure System Reliability", weight: "15%", activeNodes: 6 },
    { id: "sg2", title: "Global Latency Reduction Metrics under 20ms", thrustArea: "Operational Efficiency Optimization", weight: "10%", activeNodes: 6 }
  ]);

  const [managerActivities, setManagerActivities] = useState<any[]>([
    { id: 1, type: "governance", text: "Team metrics active on Google Cloud Firestore", time: "Just now" }
  ]);

  // Shared goal push form
  const [newSharedTitle, setNewSharedTitle] = useState("");
  const [newSharedThrust, setNewSharedThrust] = useState("Infrastructure System Reliability");
  const [newSharedWeight, setNewSharedWeight] = useState("10");
  const [pushMessage, setPushMessage] = useState("");
  const [pushingGoal, setPushingGoal] = useState(false);

  // Approval feedback states
  const [reworkFeedbackId, setReworkFeedbackId] = useState<string | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [approvalMessage, setApprovalMessage] = useState("");
  const [processingApproval, setProcessingApproval] = useState(false);

  // Supervisor review state
  const [selectedCheckinId, setSelectedCheckinId] = useState("");
  const [structuredFeedback, setStructuredFeedback] = useState("");
  const [reviewStatus, setReviewStatus] = useState("On Track");
  const [reviewMessage, setReviewMessage] = useState("");
  const [submittingReview, setSubmittingReview] = useState(false);

  // Online/Offline connection state handlers
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

    // 1. Fetch direct reports profiles once via API
    let rawMembers: any[] = [];
    const loadReports = async () => {
      try {
        rawMembers = await getTeamMembers();
      } catch (err: any) {
        setError(`Failed to fetch squad profiles: ${err.message}`);
      }
    };
    loadReports();

    // 2. Subscribe to Team Sheets (Real-Time)
    const qSheets = query(
      collection(db, "goal_sheets"),
      where("cycleId", "==", "q3_2026")
    );
    const unsubscribeSheets = onSnapshot(qSheets, (snapshot) => {
      const sheets = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as any));
      setPendingApprovals(sheets);

      // Enhance direct reports dynamically with real-time sheet statuses!
      if (rawMembers.length > 0) {
        const enhancedMembers = rawMembers.map((member, idx) => {
          const sheet = sheets.find(s => s.employeeId === member.uid);
          return {
            ...member,
            uid: member.uid || `m-${idx}`,
            goals: 3,
            progress: sheet?.status === "Approved" ? 100 : 75,
            state: sheet ? (sheet.status === "Approved" ? "approved" : sheet.status === "Rework" ? "action" : "pending") : "active"
          };
        });
        setTeamState(enhancedMembers);
      }
      setLoading(false);
    }, (err) => {
      setError(`Real-time team sheets connection dropped: ${err.message}`);
    });

    // 3. Subscribe to Team Check-ins (Real-Time)
    const qCheckins = query(collection(db, "checkins"));
    const unsubscribeCheckins = onSnapshot(qCheckins, (snapshot) => {
      const allCheckins = snapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      setTeamCheckins(allCheckins);
      if (allCheckins.length > 0 && !selectedCheckinId) {
        setSelectedCheckinId(allCheckins[0].id || "");
      }
    }, (err) => {
      setError(`Real-time team check-ins connection dropped: ${err.message}`);
    });

    return () => {
      unsubscribeSheets();
      unsubscribeCheckins();
    };
  }, []);

  // Supervisor Check-in review submission
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCheckinId) {
      setReviewMessage("Please select a check-in transaction.");
      return;
    }
    try {
      setSubmittingReview(true);
      setReviewMessage("");
      await reviewCheckin(selectedCheckinId, {
        manager_status: reviewStatus,
        manager_remarks: structuredFeedback
      });
      setReviewMessage("Supervisor evaluation successfully published!");
      setStructuredFeedback("");
      setTimeout(() => setReviewMessage(""), 4000);
    } catch (e: any) {
      setReviewMessage(`Review submission failed: ${e.message}`);
    } finally {
      setSubmittingReview(false);
    }
  };

  // Direct sheets quick-approving trigger
  const handleDirectApprove = async (sheetId: string) => {
    try {
      setProcessingApproval(true);
      setApprovalMessage("");
      await approveSheet(sheetId);
      setApprovalMessage("Goal Sheet successfully validated & locked.");
      setTimeout(() => setApprovalMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to validate goal sheet.");
    } finally {
      setProcessingApproval(false);
    }
  };

  // Submit rework rejection with commentaries
  const handleReworkSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reworkFeedbackId || !feedbackText.trim()) return;
    try {
      setProcessingApproval(true);
      setApprovalMessage("");
      await rejectSheet(reworkFeedbackId, feedbackText);
      setApprovalMessage("Rework request published, unlocking sheet.");
      setReworkFeedbackId(null);
      setFeedbackText("");
      setTimeout(() => setApprovalMessage(""), 4000);
    } catch (e: any) {
      setError(e.message || "Failed to send rework request.");
    } finally {
      setProcessingApproval(false);
    }
  };

  // Pushing shared KPI
  const handleSharedPush = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSharedTitle || !newSharedWeight) {
      setPushMessage("Fill in all parameters.");
      return;
    }
    const weightNum = parseFloat(newSharedWeight);
    if (isNaN(weightNum)) {
      setPushMessage("Weight must be a valid number.");
      return;
    }

    try {
      setPushingGoal(true);
      setPushMessage("");

      // Fetch squad IDs to push OKR to all direct reports
      const memberIds = teamState.map((m) => m.uid).filter(Boolean);
      await pushSharedGoal({
        employee_ids: memberIds,
        goal_title: newSharedTitle,
        thrust_area: newSharedThrust,
        uom_type: "percentage",
        target: 100,
        weightage: weightNum,
        cycle_id: "q3_2026"
      });

      // Update local shared goals optimistically
      const newGoal = {
        id: `sg-${Date.now()}`,
        title: newSharedTitle,
        thrustArea: newSharedThrust,
        weight: `${newSharedWeight}%`,
        activeNodes: memberIds.length
      };
      setSharedGoals((prev) => [...prev, newGoal]);

      setNewSharedTitle("");
      setPushMessage("Shared departmental KPI broadcasted successfully!");
      setTimeout(() => setPushMessage(""), 4000);
    } catch (e: any) {
      setPushMessage(`Broadcast failed: ${e.message}`);
    } finally {
      setPushingGoal(false);
    }
  };

  if (loading && teamState.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-4">
        <RefreshCw className="h-8 w-8 text-indigo-400 animate-spin" />
        <div className="text-sm font-mono-metric text-indigo-200">Syncing Team Governance Console...</div>
      </div>
    );
  }

  // Active counts mapping
  const pendingApprovalsCount = pendingApprovals.filter(s => s.status === "Pending Review" || s.status === "Pending Approval").length;
  const teamCheckinsCount = teamCheckins.filter(c => !c.managerRemarks).length;

  return (
    <div className="space-y-8">
      {error && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 text-red-300 rounded-lg text-xs font-semibold font-mono-metric flex items-center gap-2">
          <AlertCircle className="h-4 w-4" /> {error}
        </div>
      )}

      {!isOnline && (
        <div className="p-3 bg-amber-500/10 border border-amber-500/20 text-amber-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
          <AlertCircle className="h-4 w-4" /> You are operating in offline mode. Dashboard syncing will resume when online.
        </div>
      )}

      {approvalMessage && (
        <div className="p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs rounded-lg font-mono-metric flex items-center gap-1.5 animate-pulse">
          <CheckCircle2 className="h-4 w-4" /> {approvalMessage}
        </div>
      )}

      {/* Header */}
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Governance Console</div>
          <h1 className="text-2xl font-bold mt-1">Squad Operations Monitor</h1>
        </div>
      </div>

      {/* Metrics */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <MetricTile label="Active Reports" value={String(teamState.length || 6)} sub="Squad count" accent="indigo" />
        <MetricTile label="Pending Goal Sheets" value={String(pendingApprovalsCount)} sub="Awaiting validation" accent={pendingApprovalsCount > 0 ? "amber" : "emerald"} />
        <MetricTile label="Missed Check-ins" value={String(teamCheckinsCount)} sub="SLA alerts active" accent={teamCheckinsCount > 0 ? "crimson" : "emerald"} />
        <MetricTile label="Shared OKRs" value={String(sharedGoals.length)} sub="Pushed directives" accent="indigo" />
      </div>

      {/* Rework comments modal/drawer */}
      {reworkFeedbackId && (
        <GlassCard className="p-5 border border-rose-500/30 bg-rose-950/10 space-y-4 animate-in fade-in zoom-in-95 duration-200">
          <div>
            <div className="text-[10px] uppercase tracking-[0.22em] text-rose-400 font-mono-metric">Governance action</div>
            <h3 className="text-base font-bold mt-0.5 text-rose-300">Submit Rework Reason Commentaries</h3>
          </div>
          <form onSubmit={handleReworkSubmit} className="space-y-3">
            <textarea
              required
              rows={3}
              placeholder="e.g. Please readjust the weight of custom Goal 2 down to 10% to accommodate the shared AI gateway goal."
              value={feedbackText}
              onChange={(e) => setFeedbackText(e.target.value)}
              className="w-full bg-slate-950 border border-rose-500/20 text-white rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-rose-500 focus:outline-none"
            />
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setReworkFeedbackId(null)} className="btn-ghost text-xs py-1.5 px-3">Cancel</button>
              <button type="submit" disabled={processingApproval} className="btn-primary bg-rose-500 hover:bg-rose-600 text-xs py-1.5 px-3">Publish Rework Redirect</button>
            </div>
          </form>
        </GlassCard>
      )}

      {/* Main directories and workspaces */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* Direct reports performance list */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Squad Performance Directory</div>
              <h3 className="text-base font-bold mt-0.5">Active Direct Reports Performance</h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground font-mono-metric border-b border-white/5">
                    <th className="text-left px-5 py-3">Employee Name</th>
                    <th className="text-left px-5 py-3">Role Context</th>
                    <th className="text-center px-5 py-3">Goal Sheet State</th>
                    <th className="text-right px-5 py-3">Milestone Progress</th>
                  </tr>
                </thead>
                <tbody>
                  {teamState.map((member) => (
                    <tr key={member.uid} className="row-hover border-t border-white/5">
                      <td className="px-5 py-4 font-semibold text-white/95">{member.name}</td>
                      <td className="px-5 py-4 text-xs text-indigo-300">{member.role || "Software Engineer"}</td>
                      <td className="px-5 py-4 text-center">
                        <StatusChip tone={member.state === 'approved' ? 'emerald' : member.state === 'action' ? 'crimson' : 'amber'}>
                          {member.state === 'approved' ? 'Validated' : member.state === 'action' ? 'Rework' : 'Draft'}
                        </StatusChip>
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="flex items-center justify-end gap-2 text-xs font-mono-metric">
                          <span className="text-indigo-200">{member.progress}%</span>
                          <div className="w-20">
                            <ProgressBar value={member.progress} tone={member.progress >= 80 ? "emerald" : "indigo"} />
                          </div>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </GlassCard>

          {/* Pending sheets validation console */}
          <GlassCard className="overflow-hidden">
            <div className="px-5 py-4 border-b border-white/5">
              <div className="text-[10px] uppercase tracking-[0.22em] text-amber-300 font-mono-metric">Governance Validation Pool</div>
              <h3 className="text-base font-bold mt-0.5">Pending Sheets Review Pool</h3>
            </div>
            <div className="divide-y divide-white/5">
              {pendingApprovals.filter(s => s.status === "Pending Review" || s.status === "Pending Approval").length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground font-mono-metric">
                  ✓ Excellent: No pending goal sheet validations remaining. All direct reports sealed.
                </div>
              ) : (
                pendingApprovals.filter(s => s.status === "Pending Review" || s.status === "Pending Approval").map((s) => (
                  <div key={s.id} className="p-5 flex items-center justify-between gap-4 flex-wrap hover:bg-white/1 transition-all">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-white/95">{s.employeeName || "Direct Report"}</span>
                        <span className="text-[9px] uppercase tracking-wider text-amber-300 font-mono-metric bg-amber-500/10 px-1.5 py-0.5 rounded border border-amber-500/20">
                          {s.cycleId}
                        </span>
                      </div>
                      <div className="text-[10px] font-mono-metric text-indigo-300 mt-1">Total weight assigned: {s.totalWeightage || 100}%</div>
                    </div>
                    <div className="flex items-center gap-2">
                      <button 
                        disabled={processingApproval}
                        onClick={() => handleReworkSubmit({ preventDefault: () => {} } as any)}
                        className="btn-ghost border-rose-500/20 text-rose-400 hover:bg-rose-500/10 text-xs py-1.5 px-3"
                      >
                        <XCircle className="h-3.5 w-3.5" /> Return for Rework
                      </button>
                      <button 
                        disabled={processingApproval}
                        onClick={() => handleDirectApprove(s.id)}
                        className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" /> Approve Sheet
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </GlassCard>
        </div>

        {/* Side modules */}
        <div className="space-y-6">
          {/* Supervisor Check-in Review Module */}
          <GlassCard className="p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-indigo-300 font-mono-metric">Supervisor Check-in Review</div>
              <h3 className="text-base font-bold mt-0.5">Check-in Assessment Console</h3>
            </div>

            {teamCheckins.length === 0 ? (
              <div className="text-xs text-muted-foreground font-mono-metric py-2 text-center border border-dashed border-white/5 rounded-lg">
                No active employee check-ins to review.
              </div>
            ) : (
              <form onSubmit={handleReviewSubmit} className="space-y-3.5">
                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">Pending Check-in Node</label>
                  <select
                    value={selectedCheckinId}
                    onChange={(e) => setSelectedCheckinId(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    {teamCheckins.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.employeeName || "Employee"} · Progress {c.progress}%
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">Review Assessment Status</label>
                  <select
                    value={reviewStatus}
                    onChange={(e) => setReviewStatus(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2.5 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                  >
                    <option value="On Track">On Track</option>
                    <option value="Completed">Completed</option>
                    <option value="Awaiting Rework">Awaiting Rework</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">Evaluation remarks</label>
                  <textarea
                    rows={2}
                    required
                    placeholder="e.g. Performance metrics validated. Proceed with staging integrations."
                    value={structuredFeedback}
                    onChange={(e) => setStructuredFeedback(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none resize-none"
                  />
                </div>

                {reviewMessage && (
                  <div className={`p-2 rounded text-[10px] font-mono-metric ${
                    reviewMessage.startsWith("Review")
                      ? "bg-red-500/10 border border-red-500/20 text-red-300"
                      : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                  }`}>
                    {reviewMessage}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={submittingReview}
                  className="w-full btn-primary text-xs py-2 px-3 justify-center flex items-center gap-1.5"
                >
                  {submittingReview ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  Submit Supervisor Signature
                </button>
              </form>
            )}
          </GlassCard>

          {/* Departmental KPI Broadcasting Center */}
          <GlassCard className="p-5 space-y-4">
            <div>
              <div className="text-[10px] uppercase tracking-[0.22em] text-emerald-300 font-mono-metric">Shared Goal Broadcast</div>
              <h3 className="text-base font-bold mt-0.5">Bulk Broadcaster</h3>
              <p className="text-xs text-muted-foreground mt-0.5">Push a new objective and target metric instantly to all squad members' primary goal sheets.</p>
            </div>
            <form onSubmit={handleSharedPush} className="space-y-3">
              <div className="space-y-1">
                <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">OKR Goal Title</label>
                <input
                  required
                  placeholder="e.g. Integrate federated metrics tracking"
                  value={newSharedTitle}
                  onChange={(e) => setNewSharedTitle(e.target.value)}
                  className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none"
                />
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">Thrust Area</label>
                  <select
                    value={newSharedThrust}
                    onChange={(e) => setNewSharedThrust(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono-metric"
                  >
                    <option value="Infrastructure System Reliability">Reliability</option>
                    <option value="Operational Efficiency Optimization">Efficiency</option>
                    <option value="Compliance & Risk">Compliance</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[9px] uppercase tracking-wider text-muted-foreground font-mono-metric">Default Weight %</label>
                  <input
                    type="number"
                    required
                    placeholder="10"
                    value={newSharedWeight}
                    onChange={(e) => setNewSharedWeight(e.target.value)}
                    className="w-full bg-slate-950 border border-white/10 text-white rounded-lg p-2 text-xs focus:ring-1 focus:ring-indigo-500 focus:outline-none font-mono-metric"
                  />
                </div>
              </div>

              {pushMessage && (
                <div className={`p-2 rounded text-[10px] font-mono-metric ${
                  pushMessage.startsWith("Broadcast")
                    ? "bg-red-500/10 border border-red-500/20 text-red-300"
                    : "bg-emerald-500/10 border border-emerald-500/20 text-emerald-300"
                }`}>
                  {pushMessage}
                </div>
              )}

              <button
                type="submit"
                disabled={pushingGoal}
                className="w-full btn-ghost text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/10 text-xs py-2 px-3 justify-center flex items-center gap-1.5"
              >
                {pushingGoal ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                Push Shared Goal to Team
              </button>
            </form>
          </GlassCard>
        </div>
      </div>
    </div>
  );
}
