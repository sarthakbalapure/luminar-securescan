import type { ReportData } from "./report-data-builder";

export function exportReportJson(data: ReportData) {
  return JSON.stringify(data, null, 2);
}
