import { useMemo, useState } from "react";
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
            const numeric = parseNumeric(d.value || "");
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

    if (!data.length)
        return <div style={{ marginTop: 20 }}>No results yet.</div>;

    return (
        <div
            style={{
                display: "flex",
                flexDirection: "column",
                gap: 40,
                marginTop: 20,
            }}
        >
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
                // Local expand state per category
                const [expanded, setExpanded] = useState(false);
                return (
                    <div
                        key={cat}
                        style={{
                            border: "1px solid #ddd",
                            padding: 16,
                            borderRadius: 8,
                        }}
                    >
                        <h3
                            style={{
                                marginTop: 0,
                                textTransform: "capitalize",
                            }}
                        >
                            {cat} ({rows.length})
                        </h3>
                        <div style={{ width: "100%", height: 300 }}>
                            {(() => {
                                // Compute nice Y domain (padded) for visible test names with numeric values
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
                                        // Single value; create artificial span
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
                                    if (min >= 0 && min < 0) min = 0; // safeguard (no-op logically)
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
                        <div
                            style={{
                                fontSize: 11,
                                marginTop: 4,
                                color: "#555",
                            }}
                        >
                            <span style={{ marginRight: 12 }}>
                                Dashed line = no reference range available
                            </span>
                        </div>
                        <table
                            style={{
                                width: "100%",
                                borderCollapse: "collapse",
                                marginTop: 12,
                                fontSize: 12,
                            }}
                        >
                            <thead>
                                <tr>
                                    <th style={th}>Date</th>
                                    <th style={th}>Test</th>
                                    <th style={th}>Value</th>
                                    <th style={th}>Unit</th>
                                    <th style={th}>Ref Range</th>
                                </tr>
                            </thead>
                            <tbody>
                                {/* Latest date group (always visible) */}
                                {latestRows.map((r, i) => (
                                    <tr
                                        key={"latest-" + i}
                                        style={{ background: "#f1f5f9" }}
                                    >
                                        <td style={td}>{r._date}</td>
                                        <td style={td}>{r.test_name}</td>
                                        <td style={td}>
                                            {formatValue(r.value)}
                                        </td>
                                        <td style={td}>{r.unit}</td>
                                        <td style={td}>
                                            {!r.reference_range ||
                                            r.reference_range === "NO_RANGE" ? (
                                                <span
                                                    style={{
                                                        opacity: 0.6,
                                                        fontStyle: "italic",
                                                    }}
                                                >
                                                    No range
                                                </span>
                                            ) : (
                                                r.reference_range
                                            )}
                                        </td>
                                    </tr>
                                ))}
                                {/* Separator row */}
                                {otherRows.length > 0 && (
                                    <tr>
                                        <td
                                            colSpan={5}
                                            style={{
                                                padding: 6,
                                                background: "#eee",
                                                fontSize: 11,
                                            }}
                                        >
                                            Historical Results (
                                            {otherRows.length})
                                            {!expanded && " – collapsed"}
                                        </td>
                                    </tr>
                                )}
                                {expanded &&
                                    otherRows
                                        .slice()
                                        .sort((a, b) =>
                                            b._date.localeCompare(a._date)
                                        )
                                        .map((r, i) => (
                                            <tr key={"hist-" + i}>
                                                <td style={td}>{r._date}</td>
                                                <td style={td}>
                                                    {r.test_name}
                                                </td>
                                                <td style={td}>
                                                    {formatValue(r.value)}
                                                </td>
                                                <td style={td}>{r.unit}</td>
                                                <td style={td}>
                                                    {!r.reference_range ||
                                                    r.reference_range ===
                                                        "NO_RANGE" ? (
                                                        <span
                                                            style={{
                                                                opacity: 0.6,
                                                                fontStyle:
                                                                    "italic",
                                                            }}
                                                        >
                                                            No range
                                                        </span>
                                                    ) : (
                                                        r.reference_range
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                            </tbody>
                        </table>
                        {otherRows.length > 0 && (
                            <button
                                style={{ marginTop: 8, fontSize: 11 }}
                                onClick={() => setExpanded((e) => !e)}
                            >
                                {expanded
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

const th: React.CSSProperties = {
    textAlign: "left",
    padding: 4,
    borderBottom: "1px solid #ccc",
};
const td: React.CSSProperties = { padding: 4, borderBottom: "1px solid #eee" };
