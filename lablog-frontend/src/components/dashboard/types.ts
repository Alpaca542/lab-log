import type { LabValueRow } from "../Compare";

export interface DashboardRow extends LabValueRow {
  created_at?: string;
  numeric?: number | null;
  test_date?: string;
  ai_inferred_range?: boolean; // propagated from ingestion
}

export interface ScheduleItem {
  test_name: string;
  category: string;
  reason: "Out of normal range" | "Bad trend" | "Manual";
  status: "pending" | "done";
  id?: number;
  doctor?: string;
}

export interface TrendInfo {
  arrow: string;
  color: string;
  title: string;
}

export interface RangeParsed {
  low: number;
  high: number;
  alwaysGreen: boolean;
}

export type Severity = "in" | "slight" | "far";
