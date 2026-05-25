import { apiRequest } from "./api";

export interface CycleSettings {
  name: string;
  startDate: string;
  endDate: string;
  status: "open" | "closed";
  phase: "setup" | "tracking" | "evaluation";
}

export interface AuditLog {
  id: string;
  ts: string;
  actorId: string;
  actorName: string;
  role: string;
  action: string;
  rationale: string;
  oldValue?: string;
  newValue?: string;
  sheetId?: string;
  goalId?: string;
  hash: string;
}

export interface Escalation {
  id: string;
  employeeId: string;
  employeeName?: string;
  managerId: string;
  type: string;
  severity: "High" | "Medium" | "Low";
  delayDays: number;
  status: "Active" | "Resolved";
  triggerDate: string;
  resolvedAt?: string;
  notes?: string;
}

export interface AnalyticsSummary {
  totalGoalsCount: number;
  totalSheetsCount: number;
  statusBreakdown: { name: string; value: number }[];
  uomDistribution: { type: string; count: number }[];
  thrustDistribution: { area: string; count: number }[];
  departmentPerformance: { name: string; rate: number }[];
  heatmapMatrix: { dept: string; rates: number[] }[];
  qoqTrends: { quarter: string; completionRate: number }[];
  managerEffectiveness: { manager: string; rate: number }[];
}

export async function getCycleSettings(): Promise<CycleSettings> {
  return apiRequest<CycleSettings>("/api/cycles/current");
}

export async function modifyCycleSettings(
  phase: "setup" | "tracking" | "evaluation",
  status: "open" | "closed",
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>("/api/cycles", "POST", { phase, status });
}

export async function forceUnlockSheet(
  sheetId: string,
  rationale: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/goals/${sheetId}/unlock`, "POST", { rationale });
}

export async function getAuditLogs(): Promise<AuditLog[]> {
  return apiRequest<AuditLog[]>("/api/audit-logs");
}

export async function getActiveEscalations(): Promise<Escalation[]> {
  return apiRequest<Escalation[]>("/api/escalations");
}

export async function runComplianceScan(): Promise<{
  success: boolean;
  escalationsTriggered: number;
}> {
  return apiRequest<{ success: boolean; escalationsTriggered: number }>(
    "/api/escalations/run",
    "POST",
  );
}

export async function resolveEscalation(
  escalationId: string,
  notes: string,
): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/escalations/${escalationId}/resolve`, "POST", {
    notes,
  });
}

export async function getGlobalAnalytics(): Promise<AnalyticsSummary> {
  return apiRequest<AnalyticsSummary>("/api/analytics");
}
