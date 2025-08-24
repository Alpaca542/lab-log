import { useState, useMemo } from "react";
import type { DashboardRow } from "./types";
import CategoryPanel from "./CategoryPanel";

interface SearchPanelProps {
    allData: DashboardRow[];
}

export default function SearchPanel({ allData }: SearchPanelProps) {
    const [query, setQuery] = useState("");
    const q = query.trim().toLowerCase();
    const filtered = useMemo(() => {
        if (!q) return [] as DashboardRow[];
        return allData.filter(
            (r) =>
                (r.test_name || "").toLowerCase().includes(q) ||
                (r.category || "").toLowerCase().includes(q)
        );
    }, [q, allData]);
    // Group filtered rows by test_name to feed into adapted rendering. We'll reuse CategoryPanel's per-test grouping logic by faking a combined category name.
    return (
        <div className="space-y-4">
            <div className="flex items-center gap-2">
                <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    placeholder="Search test or category..."
                    className="border rounded px-3 py-1 text-sm w-80"
                    aria-label="Search lab tests"
                />
                {q && (
                    <span className="text-xs text-slate-500">
                        {filtered.length} match
                        {filtered.length === 1 ? "" : "es"}
                    </span>
                )}
            </div>
            {!q && (
                <div className="text-xs text-slate-500">
                    Type to search across all tests and categories.
                </div>
            )}
            {q && filtered.length === 0 && (
                <div className="text-xs text-slate-500">No matches.</div>
            )}
            {q && filtered.length > 0 && (
                <div className="space-y-8">
                    {/* Reuse CategoryPanel layout semantics: we can mimic by instantiating one panel with synthetic category name */}
                    <CategoryPanel
                        category={`search: ${query}`}
                        rows={filtered}
                    />
                </div>
            )}
        </div>
    );
}
