import { apiRequest } from "./api";

export interface Checkin {
  id: string;
  goalId: string;
  employeeId: string;
  employeeName?: string;
  achieved: number;
  progress: number;
  status: string;
  remarks?: string;
  evidenceLink?: string;
  ts: string;
  managerRemarks?: string;
  managerStatus?: string;
  reviewedBy?: string;
  reviewedAt?: string;
}

export async function submitCheckin(data: {
  goal_id: string;
  achieved: number;
  remarks?: string;
  status?: string;
  evidence_link?: string;
  override_window?: boolean;
}): Promise<{ success: boolean; checkin_id: string }> {
  return apiRequest<{ success: boolean; checkin_id: string }>("/api/checkins", "POST", data);
}

export async function getMyCheckins(): Promise<Checkin[]> {
  return apiRequest<Checkin[]>("/api/checkins/my");
}

export async function getTeamCheckins(): Promise<Checkin[]> {
  return apiRequest<Checkin[]>("/api/checkins/team");
}

export async function reviewCheckin(
  checkinId: string,
  remarksOrPayload:
    | string
    | { manager_remarks?: string; remarks?: string; manager_status?: string; status?: string },
  status = "Met Expectations",
): Promise<{ success: boolean }> {
  let finalRemarks = "";
  let finalStatus = status;

  if (typeof remarksOrPayload === "object") {
    finalRemarks = remarksOrPayload.manager_remarks || remarksOrPayload.remarks || "";
    finalStatus = remarksOrPayload.manager_status || remarksOrPayload.status || status;
  } else {
    finalRemarks = remarksOrPayload;
  }

  return apiRequest<{ success: boolean }>(`/api/checkins/${checkinId}/review`, "POST", {
    remarks: finalRemarks,
    status: finalStatus,
  });
}
