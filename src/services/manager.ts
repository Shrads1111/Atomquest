import { apiRequest } from "./api";
import { GoalSheet } from "./goals";

export interface TeamMember {
  uid: string;
  name: string;
  email: string;
  role: string;
  employeeId: string;
  department: string;
  managerId: string;
}

export async function getTeamMembers(): Promise<TeamMember[]> {
  return apiRequest<TeamMember[]>("/api/users/team");
}

export async function getTeamGoalSheets(cycleId = "q3_2026"): Promise<(GoalSheet & { employeeName: string })[]> {
  return apiRequest<(GoalSheet & { employeeName: string })[]>(`/api/goals/team?cycle_id=${cycleId}`);
}

export async function approveSheet(sheetId: string, remarks = "Approved"): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/goals/${sheetId}/approve`, "POST", { remarks });
}

export async function rejectSheet(sheetId: string, reworkReason: string): Promise<{ success: boolean }> {
  return apiRequest<{ success: boolean }>(`/api/goals/${sheetId}/reject`, "POST", { rework_reason: reworkReason });
}
