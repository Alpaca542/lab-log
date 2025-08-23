import { useMemo, useState } from "react";
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
}

function parseNumeric(v: string): number | null {
    const num = parseFloat((v || "").replace(/[^0-9.+-]/g, ""));
    return isFinite(num) ? num : null;
}

export default function Dashboard({ data }: DashboardProps) {
    const categories = useMemo(() => {
        const map: Record<string, DashboardRow[]> = {};
        data.forEach((d) => {
            const cat = (d.category || "uncategorized").toLowerCase();
            let numeric = parseNumeric(d.value || "");
            const unitLower = (d.unit || "").toLowerCase();
            // Exclude from chart if unit qualitative/empty or value not numeric
            if (!d.unit || unitLower === "qualitative" || numeric == null) {
                numeric = null;
            }
            if (!map[cat]) map[cat] = [];
            map[cat].push({ ...d, numeric } as DashboardRow);
        });
        // Sort each category by test_date (or dateAdded)
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

    const categoryKeys = Object.keys(categories);
    const [expandedCats, setExpandedCats] = useState<Record<string, boolean>>(
        {}
    );

    if (!data.length)
        return (
            <div className="mt-5 text-sm text-gray-600">No results yet.</div>
        );

    return (
        <div className="flex flex-col gap-10 mt-5">
            {categoryKeys.map((cat) => {
                const rows = categories[cat];
                // Determine which tests ever have a valid (non-missing) range
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
                    date: (
                        r.test_date ||
                        r.dateAdded ||
                        r.created_at ||
                        ""
                    ).slice(0, 10),
                    [r.test_name]: r.numeric,
                    test_name: r.test_name,
                }));
                // Merge rows by date for multi-line chart
                const merged: Record<string, any> = {};
                chartData.forEach((pt) => {
                    if (!merged[pt.date]) merged[pt.date] = { date: pt.date };
                    merged[pt.date][pt.test_name] = pt[pt.test_name];
                });
                const mergedArr = Object.values(merged);
                // Collect unique test names (limit to 6 for readability)
                const testNames = Array.from(
                    new Set(rows.map((r) => r.test_name))
                ).slice(0, 6);
                // Derive effective date per row and partition latest vs others
                const withEffectiveDate = rows.map((r) => ({
                    ...r,
                    _date: (
                        r.test_date ||
                        r.dateAdded ||
                        r.created_at ||
                        ""
                    ).slice(0, 10),
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
                // expanded state derived from expandedCats map
                return (
                    <div
                        key={cat}
                        className="border border-gray-300 rounded-lg p-4 bg-white shadow-sm"
                    >
                        <h3 className="mt-0 mb-3 capitalize font-semibold text-gray-800 text-lg">
                            {cat}{" "}
                            <span className="text-gray-500 text-sm font-normal">
                                ({rows.length})
                            </span>
                        </h3>
                        <div className="w-full h-[300px]">
                            {(() => {
                                const nums: number[] = [];
                                rows.forEach((r) => {
                                    if (
                                        r.numeric != null &&
                                        isFinite(r.numeric)
                                    )
                                        nums.push(r.numeric);
                                });
                                let domain: [number, number] | undefined;
                                if (nums.length) {
                                    let min = Math.min(...nums);
                                    let max = Math.max(...nums);
                                    if (min === max) {
                                        const base =
                                            min === 0 ? 1 : Math.abs(min) * 0.1;
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
                                    <ResponsiveContainer>
                                        <LineChart
                                            data={mergedArr}
                                            margin={{
                                                top: 10,
                                                right: 20,
                                                bottom: 10,
                                                left: 0,
                                            }}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis
                                                dataKey="date"
                                                fontSize={12}
                                            />
                                            <YAxis
                                                fontSize={12}
                                                domain={domain as any}
                                                allowDecimals
                                            />
                                            <Tooltip />
                                            <Legend />
                                            {testNames.map((tn, idx) => {
                                                const hasRange =
                                                    testHasRange[tn];
                                                return (
                                                    <Line
                                                        key={tn}
                                                        type="monotone"
                                                        dataKey={tn}
                                                        stroke={colorForIndex(
                                                            idx
                                                        )}
                                                        strokeWidth={2}
                                                        dot={{ r: 3 }}
                                                        strokeDasharray={
                                                            hasRange
                                                                ? undefined
                                                                : "4 2"
                                                        }
                                                        connectNulls
                                                    />
                                                );
                                            })}
                                        </LineChart>
                                    </ResponsiveContainer>
                                );
                            })()}
                        </div>
                        <div className="text-[11px] mt-1 text-gray-600">
                            <span className="mr-3">
                                Dashed line = no reference range available
                            </span>
                        </div>
                        <table className="w-full border-collapse mt-3 text-[12px]">
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
                                    const rangeInfo = parseRange(
                                        r.reference_range
                                    );
                                    const inR = inRange(
                                        r.value,
                                        r.reference_range
                                    );
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
                                                        ? inR
                                                            ? "bg-emerald-50 border-emerald-500"
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
                                                r.reference_range ===
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
                                            const rangeInfo = parseRange(
                                                r.reference_range
                                            );
                                            const inR = inRange(
                                                r.value,
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
                                                                ? inR
                                                                    ? "bg-emerald-50 border-emerald-500"
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
                );
            })}
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
function inRange(valStr: string, range?: string) {
    const val = parseFloat(valStr);
    if (!isFinite(val)) return false;
    const r = parseRange(range);
    if (!r || r.alwaysGreen) return true;
    return val > r.low && val < r.high;
}

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
