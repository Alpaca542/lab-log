import { useMemo, useState } from "react";
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    CartesianGrid,
} from "recharts";
import type { DashboardRow } from "./types";
import {
    computeTrendAll,
    computeTrendLast2,
    formatValue,
    parseRange,
    rangeSeverity,
} from "./utils";
import SeverityPill from "./SeverityPill";

interface CategoryPanelProps {
    category: string;
    rows: DashboardRow[];
}

export default function CategoryPanel({ category, rows }: CategoryPanelProps) {
    const [expanded, setExpanded] = useState(true);
    const dataSorted = useMemo(
        () =>
            [...rows].sort(
                (a, b) =>
                    a.test_name.localeCompare(b.test_name) ||
                    new Date(
                        a.test_date || a.dateAdded || a.created_at || 0
                    ).getTime() -
                        new Date(
                            b.test_date || b.dateAdded || b.created_at || 0
                        ).getTime()
            ),
        [rows]
    );
    const grouped = useMemo(() => {
        const g: Record<string, DashboardRow[]> = {};
        dataSorted.forEach((r) => {
            (g[r.test_name] = g[r.test_name] || []).push(r);
        });
        return g;
    }, [dataSorted]);
    const { numericTests, qualitativeTests } = useMemo(() => {
        const numeric: string[] = [];
        const qual: string[] = [];
        Object.keys(grouped).forEach((test) => {
            const series = grouped[test];
            const hasNumeric = series.some((r) => {
                const unit = (r.unit || "").toLowerCase();
                if (unit === "text" || unit === "qualitative") return false;
                const num = parseFloat(r.value || "");
                return isFinite(num);
            });
            (hasNumeric ? numeric : qual).push(test);
        });
        return { numericTests: numeric.sort(), qualitativeTests: qual.sort() };
    }, [grouped]);

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <h3 className="font-semibold text-gray-800 text-sm uppercase tracking-wide flex items-center gap-2">
                    <span className="capitalize">{category}</span>
                    <span className="text-[11px] font-normal text-gray-500">
                        ({rows.length})
                    </span>
                </h3>
                <button
                    onClick={() => setExpanded((e) => !e)}
                    className="text-xs px-2 py-1 border rounded bg-white hover:bg-gray-50 shadow-sm"
                >
                    {expanded ? "Collapse" : "Expand"}
                </button>
            </div>
            {expanded && (
                <div className="space-y-8">
                    {numericTests.length > 0 && (
                        <div className="grid gap-6 md:grid-cols-2">
                            {numericTests.map((test) => {
                                const series = grouped[test];
                                const latest = series[series.length - 1];
                                const sev = rangeSeverity(
                                    latest.value,
                                    latest.reference_range
                                );
                                const pr = parseRange(
                                    latest.reference_range || ""
                                );
                                const low = pr?.low;
                                const high = pr?.high;
                                const rr = latest.reference_range || "";
                                const rangeDisp =
                                    rr === "NO_RANGE"
                                        ? "No range"
                                        : rr.replace("<x<", " - ");
                                const aiStar = rr.endsWith("*");
                                const points = series.map((r) => ({
                                    date: (
                                        r.test_date ||
                                        r.dateAdded ||
                                        r.created_at ||
                                        ""
                                    ).slice(5, 10),
                                    numeric: parseFloat(r.value || "0"),
                                    value: r.value,
                                    unit: r.unit,
                                    reference_range: r.reference_range,
                                }));
                                const trendAll = computeTrendAll(
                                    series as any,
                                    test
                                );
                                const trendRecent = computeTrendLast2(
                                    series as any,
                                    test
                                );
                                return (
                                    <div
                                        key={test}
                                        className="border rounded-lg bg-white shadow-sm ring-1 ring-slate-100 p-4"
                                    >
                                        <div className="flex flex-col md:flex-row md:items-center gap-4 mb-4">
                                            <div className="md:flex-1">
                                                <h4 className="font-semibold text-sm flex items-center gap-2">
                                                    {test}
                                                    <SeverityPill
                                                        severity={sev as any}
                                                    />
                                                </h4>
                                                <div className="text-[11px] text-gray-500">
                                                    Latest:{" "}
                                                    {formatValue(latest.value)}{" "}
                                                    {latest.unit} · {rangeDisp}
                                                    {aiStar && " *"}
                                                </div>
                                                <div className="text-[11px] text-gray-500 flex items-center gap-2">
                                                    <span
                                                        title={
                                                            trendAll?.title ||
                                                            "No trend"
                                                        }
                                                    >
                                                        All:{" "}
                                                        <span
                                                            style={{
                                                                color: trendAll?.color,
                                                            }}
                                                        >
                                                            {trendAll?.arrow ||
                                                                "-"}
                                                        </span>
                                                    </span>
                                                    <span
                                                        title={
                                                            trendRecent?.title ||
                                                            "No trend"
                                                        }
                                                    >
                                                        Last2:{" "}
                                                        <span
                                                            style={{
                                                                color: trendRecent?.color,
                                                            }}
                                                        >
                                                            {trendRecent?.arrow ||
                                                                "-"}
                                                        </span>
                                                    </span>
                                                </div>
                                            </div>
                                            <div
                                                className="h-40 w-full md:flex-1"
                                                aria-label={`Trend chart for ${test}`}
                                                role="img"
                                            >
                                                <ResponsiveContainer
                                                    width="100%"
                                                    height="100%"
                                                >
                                                    <LineChart
                                                        data={points}
                                                        margin={{
                                                            top: 10,
                                                            right: 20,
                                                            left: 0,
                                                            bottom: 0,
                                                        }}
                                                    >
                                                        <CartesianGrid
                                                            strokeDasharray="3 3"
                                                            className="stroke-slate-200"
                                                        />
                                                        <XAxis
                                                            dataKey="date"
                                                            tick={{
                                                                fontSize: 10,
                                                            }}
                                                        />
                                                        <YAxis
                                                            tick={{
                                                                fontSize: 10,
                                                            }}
                                                            domain={[
                                                                low ??
                                                                    "dataMin",
                                                                high ??
                                                                    "dataMax",
                                                            ]}
                                                        />
                                                        <Tooltip
                                                            formatter={(
                                                                v: any,
                                                                _n: any,
                                                                p: any
                                                            ) => [
                                                                `${v}`,
                                                                `${p.payload.unit}`,
                                                            ]}
                                                            labelFormatter={(
                                                                d
                                                            ) => `Date ${d}`}
                                                        />
                                                        <Line
                                                            type="monotone"
                                                            dataKey="numeric"
                                                            stroke="#2563eb"
                                                            strokeWidth={2}
                                                            dot={{ r: 2 }}
                                                            isAnimationActive={
                                                                false
                                                            }
                                                        />
                                                    </LineChart>
                                                </ResponsiveContainer>
                                            </div>
                                        </div>
                                        <div className="overflow-x-auto">
                                            <table className="w-full text-[11px]">
                                                <thead>
                                                    <tr className="text-slate-600 bg-slate-50">
                                                        <th className="text-left px-2 py-1 border-b">
                                                            Date
                                                        </th>
                                                        <th className="text-left px-2 py-1 border-b">
                                                            Value
                                                        </th>
                                                        <th className="text-left px-2 py-1 border-b">
                                                            Range
                                                        </th>
                                                        <th className="text-left px-2 py-1 border-b">
                                                            Severity
                                                        </th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {series
                                                        .slice()
                                                        .reverse()
                                                        .map((r, i) => {
                                                            const qualitative =
                                                                (
                                                                    r.unit || ""
                                                                ).toLowerCase() ===
                                                                    "text" ||
                                                                (
                                                                    r.unit || ""
                                                                ).toLowerCase() ===
                                                                    "qualitative";
                                                            const sevRow =
                                                                qualitative
                                                                    ? "in"
                                                                    : rangeSeverity(
                                                                          r.value,
                                                                          r.reference_range
                                                                      );
                                                            return (
                                                                <tr
                                                                    key={i}
                                                                    className="hover:bg-blue-50/40 transition"
                                                                >
                                                                    <td className="px-2 py-1 border-b whitespace-nowrap">
                                                                        {(
                                                                            r.test_date ||
                                                                            r.dateAdded ||
                                                                            r.created_at ||
                                                                            ""
                                                                        ).slice(
                                                                            0,
                                                                            10
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border-b">
                                                                        {formatValue(
                                                                            r.value
                                                                        )}{" "}
                                                                        {r.unit}
                                                                    </td>
                                                                    <td className="px-2 py-1 border-b">
                                                                        {r.reference_range ===
                                                                        "NO_RANGE" ? (
                                                                            <span className="italic opacity-60">
                                                                                No
                                                                                range
                                                                            </span>
                                                                        ) : (
                                                                            <span>
                                                                                {(
                                                                                    r.reference_range ||
                                                                                    ""
                                                                                )
                                                                                    .replace(
                                                                                        /<x</,
                                                                                        " - "
                                                                                    )
                                                                                    .replace(
                                                                                        /<=x<=/,
                                                                                        " - "
                                                                                    )}
                                                                                {r.reference_range &&
                                                                                    r.reference_range.endsWith(
                                                                                        "*"
                                                                                    ) && (
                                                                                        <sup
                                                                                            className="ml-0.5 text-[9px] text-blue-600 cursor-help"
                                                                                            title="AI-inferred reference range (verify)"
                                                                                        >
                                                                                            *
                                                                                        </sup>
                                                                                    )}
                                                                            </span>
                                                                        )}
                                                                    </td>
                                                                    <td className="px-2 py-1 border-b">
                                                                        {!qualitative && (
                                                                            <SeverityPill
                                                                                severity={
                                                                                    sevRow as any
                                                                                }
                                                                            />
                                                                        )}
                                                                    </td>
                                                                </tr>
                                                            );
                                                        })}
                                                </tbody>
                                            </table>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                    {qualitativeTests.length > 0 && (
                        <div className="space-y-4">
                            <h4 className="font-semibold text-xs uppercase tracking-wide text-gray-700">
                                Qualitative / Text Results
                            </h4>
                            <div className="grid gap-3 md:grid-cols-2">
                                {qualitativeTests.map((test) => {
                                    const series = grouped[test];
                                    return (
                                        <div
                                            key={test}
                                            className="border rounded-md bg-white shadow-sm p-3"
                                        >
                                            <h5 className="font-medium text-xs mb-2 flex items-center gap-2">
                                                {test}
                                                <span className="text-[10px] text-gray-400">
                                                    qualitative
                                                </span>
                                            </h5>
                                            <ul className="text-[11px] space-y-1">
                                                {series
                                                    .slice()
                                                    .sort(
                                                        (a, b) =>
                                                            new Date(
                                                                b.test_date ||
                                                                    b.dateAdded ||
                                                                    b.created_at ||
                                                                    "0"
                                                            ).getTime() -
                                                            new Date(
                                                                a.test_date ||
                                                                    a.dateAdded ||
                                                                    a.created_at ||
                                                                    "0"
                                                            ).getTime()
                                                    )
                                                    .map((r, i) => (
                                                        <li
                                                            key={i}
                                                            className="flex flex-wrap gap-2"
                                                        >
                                                            <span className="text-gray-500 w-20">
                                                                {(
                                                                    r.test_date ||
                                                                    r.dateAdded ||
                                                                    r.created_at ||
                                                                    ""
                                                                ).slice(0, 10)}
                                                            </span>
                                                            <span className="font-medium">
                                                                {r.value}
                                                                {r.reference_range &&
                                                                    r.reference_range.endsWith(
                                                                        "*"
                                                                    ) && (
                                                                        <span
                                                                            className="ml-1 text-[10px] text-blue-600"
                                                                            title="AI-inferred reference range"
                                                                        >
                                                                            *
                                                                        </span>
                                                                    )}
                                                            </span>
                                                        </li>
                                                    ))}
                                            </ul>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}
