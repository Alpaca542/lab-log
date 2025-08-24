export interface LabValueRow {
    test_name: string;
    value: string;
    unit: string;
    reference_range?: string;
    category?: string;
    dateAdded?: string;
    ai_inferred_range?: boolean; // true if current reference_range ends with * originally
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
        <div className="flex gap-8 items-start">
            <div className="flex-1 min-w-0">
                <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-slate-600">
                    Original File
                </h3>
                <embed
                    src={originalFileUrl}
                    type="application/pdf"
                    width="100%"
                    height={500}
                    className="border rounded"
                />
            </div>
            <div className="flex-1">
                <h3 className="font-semibold mb-2 text-sm uppercase tracking-wide text-slate-600">
                    Extracted Values (Editable)
                </h3>
                <div className="max-h-[520px] overflow-auto border border-slate-200 rounded-lg p-2 bg-white shadow-sm ring-1 ring-slate-100">
                    <table className="w-full border-collapse text-xs">
                        <thead>
                            <tr className="bg-slate-50 text-[11px] text-slate-600">
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
                                const isQual =
                                    (r.unit || "").toLowerCase() === "text" ||
                                    (r.unit || "").toLowerCase() ===
                                        "qualitative";
                                const inside =
                                    !isQual &&
                                    rangeActive &&
                                    inRange(r.value, r.reference_range);
                                return (
                                    <tr
                                        key={i}
                                        className="odd:bg-white even:bg-slate-50 hover:bg-blue-50/40 transition"
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
                                                className="w-full text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring focus:ring-blue-200"
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
                                                className={`w-full text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring focus:ring-blue-200 ${
                                                    !isQual && rangeActive
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
                                                className="w-full text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring focus:ring-blue-200"
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
                                                    // If user edits manually, clear ai flag
                                                    if (
                                                        rows[i]
                                                            .ai_inferred_range
                                                    ) {
                                                        const next = [...rows];
                                                        next[i] = {
                                                            ...next[i],
                                                            ai_inferred_range:
                                                                false,
                                                        };
                                                        onChange(next);
                                                    }
                                                }}
                                                className="w-full text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring focus:ring-blue-200"
                                            />
                                            {r.reference_range &&
                                                r.reference_range !==
                                                    "NO_RANGE" &&
                                                r.reference_range.endsWith(
                                                    "*"
                                                ) && (
                                                    <span
                                                        className="ml-1 text-[10px] text-blue-600 cursor-help"
                                                        title="AI-inferred reference range (verify with your lab)"
                                                    >
                                                        *
                                                    </span>
                                                )}
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
                                                className="w-full text-[11px] px-2 py-1 border rounded focus:outline-none focus:ring focus:ring-blue-200"
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
                                        className="text-center py-4 text-xs text-slate-500"
                                    >
                                        No rows
                                    </td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
                <div className="flex items-center gap-4 mt-4">
                    <button
                        onClick={onConfirm}
                        disabled={disabled}
                        className="inline-flex items-center gap-2 px-5 py-2 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 shadow-sm"
                    >
                        Save to Dashboard
                    </button>
                    <div className="mt-1 text-[11px] text-slate-600 flex items-center gap-2">
                        <span className="bg-emerald-50 border border-emerald-500 px-2 py-[2px] rounded text-emerald-700">
                            In range
                        </span>
                        <span className="bg-rose-50 border border-rose-500 px-2 py-[2px] rounded text-rose-700">
                            Out of range
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}
// Inline style objects removed after Tailwind migration.
