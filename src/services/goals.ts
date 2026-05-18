import { apiRequest } from "./api";

export interface Goal {
  id?: string;
  sheetId?: string;
  title: string;
  thrustArea: string;
  uom: string;
  target: number;
  achieved: number;
  progress: number;
  weightage: number;
  description?: string;
  status: string;
  isShared?: boolean;
  sharedGoalId?: string;
}

export interface GoalSheet {
  id: string;
  employeeId: string;
  cycleId: string;
  lockStatus: "unlocked" | "locked" | "rework";
  totalWeightage: number;
  status: "Draft" | "Pending Review" | "Approved" | "Rework";
  remarks?: string;
  reworkReason?: string;
  approvedBy?: string;
  approvedAt?: string;
}

export interface GoalSheetResponse {
  sheet: GoalSheet | null;
  goals: Goal[];
}

export async function getMyGoals(cycleId = "q3_2026"): Promise<GoalSheetResponse> {
  return apiRequest<GoalSheetResponse>(`/api/goals/my?cycle_id=${cycleId}`);
}

export async function getGoalSheetDetails(sheetId: string): Promise<GoalSheetResponse> {
  return apiRequest<GoalSheetResponse>(`/api/goals/${sheetId}`);
}

export async function saveGoalDraft(data: {
  cycle_id: string;
  goal_id?: string;
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  target: number;
  weightage: number;
  goal_description?: string;
  is_shared?: boolean;
  shared_goal_id?: string | null;
}): Promise<{ success: boolean; goal_id: string }> {
  return apiRequest<{ success: boolean; goal_id: string }>("/api/goals/draft", "POST", data);
}

export async function submitGoalSheet(sheetId: string, cycleId = "q3_2026"): Promise<{ success: boolean; sheet_id: string }> {
  return apiRequest<{ success: boolean; sheet_id: string }>(`/api/goals/${sheetId}/submit?cycle_id=${cycleId}`, "POST");
}

export async function pushSharedGoal(data: {
  employee_ids: string[];
  goal_title: string;
  thrust_area: string;
  uom_type: string;
  target: number;
  weightage: number;
  goal_description?: string;
  cycle_id?: string;
}): Promise<{ success: boolean; shared_goal_id: string }> {
  return apiRequest<{ success: boolean; shared_goal_id: string }>("/api/goals/shared", "POST", data);
}
