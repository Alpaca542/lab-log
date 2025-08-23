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
        <div className="flex gap-6 items-start">
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-2">Original File</h3>
                {originalFileUrl.toLowerCase().endsWith(".pdf") ? (
                    <embed
                        src={originalFileUrl}
                        type="application/pdf"
                        width="100%"
                        height={500}
                        className="border rounded"
                    />
                ) : (
                    <img
                        src={originalFileUrl}
                        className="max-w-full max-h-[500px] rounded border object-contain"
                    />
                )}
            </div>
            <div className="flex-1">
                <h3 className="font-semibold mb-2">
                    Extracted Values (Editable)
                </h3>
                <div className="max-h-[500px] overflow-auto border border-gray-300 rounded p-2 bg-white">
                    <table className="w-full border-collapse text-sm">
                        <thead>
                            <tr className="bg-gray-100 text-xs text-gray-700">
                                <th className="text-left py-1 px-2 border-b border-gray-300 font-medium">
                                    Test
                                </th>
                                <th className="text-left py-1 px-2 border-b border-gray-300 font-medium">
                                    Value
                                </th>
                                <th className="text-left py-1 px-2 border-b border-gray-300 font-medium">
                                    Unit
                                </th>
                                <th className="text-left py-1 px-2 border-b border-gray-300 font-medium">
                                    Ref Range
                                </th>
                                <th className="text-left py-1 px-2 border-b border-gray-300 font-medium">
                                    Category
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {rows.map((r, i) => {
                                const rangeActive =
                                    r.reference_range &&
                                    r.reference_range !== "NO_RANGE";
                                const inside =
                                    rangeActive &&
                                    inRange(r.value, r.reference_range);
                                return (
                                    <tr
                                        key={i}
                                        className="odd:bg-white even:bg-gray-50"
                                    >
                                        <td className="py-1 px-2 border-b border-gray-200 align-top">
                                            <input
                                                value={r.test_name}
                                                onChange={(e) =>
                                                    updateRow(
                                                        i,
                                                        "test_name",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring"
                                            />
                                        </td>
                                        <td className="py-1 px-2 border-b border-gray-200 align-top">
                                            <input
                                                value={r.value}
                                                onChange={(e) =>
                                                    updateRow(
                                                        i,
                                                        "value",
                                                        e.target.value
                                                    )
                                                }
                                                className={`w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring ${
                                                    rangeActive
                                                        ? inside
                                                            ? "bg-emerald-50 border-emerald-500"
                                                            : "bg-rose-50 border-rose-500"
                                                        : ""
                                                }`}
                                            />
                                        </td>
                                        <td className="py-1 px-2 border-b border-gray-200 align-top">
                                            <input
                                                value={r.unit}
                                                onChange={(e) =>
                                                    updateRow(
                                                        i,
                                                        "unit",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring"
                                            />
                                        </td>
                                        <td className="py-1 px-2 border-b border-gray-200 align-top">
                                            <input
                                                value={
                                                    r.reference_range ===
                                                    "NO_RANGE"
                                                        ? ""
                                                        : r.reference_range ||
                                                          ""
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
                                                className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring"
                                            />
                                        </td>
                                        <td className="py-1 px-2 border-b border-gray-200 align-top">
                                            <input
                                                value={r.category || ""}
                                                onChange={(e) =>
                                                    updateRow(
                                                        i,
                                                        "category",
                                                        e.target.value
                                                    )
                                                }
                                                className="w-full text-xs px-2 py-1 border rounded focus:outline-none focus:ring"
                                                placeholder="blood / vision / ..."
                                            />
                                        </td>
                                    </tr>
                                );
                            })}
                            {rows.length === 0 && (
                                <tr>
                                    <td
                                        colSpan={5}
                                        className="text-center py-4 text-xs text-gray-500"
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
                    className="mt-3 px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700"
                >
                    Save To Database
                </button>
                <div className="mt-2 text-[11px] text-gray-600 flex items-center gap-2">
                    <span className="bg-emerald-50 border border-emerald-500 px-2 py-[2px] rounded text-emerald-700">
                        In range
                    </span>
                    <span className="bg-rose-50 border border-rose-500 px-2 py-[2px] rounded text-rose-700">
                        Out of range
                    </span>
                </div>
            </div>
        </div>
    );
}
// Inline style objects removed after Tailwind migration.
