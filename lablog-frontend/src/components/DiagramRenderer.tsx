import React from "react";
import {
    ResponsiveContainer,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
} from "recharts";

interface DiagramRendererProps {
    testNames: string[];
    mergedArr: any[];
    domain: [number, number] | string;
    testHasRange: Record<string, boolean>;
    colorForIndex: (index: number) => string;
}

export function DiagramRenderer({
    testNames,
    mergedArr,
    domain,
    testHasRange,
    colorForIndex,
}: DiagramRendererProps) {
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
                <XAxis dataKey="date" fontSize={12} />
                <YAxis fontSize={12} domain={domain as any} allowDecimals />
                <Tooltip />
                <Legend />
                {testNames.map((tn, idx) => {
                    const hasRange = testHasRange[tn];
                    return (
                        <Line
                            key={tn}
                            type="monotone"
                            dataKey={tn}
                            stroke={colorForIndex(idx)}
                            strokeWidth={2}
                            dot={{
                                r: 3,
                            }}
                            strokeDasharray={hasRange ? undefined : "4 2"}
                            connectNulls
                        />
                    );
                })}
            </LineChart>
        </ResponsiveContainer>
    );
}
