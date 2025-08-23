import { useMemo } from "react";
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
                                {rows
                                    .slice(-10)
                                    .reverse()
                                    .map((r, i) => (
                                        <tr key={i}>
                                            <td style={td}>
                                                {(
                                                    r.test_date ||
                                                    r.dateAdded ||
                                                    r.created_at ||
                                                    ""
                                                ).slice(0, 10)}
                                            </td>
                                            <td style={td}>{r.test_name}</td>
                                            <td style={td}>{r.value}</td>
                                            <td style={td}>{r.unit}</td>
                                            <td style={td}>
                                                {!r.reference_range ||
                                                r.reference_range ===
                                                    "NO_RANGE" ? (
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
                            </tbody>
                        </table>
                    </div>
                );
            })}
        </div>
    );
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
