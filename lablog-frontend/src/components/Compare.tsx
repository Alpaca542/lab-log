export interface LabValueRow {
    test_name: string;
    value: string;
    unit: string;
    reference_range?: string;
    category?: string;
    dateAdded?: string;
}

interface CompareProps {
    originalFileUrl: string;
    rows: LabValueRow[];
    onChange: (rows: LabValueRow[]) => void;
    onConfirm: () => void;
    disabled?: boolean;
}

export default function Compare({
    originalFileUrl,
    rows,
    onChange,
    onConfirm,
    disabled,
}: CompareProps) {
    const updateRow = (
        idx: number,
        field: keyof LabValueRow,
        value: string
    ) => {
        const next = [...rows];
        next[idx] = { ...next[idx], [field]: value };
        onChange(next);
    };

    const parseRange = (range?: string) => {
        if (!range || range === "NO_RANGE") return null;
        // Expect a<x<b
        const m = range.match(
            /\s*([+-]?\d*\.?\d+)\s*<\s*x\s*<\s*([+-]?\d*\.?\d+)/i
        );
        if (!m) return { low: -1, high: -1, alwaysGreen: true };
        const low = parseFloat(m[1]);
        const high = parseFloat(m[2]);
        if (!isFinite(low) || !isFinite(high)) return null;
        return { low, high, alwaysGreen: false };
    };

    const inRange = (valStr: string, range?: string) => {
        const val = parseFloat(valStr);
        if (!isFinite(val)) return false;
        const r = parseRange(range);
        if (!r || r.alwaysGreen) return true;
        return val > r.low && val < r.high; // open interval
    };

    return (
        <div style={{ display: "flex", gap: 24, alignItems: "flex-start" }}>
            <div style={{ flex: 1, minWidth: 0 }}>
                <h3>Original File</h3>
                {originalFileUrl.toLowerCase().endsWith(".pdf") ? (
                    <embed
                        src={originalFileUrl}
                        type="application/pdf"
                        width="100%"
                        height={500}
                    />
                ) : (
                    <img
                        src={originalFileUrl}
                        style={{ maxWidth: "100%", maxHeight: 500 }}
                    />
                )}
            </div>
            <div style={{ flex: 1 }}>
                <h3>Extracted Values (Editable)</h3>
                <div
                    style={{
                        maxHeight: 500,
                        overflow: "auto",
                        border: "1px solid #ddd",
                        padding: 8,
                    }}
                >
                    <table
                        style={{
                            width: "100%",
                            borderCollapse: "collapse",
                            fontSize: 14,
                        }}
                    >
                        <thead>
                            <tr>
                                <th style={thStyle}>Test</th>
                                <th style={thStyle}>Value</th>
                                <th style={thStyle}>Unit</th>
                                <th style={thStyle}>Ref Range</th>
                                <th style={thStyle}>Category</th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => (
                                <tr key={i}>
                                    <td style={tdStyle}>
                                        <input
                                            value={r.test_name}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "test_name",
                                                    e.target.value
                                                )
                                            }
                                            style={inputStyle}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <input
                                            value={r.value}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "value",
                                                    e.target.value
                                                )
                                            }
                                            style={{
                                                ...inputStyle,
                                                background:
                                                    r.reference_range &&
                                                    r.reference_range !==
                                                        "NO_RANGE"
                                                        ? inRange(
                                                              r.value,
                                                              r.reference_range
                                                          )
                                                            ? "#ecfdf5" // green tint
                                                            : "#fef2f2" // red tint
                                                        : undefined,
                                                borderColor:
                                                    r.reference_range &&
                                                    r.reference_range !==
                                                        "NO_RANGE"
                                                        ? inRange(
                                                              r.value,
                                                              r.reference_range
                                                          )
                                                            ? "#10b981"
                                                            : "#dc2626"
                                                        : undefined,
                                            }}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <input
                                            value={r.unit}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "unit",
                                                    e.target.value
                                                )
                                            }
                                            style={inputStyle}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <input
                                            value={
                                                r.reference_range === "NO_RANGE"
                                                    ? ""
                                                    : r.reference_range || ""
                                            }
                                            placeholder="No range"
                                            onChange={(e) => {
                                                const val =
                                                    e.target.value.trim();
                                                updateRow(
                                                    i,
                                                    "reference_range",
                                                    val ? val : "NO_RANGE"
                                                );
                                            }}
                                            style={inputStyle}
                                        />
                                    </td>
                                    <td style={tdStyle}>
                                        <input
                                            value={r.category || ""}
                                            onChange={(e) =>
                                                updateRow(
                                                    i,
                                                    "category",
                                                    e.target.value
                                                )
                                            }
                                            style={inputStyle}
                                            placeholder="blood / vision / ..."
                                        />
                                    </td>
                                </tr>
                            ))}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        style={{
                                            textAlign: "center",
                                            padding: 16,
                                            color: "#777",
                                        }}
                                    >
                                        No rows
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <button
                    onClick={onConfirm}
                    disabled={disabled}
                    style={{ marginTop: 12, padding: "10px 18px" }}
                >
                    Save To Database
                </button>
                <div style={{ marginTop: 8, fontSize: 11, color: "#555" }}>
                    <span
                        style={{
                            background: "#ecfdf5",
                            border: "1px solid #10b981",
                            padding: "2px 6px",
                            marginRight: 6,
                        }}
                    >
                        In range
                    </span>
                    <span
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #dc2626",
                            padding: "2px 6px",
                        }}
                    >
                        Out of range
                    </span>
                </div>
            </div>
        </div>
    );
}

const thStyle: React.CSSProperties = {
    textAlign: "left",
    borderBottom: "1px solid #ccc",
    padding: 4,
};
const tdStyle: React.CSSProperties = {
    borderBottom: "1px solid #eee",
    padding: 4,
    verticalAlign: "top",
};
const inputStyle: React.CSSProperties = {
    width: "100%",
    fontSize: 12,
    padding: 4,
};
