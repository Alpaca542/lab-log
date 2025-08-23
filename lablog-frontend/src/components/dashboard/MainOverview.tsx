import { PiWarningCircleLight, PiListChecksLight } from "react-icons/pi";
import type { DashboardRow, ScheduleItem } from "./types";
import SeverityPill from "./SeverityPill";
import { rangeSeverity, formatValue } from "./utils";

interface MainOverviewProps {
  data: DashboardRow[];
  categoryKeys: string[];
  schedule: ScheduleItem[];
  markScheduleComplete: (name: string) => void;
  addSchedule: (item: { test_name: string; category: string; reason: "manual" | "trend" | "out_of_range" }) => void;
  removeSchedule: (name: string) => void;
  scheduleLoading: boolean;
  scheduleError: string | null;
}

export default function MainOverview({ data, categoryKeys, schedule, markScheduleComplete, addSchedule, removeSchedule, scheduleLoading, scheduleError }: MainOverviewProps) {
  interface AggRow { test_name: string; category: string; value: string; unit: string; date: string; reference_range: string; severity: "slight" | "far"; }
  const latestByTest: Record<string, DashboardRow> = {};
  data.forEach(r => {
    const k = r.test_name; const t = new Date(r.test_date || r.dateAdded || r.created_at || 0).getTime();
    if (!latestByTest[k]) latestByTest[k] = r; else {
      const prev = new Date(latestByTest[k].test_date || latestByTest[k].dateAdded || latestByTest[k].created_at || 0).getTime();
      if (t > prev) latestByTest[k] = r;
    }
  });
  const outRows: AggRow[] = Object.values(latestByTest)
    .map(r => ({
      test_name: r.test_name,
      category: (r.category || "uncategorized").toLowerCase(),
      value: r.value,
      unit: r.unit,
      date: (r.test_date || r.dateAdded || r.created_at || "").slice(0,10),
      reference_range: r.reference_range || "",
      severity: rangeSeverity(r.value, r.reference_range) as any,
    }))
    .filter(r => r.severity !== "in")
    .sort((a,b)=>a.test_name.localeCompare(b.test_name));

  const scheduleByCat: Record<string, ScheduleItem[]> = {};
  schedule.forEach(s => { if (!scheduleByCat[s.category]) scheduleByCat[s.category] = []; scheduleByCat[s.category].push(s); });

  const [newName, setNewName] = useState("");
  const [newCat, setNewCat] = useState(categoryKeys[0] || "other");
  function submitNew(e: React.FormEvent) {
    e.preventDefault(); if (!newName.trim()) return;
    addSchedule({ test_name: newName.trim(), category: newCat, reason: "manual" });
    setNewName("");
  }

  return (
    <div className="text-sm text-gray-700 space-y-8">
      <section>
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
          <PiWarningCircleLight className="w-4 h-4 text-rose-600" /> Needs Attention
          <span className="text-[11px] font-normal text-gray-500">({outRows.length})</span>
        </h3>
        {outRows.length === 0 ? (
          <div className="text-xs italic text-gray-500">None out of range.</div>
        ) : (
          <div className="border rounded-lg bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
            <table className="w-full text-[12px] border-collapse">
              <thead>
                <tr className="bg-slate-50 text-slate-600">
                  <th className="text-left px-2 py-1 border-b">Test</th>
                  <th className="text-left px-2 py-1 border-b">Cat</th>
                  <th className="text-left px-2 py-1 border-b">Value</th>
                  <th className="text-left px-2 py-1 border-b">Range</th>
                  <th className="text-left px-2 py-1 border-b">Date</th>
                  <th className="text-left px-2 py-1 border-b">Severity</th>
                </tr>
              </thead>
              <tbody>
                {outRows.map((r,i)=>(
                  <tr key={i} className="hover:bg-blue-50/40 transition">
                    <td className="px-2 py-1 border-b font-medium">{r.test_name}</td>
                    <td className="px-2 py-1 border-b capitalize">{r.category}</td>
                    <td className="px-2 py-1 border-b">{formatValue(r.value)} {r.unit}</td>
                    <td className="px-2 py-1 border-b">{r.reference_range === "NO_RANGE" ? <span className="italic opacity-60">No range</span> : r.reference_range.replace("<x<","-")}</td>
                    <td className="px-2 py-1 border-b">{r.date}</td>
                    <td className="px-2 py-1 border-b"><SeverityPill severity={r.severity as any} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
      <section>
        <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
          <PiListChecksLight className="w-4 h-4 text-blue-600" /> Schedule
          <span className="text-[11px] font-normal text-gray-500">({schedule.length})</span>
        </h3>
        {scheduleLoading && <div className="text-[11px] text-gray-500 mb-2">Loading…</div>}
        {scheduleError && <div className="text-[11px] text-red-600 mb-2">{scheduleError}</div>}
        <form onSubmit={submitNew} className="flex flex-wrap items-end gap-2 mb-3 text-xs">
          <div className="flex flex-col">
            <label className="text-[11px] text-gray-600">Test Name</label>
            <input value={newName} onChange={e=>setNewName(e.target.value)} className="border rounded px-2 py-1 text-xs" placeholder="e.g. Creatinine" />
          </div>
            <div className="flex flex-col">
              <label className="text-[11px] text-gray-600">Category</label>
              <select value={newCat} onChange={e=>setNewCat(e.target.value)} className="border rounded px-2 py-1 text-xs capitalize">
                {categoryKeys.map(c=>(<option key={c} value={c} className="capitalize">{c}</option>))}
              </select>
            </div>
            <button type="submit" className="px-3 py-1 border rounded hover:bg-gray-100" disabled={!newName.trim()}>Add</button>
        </form>
        {schedule.length === 0 ? (
          <div className="text-xs italic text-gray-500">No tasks scheduled.</div>
        ) : (
          <div className="space-y-4">
            {Object.keys(scheduleByCat).sort().map(cat => (
              <div key={cat} className="border rounded bg-white shadow-sm p-3">
                <h4 className="font-semibold text-xs mb-2 capitalize flex items-center gap-2">{cat}<span className="text-[10px] font-normal text-gray-500">({scheduleByCat[cat].length} tasks)</span></h4>
                <ul className="space-y-1">
                  {scheduleByCat[cat].map((t,i)=>(
                    <li key={i} className="flex items-center gap-2 text-xs">
                      <button type="button" onClick={()=>markScheduleComplete(t.test_name)} className={`w-5 h-5 flex items-center justify-center rounded-full transition ${t.status==="done"?"text-emerald-600 hover:text-emerald-500":"text-slate-400 hover:text-blue-500"}`} title={t.status==="done"?"Mark pending":"Mark done"}>
                        {t.status === "done" ? "✓" : ""}
                      </button>
                      <span className={`${t.status === "done"?"line-through opacity-60":"font-medium"}`}>{t.test_name}</span>
                      <span className="text-[10px] uppercase tracking-wide rounded px-1 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">{t.reason}</span>
                      <button type="button" onClick={()=>removeSchedule(t.test_name)} className="ml-1 text-[10px] text-rose-500 hover:text-rose-700" title="Remove">✕</button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </section>
      {!data.length && <div className="text-xs text-gray-500">No results yet.</div>}
    </div>
  );
}

import { useState } from "react";