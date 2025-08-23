import { DiagramRenderer } from "./DiagramRenderer";
import { useMemo, useState, useEffect } from "react";
import {
    PiHeartbeatLight,
    PiClipboardTextLight,
    PiCheckCircleLight,
    PiCircleLight,
    PiTrashSimpleLight,
    PiWarningCircleLight,
    PiListChecksLight,
    PiFlaskLight,
} from "react-icons/pi";
import supabase from "../supabase";
import getDataGradient from "../utils/GrowthPredictor";
import type { LabValueRow } from "./Compare";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    Legend,
    CartesianGrid,
    ResponsiveContainer,
} from "recharts";

interface DashboardRow extends LabValueRow {
    created_at?: string;
    numeric?: number | null;
    test_date?: string;
}

interface DashboardProps {
    data: DashboardRow[];
    userId?: string;
}

function parseNumeric(v: string): number | null {
    const num = parseFloat((v || "").replace(/[^0-9.+-]/g, ""));
    return isFinite(num) ? num : null;
}

export default function Dashboard({ data, userId }: DashboardProps) {
    const categories = useMemo(() => {
        const map: Record<string, DashboardRow[]> = {};
        data.forEach((d) => {
            const cat = (d.category || "uncategorized").toLowerCase();
            let numeric = parseNumeric(d.value || "");
            const unitLower = (d.unit || "").toLowerCase();
            if (!d.unit || unitLower === "qualitative" || numeric == null) {
                numeric = null; // exclude from chart
            }
            if (!map[cat]) map[cat] = [];
            map[cat].push({ ...d, numeric } as DashboardRow);
        });
        Object.values(map).forEach((arr) =>
            arr.sort(
                (a, b) =>
                    new Date(
                        a.test_date || a.dateAdded || a.created_at || 0
                    ).getTime() -
                    new Date(
                        b.test_date || b.dateAdded || b.created_at || 0
                    ).getTime()
            )
        );
        return map;
    }, [data]);

    const categoryKeys = Object.keys(categories).sort();
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(
        {}
    );
    const [activeTab, setActiveTab] = useState<string>("main");

    // ---------------- Schedule & Severity Logic ----------------
    interface ScheduleItem {
        test_name: string;
        category: string;
        reason: "out_of_range" | "trend" | "manual";
        status: "pending" | "done";
    }
    const [schedule, setSchedule] = useState<ScheduleItem[]>([]);
    const [scheduleLoading, setScheduleLoading] = useState(false);
    const [scheduleError, setScheduleError] = useState<string | null>(null);
    const [scheduleLoaded, setScheduleLoaded] = useState(false);

    // Load schedule from Supabase
    useEffect(() => {
        const load = async () => {
            if (!userId) return;
            setScheduleLoading(true);
            setScheduleError(null);
            try {
                const { data: rows, error } = await supabase
                    .from("lab_schedule")
                    .select("id,test_name,category,reason,status")
                    .eq("user_id", userId)
                    .order("created_at", { ascending: false });
                if (error) throw error;
                const mapped = (rows || []).map((r: any) => ({
                    id: r.id,
                    test_name: r.test_name,
                    category: r.category,
                    reason: r.reason,
                    status: r.status,
                }));
                const seen: Record<string, boolean> = {};
                const dedup = mapped.filter((m: any) => {
                    const k = m.test_name.toLowerCase();
                    if (seen[k]) return false;
                    seen[k] = true;
                    return true;
                });
                setSchedule(dedup);
            } catch (e: any) {
                setScheduleError(e.message || "Failed loading schedule");
            } finally {
                setScheduleLoading(false);
                setScheduleLoaded(true);
            }
        };
        load();
    }, [userId]);

    const addSchedule = async (item: Omit<ScheduleItem, "status">) => {
        // avoid duplicates locally first
        const exists = schedule.some(
            (p) => p.test_name.toLowerCase() === item.test_name.toLowerCase()
        );
        if (exists || !userId) return;
        const newItem: ScheduleItem & { id?: number } = {
            ...item,
            status: "pending",
        };
        setSchedule((prev) => [newItem, ...prev]);
        try {
            const { error, data: inserted } = await supabase
                .from("lab_schedule")
                .insert({
                    user_id: userId,
                    test_name: item.test_name,
                    category: item.category,
                    reason: item.reason,
                    status: "pending",
                })
                .select("id");
            if (error) throw error;
            if (inserted && inserted[0]) {
                setSchedule((prev) =>
                    prev.map((p) =>
                        p === newItem ? { ...newItem, id: inserted[0].id } : p
                    )
                );
            }
        } catch (e) {
            // rollback on failure
            setSchedule((prev) => prev.filter((p) => p !== newItem));
        }
    };
    const markScheduleComplete = async (name: string) => {
        setSchedule((prev) =>
            prev.map((p) =>
                p.test_name.toLowerCase() === name.toLowerCase()
                    ? {
                          ...p,
                          status: p.status === "pending" ? "done" : "pending",
                      }
                    : p
            )
        );
        const target = schedule.find(
            (p) => p.test_name.toLowerCase() === name.toLowerCase()
        ) as any;
        if (!target || !userId) return;
        const newStatus = target.status === "pending" ? "done" : "pending";
        try {
            if (target.id) {
                await supabase
                    .from("lab_schedule")
                    .update({ status: newStatus })
                    .eq("id", target.id)
                    .eq("user_id", userId);
            }
        } catch (e) {
            // ignore; optimistic update
        }
    };
    const removeSchedule = async (name: string) => {
        const target = schedule.find(
            (p) => p.test_name.toLowerCase() === name.toLowerCase()
        ) as any;
        setSchedule((prev) =>
            prev.filter((p) => p.test_name.toLowerCase() !== name.toLowerCase())
        );
        try {
            if (target?.id && userId) {
                await supabase
                    .from("lab_schedule")
                    .delete()
                    .eq("id", target.id)
                    .eq("user_id", userId);
            }
        } catch (e) {
            // ignore
        }
    };

    // Determine severity of being outside range
    function rangeSeverity(
        valStr: string,
        range?: string
    ): "in" | "slight" | "far" {
        const r = parseRange(range);
        if (!r || r.alwaysGreen) return "in";
        const v = parseFloat(valStr);
        if (!isFinite(v)) return "in";
        if (v > r.low && v < r.high) return "in";
        const span = r.high - r.low || 1;
        let distRatio = 0;
        if (v <= r.low) distRatio = (r.low - v) / span;
        else if (v >= r.high) distRatio = (v - r.high) / span;
        // Assumptions: <= 0.25 of span => slight; otherwise far
        return distRatio <= 0.25 ? "slight" : "far";
    }

    // Steep trend detection (heuristic: regression change > 50% value range)
    function isSteepTrend(rows: DashboardRow[], testName: string): boolean {
        const points = rows
            .filter((r) => r.test_name === testName)
            .map((l) => ({
                v: parseFloat(l.value),
                d: new Date(
                    l.test_date || l.dateAdded || l.created_at || 0
                ).getTime(),
            }))
            .filter((p) => isFinite(p.v) && p.d > 0)
            .sort((a, b) => a.d - b.d);
        if (points.length < 3) return false;
        const Y = points.map((p) => p.v);
        const X = points.map((_, i) => i);
        const { w } = getDataGradient(X, Y);
        const change = w * (points.length - 1);
        const minY = Math.min(...Y);
        const maxY = Math.max(...Y);
        const range = maxY - minY || 1;
        return Math.abs(change) > range * 0.5; // heuristic
    }

    // Auto-populate schedule when data changes (after schedule load) using latest value per test in each category
    useEffect(() => {
        if (!scheduleLoaded) return;
        categoryKeys.forEach((cat) => {
            const rows = categories[cat];
            if (!rows) return;
            const latestByTest: Record<string, DashboardRow> = {};
            rows.forEach((r) => {
                const key = r.test_name;
                const dateNum = new Date(
                    r.test_date || r.dateAdded || r.created_at || 0
                ).getTime();
                if (!latestByTest[key]) latestByTest[key] = r;
                else {
                    const prevDate = new Date(
                        latestByTest[key].test_date ||
                            latestByTest[key].dateAdded ||
                            latestByTest[key].created_at ||
                            0
                    ).getTime();
                    if (dateNum > prevDate) latestByTest[key] = r;
                }
            });
            Object.values(latestByTest).forEach((r) => {
                const sev = rangeSeverity(r.value, r.reference_range);
                if (sev === "far") {
                    addSchedule({
                        test_name: r.test_name,
                        category: cat,
                        reason: "out_of_range",
                    });
                }
                if (isSteepTrend(rows, r.test_name)) {
                    addSchedule({
                        test_name: r.test_name,
                        category: cat,
                        reason: "trend",
                    });
                }
            });
        });
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [data, scheduleLoaded]);

    // Ensure active tab still valid
    if (activeTab !== "main" && !categories[activeTab]) {
        setActiveTab("main");
    }

    const renderCategory = (cat: string) => {
        const rows = categories[cat];
        if (!rows) return null;
        // Determine test range availability
        const testHasRange: Record<string, boolean> = {};
        rows.forEach((r) => {
            const rr = (r.reference_range || "").trim();
            if (!testHasRange[r.test_name]) {
                testHasRange[r.test_name] = !!rr && rr !== "NO_RANGE";
            } else if (!!rr && rr !== "NO_RANGE") {
                testHasRange[r.test_name] = true;
            }
        });
        const chartData = rows.map((r) => ({
            date: (r.test_date || r.dateAdded || r.created_at || "").slice(
                0,
                10
            ),
            [r.test_name]: r.numeric,
            test_name: r.test_name,
        }));
        const merged: Record<string, any> = {};
        chartData.forEach((pt) => {
            if (!merged[pt.date]) merged[pt.date] = { date: pt.date };
            merged[pt.date][pt.test_name] = pt[pt.test_name];
        });
        const mergedArr = Object.values(merged);
        const testNames = Array.from(
            new Set(rows.map((r) => r.test_name))
        ).slice(0, 6);
        const withEffectiveDate = rows.map((r) => ({
            ...r,
            _date: (r.test_date || r.dateAdded || r.created_at || "").slice(
                0,
                10
            ),
        }));
        const latestDate = withEffectiveDate.reduce(
            (acc, r) => (r._date && r._date > acc ? r._date : acc),
            ""
        );
        const latestRows = withEffectiveDate.filter(
            (r) => r._date === latestDate
        );
        const otherRows = withEffectiveDate.filter(
            (r) => r._date !== latestDate
        );
        const outOfRangeRows = withEffectiveDate.filter((r) => {
            const hasRange = parseRange(r.reference_range || "");
            if (!hasRange) return false;
            return rangeSeverity(r.value, r.reference_range) !== "in";
        });

        const nums: number[] = [];
        rows.forEach((r) => {
            if (r.numeric != null && isFinite(r.numeric)) nums.push(r.numeric);
        });
        let domain: [number, number] | undefined;
        if (nums.length) {
            let min = Math.min(...nums);
            let max = Math.max(...nums);
            if (min === max) {
                const base = min === 0 ? 1 : Math.abs(min) * 0.1;
                min = min - base;
                max = max + base;
            } else {
                const span = max - min;
                const pad = span * 0.05;
                min = min - pad;
                max = max + pad;
            }
            domain = [min, max];
        }

        return (
            <div className="flex flex-col gap-4" key={cat}>
                <div className="flex items-center justify-between">
                    <h3 className="mt-0 mb-0 capitalize font-semibold text-gray-800 text-lg">
                        {cat}{" "}
                        <span className="text-gray-500 text-sm font-normal">
                            ({rows.length})
                        </span>
                    </h3>
                </div>
                <div className="w-full h-[320px] border rounded bg-white p-2 shadow-sm">
                    <DiagramRenderer
                        testNames={testNames}
                        mergedArr={mergedArr}
                        domain={domain || "auto"}
                        testHasRange={testHasRange}
                        colorForIndex={colorForIndex}
                    />
                </div>
                <div className="text-[11px] text-gray-600">
                    Dashed line = no reference range available
                </div>
                <div>
                    <h4 className="text-sm font-semibold mb-2 flex items-center gap-2">
                        Needs Attention{" "}
                        <span className="text-xs font-normal text-gray-500">
                            (Out of Range)
                        </span>
                    </h4>
                    {outOfRangeRows.length === 0 ? (
                        <div className="text-xs text-gray-500 italic">
                            None currently out of range.
                        </div>
                    ) : (
                        <div className="border border-rose-300 bg-rose-50 rounded p-2">
                            <ul className="text-xs space-y-1">
                                {outOfRangeRows
                                    .slice()
                                    .sort((a, b) =>
                                        b._date.localeCompare(a._date)
                                    )
                                    .map((r, i) => (
                                        <li
                                            key={i}
                                            className="flex flex-wrap gap-1 items-center"
                                        >
                                            <SeverityPill
                                                severity={
                                                    rangeSeverity(
                                                        r.value,
                                                        r.reference_range
                                                    ) as any
                                                }
                                            />
                                            <span className="font-medium text-rose-700">
                                                {r.test_name}
                                            </span>
                                            <span>{formatValue(r.value)}</span>
                                            <span className="text-gray-500">
                                                {r.unit}
                                            </span>
                                            <span className="text-gray-400">
                                                @ {r._date}
                                            </span>
                                            <span className="text-gray-500">
                                                range{" "}
                                                {r.reference_range?.replace(
                                                    "<x<",
                                                    "-"
                                                )}
                                            </span>
                                        </li>
                                    ))}
                            </ul>
                        </div>
                    )}
                </div>
                <div className="mt-4">
                    <table className="w-full border-collapse text-[12px]">
                        <thead>
                            <tr>
                                <th className="text-left py-1 px-1 border-b border-gray-300">
                                    Date
                                </th>
                                <th className="text-left py-1 px-1 border-b border-gray-300">
                                    Test
                                </th>
                                <th className="text-left py-1 px-1 border-b border-gray-300">
                                    Value
                                </th>
                                <th
                                    className="text-left py-1 px-1 border-b border-gray-300"
                                    title="Trend last 2 measurements"
                                >
                                    Δ(2)
                                </th>
                                <th
                                    className="text-left py-1 px-1 border-b border-gray-300"
                                    title="Trend across all measurements"
                                >
                                    Trend
                                </th>
                                <th className="text-left py-1 px-1 border-b border-gray-300">
                                    Unit
                                </th>
                                <th className="text-left py-1 px-1 border-b border-gray-300">
                                    Ref Range
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {latestRows.map((r, i) => {
                                const trend2 = computeTrendLast2(
                                    rows,
                                    r.test_name
                                );
                                const trendAll = computeTrendAll(
                                    rows,
                                    r.test_name
                                );
                                const sev = rangeSeverity(
                                    r.value,
                                    r.reference_range
                                );
                                const rangeInfo = parseRange(r.reference_range);
                                return (
                                    <tr
                                        key={"latest-" + i}
                                        className="bg-slate-100"
                                    >
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {r._date}
                                        </td>
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {r.test_name}
                                        </td>
                                        <td
                                            className={`py-1 px-1 border-b border-gray-200 ${
                                                rangeInfo
                                                    ? sev === "in"
                                                        ? "bg-emerald-50 border-emerald-500"
                                                        : sev === "slight"
                                                        ? "bg-amber-50 border-amber-400"
                                                        : "bg-rose-50 border-rose-500"
                                                    : ""
                                            }`}
                                        >
                                            {formatValue(r.value)}
                                        </td>
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {trendCell(trend2)}
                                        </td>
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {trendCell(trendAll)}
                                        </td>
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {r.unit}
                                        </td>
                                        <td className="py-1 px-1 border-b border-gray-200">
                                            {!r.reference_range ||
                                            r.reference_range === "NO_RANGE" ? (
                                                <span className="italic opacity-60">
                                                    No range
                                                </span>
                                            ) : (
                                                r.reference_range.replace(
                                                    "<x<",
                                                    "-"
                                                )
                                            )}
                                        </td>
                                    </tr>
                                );
                            })}
                            {expandedCats[cat] &&
                                otherRows
                                    .slice()
                                    .sort((a, b) =>
                                        b._date.localeCompare(a._date)
                                    )
                                    .map((r, i) => {
                                        const trend2 = computeTrendLast2(
                                            rows,
                                            r.test_name
                                        );
                                        const trendAll = computeTrendAll(
                                            rows,
                                            r.test_name
                                        );
                                        const sev = rangeSeverity(
                                            r.value,
                                            r.reference_range
                                        );
                                        const rangeInfo = parseRange(
                                            r.reference_range
                                        );
                                        return (
                                            <tr
                                                key={"hist-" + i}
                                                className="hover:bg-slate-50"
                                            >
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {r._date}
                                                </td>
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {r.test_name}
                                                </td>
                                                <td
                                                    className={`py-1 px-1 border-b border-gray-100 ${
                                                        rangeInfo
                                                            ? sev === "in"
                                                                ? "bg-emerald-50 border-emerald-500"
                                                                : sev ===
                                                                  "slight"
                                                                ? "bg-amber-50 border-amber-400"
                                                                : "bg-rose-50 border-rose-500"
                                                            : ""
                                                    }`}
                                                >
                                                    {formatValue(r.value)}
                                                </td>
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {trendCell(trend2)}
                                                </td>
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {trendCell(trendAll)}
                                                </td>
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {r.unit}
                                                </td>
                                                <td className="py-1 px-1 border-b border-gray-100">
                                                    {!r.reference_range ||
                                                    r.reference_range ===
                                                        "NO_RANGE" ? (
                                                        <span className="italic opacity-60">
                                                            No range
                                                        </span>
                                                    ) : (
                                                        r.reference_range
                                                    )}
                                                </td>
                                            </tr>
                                        );
                                    })}
                        </tbody>
                    </table>
                    {otherRows.length > 0 && (
                        <button
                            className="mt-2 text-[11px] text-blue-600 hover:underline"
                            onClick={() =>
                                setExpandedCats((prev) => ({
                                    ...prev,
                                    [cat]: !prev[cat],
                                }))
                            }
                        >
                            {expandedCats[cat]
                                ? "Hide historical"
                                : `Show all (${otherRows.length})`}
                        </button>
                    )}
                </div>
            </div>
        );
    };

    // Summary counts
    const totalTests = data.length;
    const latestOutCount = data.reduce((acc, r) => {
        // simplistic: rely on MainOverview logic separately; quick filter for header summary
        const sev = rangeSeverity(r.value, r.reference_range);
        return sev === "in" ? acc : acc + 1;
    }, 0);

    return (
        <div className="mt-4 flex gap-6 relative animate-floatFade">
            <aside className="w-56 shrink-0 pr-4 border-r border-slate-200">
                <div className="mb-5 space-y-2">
                    <div className="px-3 py-2 rounded-lg bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-100 text-[11px] text-slate-600 flex flex-col gap-1">
                        <div className="flex items-center gap-1.5 text-slate-800 font-medium">
                            <PiHeartbeatLight className="w-4 h-4 text-blue-600" />{" "}
                            Summary
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Total</span>
                            <span className="font-semibold text-slate-700">
                                {totalTests}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Potential OOR</span>
                            <span className="font-semibold text-rose-600">
                                {latestOutCount}
                            </span>
                        </div>
                        <div className="flex items-center justify-between">
                            <span>Scheduled</span>
                            <span className="font-semibold text-blue-600">
                                {schedule.length}
                            </span>
                        </div>
                    </div>
                </div>
                <div className="flex flex-col gap-1">
                    <TabButton
                        label="Main"
                        icon={<PiClipboardTextLight className="w-4 h-4" />}
                        active={activeTab === "main"}
                        onClick={() => setActiveTab("main")}
                    />
                    {categoryKeys.map((cat) => (
                        <TabButton
                            key={cat}
                            label={cat}
                            icon={<PiFlaskLight className="w-4 h-4" />}
                            active={activeTab === cat}
                            onClick={() => setActiveTab(cat)}
                        />
                    ))}
                </div>
            </aside>
            <main className="flex-1 min-w-0 animate-[fadeIn_0.4s_ease]">
                {activeTab === "main" ? (
                    <MainOverview
                        data={data}
                        categories={categories}
                        categoryKeys={categoryKeys}
                        rangeSeverity={rangeSeverity}
                        schedule={schedule}
                        markScheduleComplete={markScheduleComplete}
                        addSchedule={addSchedule}
                        removeSchedule={removeSchedule}
                        scheduleLoading={scheduleLoading}
                        scheduleError={scheduleError}
                    />
                ) : (
                    <div className="space-y-8">{renderCategory(activeTab)}</div>
                )}
            </main>
        </div>
    );
}

function formatValue(raw: string): string {
    const num = parseFloat(raw);
    if (!isFinite(num)) return raw;
    const fixed = num.toFixed(4); // 4 decimal places
    // Trim trailing zeros and possible trailing dot
    return fixed.replace(/\.0+$/, "").replace(/(\.\d*?[1-9])0+$/, "$1");
}

function colorForIndex(i: number) {
    const palette = [
        "#2563eb",
        "#dc2626",
        "#16a34a",
        "#9333ea",
        "#d97706",
        "#0891b2",
        "#be185d",
    ];
    return palette[i % palette.length];
}

interface TrendInfo {
    arrow: string;
    color: string;
    title: string;
}
function computeTrendAll(
    allRows: any[],
    testName: string
): TrendInfo | undefined {
    const points = allRows
        .filter((r) => r.test_name === testName)
        .map((l) => ({
            v: parseFloat(l.value),
            d: new Date(
                l.test_date || l.dateAdded || l.created_at || 0
            ).getTime(),
        }))
        .filter((p) => isFinite(p.v) && p.d > 0)
        .sort((a, b) => a.d - b.d);
    if (points.length < 2) return undefined;
    const Y = points.map((p) => p.v);
    const X = points.map((_, i) => i);
    const { w } = getDataGradient(X, Y);
    const change = w * (points.length - 1);
    const minY = Math.min(...Y);
    const maxY = Math.max(...Y);
    const range = maxY - minY;
    const thresh = Math.max(range * 0.1, Math.abs(maxY) * 0.001, 1e-6);
    return arrowForChange(
        change,
        range,
        thresh,
        `Trend across all (${points.length}) values: change=${change.toFixed(
            4
        )}`
    );
}

function computeTrendLast2(
    allRows: any[],
    testName: string
): TrendInfo | undefined {
    const pts = allRows
        .filter((r) => r.test_name === testName)
        .map((l) => ({
            v: parseFloat(l.value),
            d: new Date(
                l.test_date || l.dateAdded || l.created_at || 0
            ).getTime(),
        }))
        .filter((p) => isFinite(p.v) && p.d > 0)
        .sort((a, b) => a.d - b.d);
    if (pts.length < 2) return undefined;
    const last2 = pts.slice(-2);
    const change = last2[1].v - last2[0].v;
    const minY = Math.min(last2[0].v, last2[1].v);
    const maxY = Math.max(last2[0].v, last2[1].v);
    const range = maxY - minY;
    const thresh = Math.max(range * 0.1, Math.abs(maxY) * 0.001, 1e-6);
    return arrowForChange(
        change,
        range,
        thresh,
        `Change last 2: Δ=${change.toFixed(4)}`
    );
}

function arrowForChange(
    change: number,
    range: number,
    thresh: number,
    title: string
): TrendInfo {
    let arrow = "→";
    let color = "#64748b";
    if (!(range === 0 || Math.abs(change) < thresh)) {
        if (change > 0) {
            arrow = "↑";
            color = "#16a34a";
        } else {
            arrow = "↓";
            color = "#dc2626";
        }
    }
    return { arrow, color, title };
}

// Simple tab button component
function TabButton({
    label,
    active,
    onClick,
    icon,
}: {
    label: string;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
}) {
    return (
        <button
            className={`group text-left px-3 py-2 rounded-md text-sm capitalize border flex items-center gap-2 transition-all duration-200 ${
                active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-400 text-slate-700"
            }`}
            onClick={onClick}
        >
            {icon && (
                <span
                    className={`transition-colors ${
                        active ? "text-white" : "text-blue-600"
                    }`}
                >
                    {icon}
                </span>
            )}
            <span className="font-medium tracking-wide">{label}</span>
        </button>
    );
}

// Range helpers (duplicated from Compare for coloring)
function parseRange(range?: string) {
    if (!range || range === "NO_RANGE") return null;
    const m = range.match(
        /\s*([+-]?\d*\.?\d+)\s*<\s*x\s*<\s*([+-]?\d*\.?\d+)/i
    );
    if (!m) return { low: -1, high: -1, alwaysGreen: true };
    const low = parseFloat(m[1]);
    const high = parseFloat(m[2]);
    if (!isFinite(low) || !isFinite(high)) return null;
    return { low, high, alwaysGreen: false };
}
// (inRange retained conceptually but replaced by rangeSeverity)

function trendCell(t?: TrendInfo) {
    if (!t) return <span className="opacity-40">—</span>;
    return (
        <span
            title={t.title}
            style={{ color: t.color }}
            className="font-semibold"
        >
            {t.arrow}
        </span>
    );
}

function SeverityPill({ severity }: { severity: "in" | "slight" | "far" }) {
    if (severity === "in") return null;
    const base =
        severity === "slight"
            ? "bg-amber-50 text-amber-700 border-amber-300"
            : "bg-rose-50 text-rose-700 border-rose-300";
    const label = severity === "slight" ? "Slight" : "High";
    const Icon =
        severity === "slight" ? PiWarningCircleLight : PiWarningCircleLight;
    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border font-medium ${base}`}
        >
            <Icon className="w-3 h-3" /> {label}
        </span>
    );
}

// ---------------- Main Overview Component ----------------
function MainOverview({
    data,
    categoryKeys,
    rangeSeverity,
    schedule,
    markScheduleComplete,
    addSchedule,
    removeSchedule,
    scheduleLoading,
    scheduleError,
}: any) {
    interface AggRow {
        test_name: string;
        category: string;
        value: string;
        unit: string;
        date: string;
        reference_range: string;
        severity: "slight" | "far";
    }
    // Global latest measurement per test across all categories
    const latestByTest: Record<string, DashboardRow> = {};
    data.forEach((r: DashboardRow) => {
        const k = r.test_name;
        const t = new Date(
            r.test_date || r.dateAdded || r.created_at || 0
        ).getTime();
        if (!latestByTest[k]) latestByTest[k] = r;
        else {
            const prev = new Date(
                latestByTest[k].test_date ||
                    latestByTest[k].dateAdded ||
                    latestByTest[k].created_at ||
                    0
            ).getTime();
            if (t > prev) latestByTest[k] = r;
        }
    });
    const outRows: AggRow[] = Object.values(latestByTest)
        .map((r) => ({
            test_name: r.test_name,
            category: (r.category || "uncategorized").toLowerCase(),
            value: r.value,
            unit: r.unit,
            date: (r.test_date || r.dateAdded || r.created_at || "").slice(
                0,
                10
            ),
            reference_range: r.reference_range || "",
            severity: rangeSeverity(r.value, r.reference_range),
        }))
        .filter((r) => r.severity !== "in")
        .sort((a, b) => a.test_name.localeCompare(b.test_name));

    // Group schedule by category (merge visually)
    const scheduleByCat: Record<string, any[]> = {};
    schedule.forEach((s: any) => {
        if (!scheduleByCat[s.category]) scheduleByCat[s.category] = [];
        scheduleByCat[s.category].push(s);
    });

    // Manual add form
    const [newName, setNewName] = useState("");
    const [newCat, setNewCat] = useState(categoryKeys[0] || "other");
    const submitNew = (e: any) => {
        e.preventDefault();
        if (!newName.trim()) return;
        addSchedule({
            test_name: newName.trim(),
            category: newCat,
            reason: "manual",
        });
        setNewName("");
    };

    return (
        <div className="text-sm text-gray-700 space-y-8">
            <section>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <PiWarningCircleLight className="w-4 h-4 text-rose-600" />{" "}
                    Needs Attention
                    <span className="text-[11px] font-normal text-gray-500">
                        ({outRows.length})
                    </span>
                </h3>
                {outRows.length === 0 ? (
                    <div className="text-xs italic text-gray-500">
                        None out of range.
                    </div>
                ) : (
                    <div className="border rounded-lg bg-white shadow-sm ring-1 ring-slate-100 overflow-hidden">
                        <table className="w-full text-[12px] border-collapse">
                            <thead>
                                <tr className="bg-slate-50 text-slate-600">
                                    <th className="text-left px-2 py-1 border-b">
                                        Test
                                    </th>
                                    <th className="text-left px-2 py-1 border-b">
                                        Cat
                                    </th>
                                    <th className="text-left px-2 py-1 border-b">
                                        Value
                                    </th>
                                    <th className="text-left px-2 py-1 border-b">
                                        Range
                                    </th>
                                    <th className="text-left px-2 py-1 border-b">
                                        Date
                                    </th>
                                    <th className="text-left px-2 py-1 border-b">
                                        Severity
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {outRows.map((r, i) => (
                                    <tr
                                        key={i}
                                        className="hover:bg-blue-50/40 transition"
                                    >
                                        <td className="px-2 py-1 border-b font-medium">
                                            {r.test_name}
                                        </td>
                                        <td className="px-2 py-1 border-b capitalize">
                                            {r.category}
                                        </td>
                                        <td className="px-2 py-1 border-b">
                                            {formatValue(r.value)} {r.unit}
                                        </td>
                                        <td className="px-2 py-1 border-b">
                                            {r.reference_range ===
                                            "NO_RANGE" ? (
                                                <span className="italic opacity-60">
                                                    No range
                                                </span>
                                            ) : (
                                                r.reference_range.replace(
                                                    "<x<",
                                                    "-"
                                                )
                                            )}
                                        </td>
                                        <td className="px-2 py-1 border-b">
                                            {r.date}
                                        </td>
                                        <td className="px-2 py-1 border-b">
                                            <SeverityPill
                                                severity={r.severity}
                                            />
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                )}
            </section>
            <section>
                <h3 className="font-semibold text-gray-800 mb-3 flex items-center gap-2 text-sm uppercase tracking-wide">
                    <PiListChecksLight className="w-4 h-4 text-blue-600" />{" "}
                    Schedule
                    <span className="text-[11px] font-normal text-gray-500">
                        ({schedule.length})
                    </span>
                </h3>
                {scheduleLoading && (
                    <div className="text-[11px] text-gray-500 mb-2">
                        Loading…
                    </div>
                )}
                {scheduleError && (
                    <div className="text-[11px] text-red-600 mb-2">
                        {scheduleError}
                    </div>
                )}
                <form
                    onSubmit={submitNew}
                    className="flex flex-wrap items-end gap-2 mb-3 text-xs"
                >
                    <div className="flex flex-col">
                        <label className="text-[11px] text-gray-600">
                            Test Name
                        </label>
                        <input
                            value={newName}
                            onChange={(e) => setNewName(e.target.value)}
                            className="border rounded px-2 py-1 text-xs"
                            placeholder="e.g. Creatinine"
                        />
                    </div>
                    <div className="flex flex-col">
                        <label className="text-[11px] text-gray-600">
                            Category
                        </label>
                        <select
                            value={newCat}
                            onChange={(e) => setNewCat(e.target.value)}
                            className="border rounded px-2 py-1 text-xs capitalize"
                        >
                            {categoryKeys.map((c: string) => (
                                <option
                                    key={c}
                                    value={c}
                                    className="capitalize"
                                >
                                    {c}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="submit"
                        className="px-3 py-1 border rounded hover:bg-gray-100"
                        disabled={!newName.trim()}
                    >
                        Add
                    </button>
                </form>
                {schedule.length === 0 ? (
                    <div className="text-xs italic text-gray-500">
                        No tasks scheduled.
                    </div>
                ) : (
                    <div className="space-y-4">
                        {Object.keys(scheduleByCat)
                            .sort()
                            .map((cat: string) => (
                                <div
                                    key={cat}
                                    className="border rounded bg-white shadow-sm p-3"
                                >
                                    <h4 className="font-semibold text-xs mb-2 capitalize flex items-center gap-2">
                                        {cat}
                                        <span className="text-[10px] font-normal text-gray-500">
                                            ({scheduleByCat[cat].length} tasks)
                                        </span>
                                    </h4>
                                    <ul className="space-y-1">
                                        {scheduleByCat[cat].map(
                                            (t: any, i: number) => (
                                                <li
                                                    key={i}
                                                    className="flex items-center gap-2 text-xs"
                                                >
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            markScheduleComplete(
                                                                t.test_name
                                                            )
                                                        }
                                                        className={`w-5 h-5 flex items-center justify-center rounded-full transition ${
                                                            t.status === "done"
                                                                ? "text-emerald-600 hover:text-emerald-500"
                                                                : "text-slate-400 hover:text-blue-500"
                                                        }`}
                                                        title={
                                                            t.status === "done"
                                                                ? "Mark pending"
                                                                : "Mark done"
                                                        }
                                                    >
                                                        {t.status === "done" ? (
                                                            <PiCheckCircleLight className="w-5 h-5" />
                                                        ) : (
                                                            <PiCircleLight className="w-5 h-5" />
                                                        )}
                                                    </button>
                                                    <span
                                                        className={`${
                                                            t.status === "done"
                                                                ? "line-through opacity-60"
                                                                : "font-medium"
                                                        }`}
                                                    >
                                                        {t.test_name}
                                                    </span>
                                                    <span className="text-[10px] uppercase tracking-wide rounded px-1 py-0.5 bg-blue-50 text-blue-700 border border-blue-200">
                                                        {t.reason}
                                                    </span>
                                                    <button
                                                        type="button"
                                                        onClick={() =>
                                                            removeSchedule(
                                                                t.test_name
                                                            )
                                                        }
                                                        className="ml-1 text-[10px] text-rose-500 hover:text-rose-700"
                                                        title="Remove"
                                                    >
                                                        <PiTrashSimpleLight className="w-4 h-4" />
                                                    </button>
                                                </li>
                                            )
                                        )}
                                    </ul>
                                </div>
                            ))}
                    </div>
                )}
            </section>
            {!data.length && (
                <div className="text-xs text-gray-500">No results yet.</div>
            )}
        </div>
    );
}
