import { apiRequest } from "./api";

/**
 * Downloads the organization performance report in CSV or Excel format
 */
export async function downloadGoalsReport(format: "csv" | "excel"): Promise<Blob> {
  return apiRequest<Blob>(`/api/reports/achievement?format=${format}`);
}
