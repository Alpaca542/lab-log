import getDataGradient from "../../utils/GrowthPredictor";
import type { DashboardRow, TrendInfo } from "./types";

export function parseRange(range?: string) {
  if (!range || range === "NO_RANGE") return null;
  // Strip trailing * (AI-inferred range marker) if present
  const cleaned = range.endsWith('*') ? range.slice(0, -1) : range;
  const m = cleaned.match(/\s*([+-]?\d*\.?\d+)\s*<\s*x\s*<\s*([+-]?\d*\.?\d+)/i);
  if (!m) return { low: -1, high: -1, alwaysGreen: true };
  const low = parseFloat(m[1]);
  const high = parseFloat(m[2]);
  if (!isFinite(low) || !isFinite(high)) return null;
  return { low, high, alwaysGreen: false };
}

export function rangeSeverity(valStr: string, range?: string): "in" | "slight" | "far" {
  const r = parseRange(range);
  if (!r || r.alwaysGreen) return "in";
  const v = parseFloat(valStr);
  if (!isFinite(v)) return "in";
  if (v > r.low && v < r.high) return "in";
  const span = r.high - r.low || 1;
  let distRatio = 0;
  if (v <= r.low) distRatio = (r.low - v) / span; else if (v >= r.high) distRatio = (v - r.high) / span;
  return distRatio <= 0.25 ? "slight" : "far";
}

export function isSteepTrend(rows: DashboardRow[], testName: string): boolean {
  const points = rows
    .filter(r => r.test_name === testName)
    .map(l => ({ v: parseFloat(l.value), d: new Date(l.test_date || l.dateAdded || l.created_at || 0).getTime() }))
    .filter(p => isFinite(p.v) && p.d > 0)
    .sort((a,b)=>a.d-b.d);
  if (points.length < 3) return false;
  const Y = points.map(p=>p.v); const X = points.map((_,i)=>i);
  const { w } = getDataGradient(X,Y);
  const change = w * (points.length - 1);
  const minY = Math.min(...Y); const maxY = Math.max(...Y); const range = maxY - minY || 1;
  return Math.abs(change) > range * 0.5;
}

export function arrowForChange(change: number, range: number, thresh: number, title: string): TrendInfo {
  let arrow = "→"; let color = "#64748b";
  if (!(range === 0 || Math.abs(change) < thresh)) {
    if (change > 0) { arrow = "↑"; color = "#16a34a"; }
    else { arrow = "↓"; color = "#dc2626"; }
  }
  return { arrow, color, title };
}

export function computeTrendAll(allRows: DashboardRow[], testName: string): TrendInfo | undefined {
  const points = allRows
    .filter(r => r.test_name === testName)
    .map(l => ({ v: parseFloat(l.value), d: new Date(l.test_date || l.dateAdded || l.created_at || 0).getTime() }))
    .filter(p => isFinite(p.v) && p.d > 0)
    .sort((a,b)=>a.d-b.d);
  if (points.length < 2) return undefined;
  const Y = points.map(p=>p.v); const X = points.map((_,i)=>i);
  const { w } = getDataGradient(X,Y); const change = w * (points.length - 1);
  const minY = Math.min(...Y); const maxY = Math.max(...Y); const range = maxY - minY; const thresh = Math.max(range * 0.1, Math.abs(maxY) * 0.001, 1e-6);
  return arrowForChange(change, range, thresh, `Trend across all (${points.length}) values: change=${change.toFixed(4)}`);
}

export function computeTrendLast2(allRows: DashboardRow[], testName: string): TrendInfo | undefined {
  const pts = allRows
    .filter(r => r.test_name === testName)
    .map(l => ({ v: parseFloat(l.value), d: new Date(l.test_date || l.dateAdded || l.created_at || 0).getTime() }))
    .filter(p => isFinite(p.v) && p.d > 0)
    .sort((a,b)=>a.d-b.d);
  if (pts.length < 2) return undefined;
  const last2 = pts.slice(-2); const change = last2[1].v - last2[0].v;
  const minY = Math.min(last2[0].v,last2[1].v); const maxY = Math.max(last2[0].v,last2[1].v); const range = maxY - minY; const thresh = Math.max(range * 0.1, Math.abs(maxY) * 0.001, 1e-6);
  return arrowForChange(change, range, thresh, `Change last 2: Δ=${change.toFixed(4)}`);
}

export function formatValue(raw: string): string {
  const num = parseFloat(raw); if (!isFinite(num)) return raw;
  const fixed = num.toFixed(4);
  return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

export function colorForIndex(i: number) {
  const palette = ["#2563eb","#dc2626","#16a34a","#9333ea","#d97706","#0891b2","#be185d"]; return palette[i % palette.length];
}