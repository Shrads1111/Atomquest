import type { GoalNode } from "./goal-validation";

export const currentUser = {
  name: "Dr. Aria Chen",
  title: "Senior Principal AI Infrastructure Architect",
  department: "Core R&D Engine Architecture Labs",
  initials: "AC",
  cycle: "Q3 2026 — Phase 2: Progress Window",
  daysLeft: 14,
};

export const employeeGoals: (GoalNode & {
  approved: boolean;
  formula: string;
  unit: string;
  progress: number;
})[] = [
  {
    id: "g1",
    title: "Optimize and Deploy High-Availability Cross-Region Data Orchestration Topologies",
    thrustArea: "Infrastructure System Reliability",
    uom: "numeric",
    assignedWeightageFactor: 0.35,
    target: 100,
    achieved: 78.2,
    approved: true,
    formula: "Achievement ÷ Target (Higher is Better)",
    unit: "M Inference Calls",
    progress: 78.2,
  },
  {
    id: "g2",
    title: "Reduce Mean-Time-to-Recovery for Tier-1 Incident Vectors",
    thrustArea: "Operational Efficiency Optimization",
    uom: "timeline",
    assignedWeightageFactor: 0.2,
    target: 30,
    achieved: 22,
    approved: true,
    formula: "Inverse Timeline (Lower is Better)",
    unit: "Minutes MTTR",
    progress: 92.0,
  },
  {
    id: "g3",
    title: "Launch Multi-Tenant Inference Gateway with SLA Routing",
    thrustArea: "Product Scaling Frameworks",
    uom: "percentage",
    assignedWeightageFactor: 0.2,
    target: 100,
    achieved: 64,
    approved: true,
    formula: "% Rollout Completion",
    unit: "% Rollout",
    progress: 64,
  },
  {
    id: "g4",
    title: "Eliminate P0 Security Findings on Public Inference Endpoints",
    thrustArea: "Compliance & Risk",
    uom: "zero-based",
    assignedWeightageFactor: 0.1,
    target: 0,
    achieved: 0,
    approved: true,
    formula: "Zero-Based Failure Vector",
    unit: "P0 Findings",
    progress: 100,
  },
  {
    id: "g5",
    title: "Mentor and Promote 3 IC4→IC5 Engineers via Structured OKR Pairing",
    thrustArea: "People & Leadership",
    uom: "numeric",
    assignedWeightageFactor: 0.1,
    target: 3,
    achieved: 2,
    approved: true,
    formula: "Achievement ÷ Target",
    unit: "Engineers Promoted",
    progress: 66.7,
  },
  {
    id: "g6",
    title: "Publish Architectural RFC for Federated Vector Indexing",
    thrustArea: "Innovation & Research",
    uom: "percentage",
    assignedWeightageFactor: 0.05,
    target: 100,
    achieved: 40,
    approved: true,
    formula: "% Completion",
    unit: "% Draft",
    progress: 40,
  },
];

export const team = [
  {
    id: "u1",
    name: "Dr. Aria Chen",
    role: "Senior Principal AI Infrastructure Architect",
    initials: "AC",
    goals: 6,
    progress: 87.2,
    state: "approved" as const,
  },
  {
    id: "u2",
    name: "Liam Vance",
    role: "Associate DevOps Cloud Deployment Systems Engineer",
    initials: "LV",
    goals: 4,
    progress: 42.1,
    state: "action" as const,
  },
  {
    id: "u3",
    name: "Priya Raman",
    role: "Staff Platform Reliability Engineer",
    initials: "PR",
    goals: 5,
    progress: 71.8,
    state: "approved" as const,
  },
  {
    id: "u4",
    name: "Tomás Iglesias",
    role: "Principal Security Architect",
    initials: "TI",
    goals: 7,
    progress: 95.4,
    state: "approved" as const,
  },
  {
    id: "u5",
    name: "Mei Watanabe",
    role: "Senior Data Platform Engineer",
    initials: "MW",
    goals: 5,
    progress: 58.3,
    state: "pending" as const,
  },
  {
    id: "u6",
    name: "Jordan Ellis",
    role: "Staff Site Reliability Engineer",
    initials: "JE",
    goals: 6,
    progress: 81.0,
    state: "approved" as const,
  },
];

export const auditLogs = [
  {
    ts: "2026-05-16 11:04:12 UTC",
    actor: "Sys_Admin_Eva_Vance",
    action: "Forced Goal Sheet Unlock #88129",
    rationale: "Strategic alignment definitions shifted; manual reset under admin credentials.",
    hash: "8F3D2A99-SEC",
  },
  {
    ts: "2026-05-16 09:21:55 UTC",
    actor: "Cron_Daemon_Node",
    action: "Auto-Escalated Breach Metric State — Sheet #71204",
    rationale: "SLA breach threshold exceeded for 72h; escalated to L2 governance queue.",
    hash: "2C1A4F30-AUTO",
  },
  {
    ts: "2026-05-15 17:48:01 UTC",
    actor: "Director_Marcus_Vance",
    action: "Approved Weight Override — Sheet #71988",
    rationale: "Strategic re-weighting per Q2 OKR alignment review.",
    hash: "A19E55B2-OVR",
  },
  {
    ts: "2026-05-15 08:12:33 UTC",
    actor: "Sys_Admin_Eva_Vance",
    action: "Cycle Phase Transition — Phase 1 → Phase 2",
    rationale: "Scheduled lifecycle interlock; setup window sealed at midnight UTC.",
    hash: "44B7C0E1-LCY",
  },
];

export const trendSeries = [
  { week: "Wk 02", value: 12.4 },
  { week: "Wk 04", value: 34.1 },
  { week: "Wk 06", value: 58.9 },
  { week: "Wk 08", value: 78.2 },
];

export const radarSeries = [
  { axis: "Strategy Realization", value: 0.92 },
  { axis: "Delivery Velocity", value: 0.84 },
  { axis: "Cross-Dept Synergy", value: 0.71 },
  { axis: "Compliance Alignment", value: 0.96 },
  { axis: "Technical Capability", value: 0.88 },
];

export const checkinThread = [
  {
    author: "Director Marcus Vance",
    role: "VP Engineering",
    when: "2 days ago",
    color: "emerald" as const,
    text: "Infrastructure delivery metrics align with active Q3 strategic expectations. Proceed with load routing verification tests before the formal cycle lock validation closes.",
  },
  {
    author: "Dr. Aria Chen",
    role: "Sr. Principal Architect",
    when: "1 day ago",
    color: "indigo" as const,
    text: "Acknowledged. Cluster integration tests scheduled for tomorrow's window. Will append observability dashboards once routing telemetry is live.",
  },
];
