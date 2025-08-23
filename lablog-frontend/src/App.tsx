import { useState, useCallback } from "react";
import {
    PiHeartbeatLight,
    PiFlaskLight,
    PiCloudArrowUpLight,
    PiStethoscopeLight,
    PiSignOutLight,
    PiGaugeLight,
    PiPlusCircleLight,
    PiArrowCounterClockwiseLight,
    PiTrashSimpleLight,
} from "react-icons/pi";
import SimpleLanding from "./components/SimpleLanding";
import AuthFrame from "./components/AuthFrame";
import FileUpload, { type UploadFileInfo } from "./components/FileUpload";
import Compare, { type LabValueRow } from "./components/Compare";
import Dashboard from "./components/Dashboard";
import { ocrSpace } from "./utils/ocrService";
import supabase, { logout } from "./supabase";

type View = "landing" | "auth" | "setup" | "review" | "saved" | "dashboard";

function App() {
    const [view, setView] = useState<View>("landing");
    const [session, setSession] = useState<any>(null);
    const [fileInfo, setFileInfo] = useState<UploadFileInfo | null>(null);
    const [rawOcrText, setRawOcrText] = useState<string>("");
    const [rows, setRows] = useState<LabValueRow[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [statusMsg, setStatusMsg] = useState<string | null>(null);
    const [dashboardData, setDashboardData] = useState<any[]>([]);
    const [testDate, setTestDate] = useState<string>("");

    const Spinner = () => (
        <span className="inline-block w-4 h-4 border-2 border-blue-400 border-t-transparent rounded-full animate-spin" />
    );

    const startAuth = () => setView("auth");

    const handleAuthComplete = (s: any) => {
        setSession(s);
        setView("setup");
    };

    const handleFileSelected = (info: UploadFileInfo) => {
        setFileInfo(info);
        setRawOcrText("");
        setRows([]);
        setError(null);
    };

    const runOcrAndAI = async () => {
        if (!fileInfo) return;
        setLoading(true);
        setError(null);
        setStatusMsg("Running OCR...");
        try {
            const ocr = await ocrSpace(fileInfo.file, { language: "eng" });
            const parsed = ocr.ParsedResults?.[0]?.ParsedText || "";
            if (!parsed.trim()) throw new Error("No text extracted");
            setRawOcrText(parsed);
            setStatusMsg("Calling AI to structure data...");
            const { rows: structured, test_date } = await callAskAIForLabJSON(
                parsed
            );
            setRows(structured);
            setTestDate(test_date || "");
            setView("review");
        } catch (e: any) {
            setError(e.message || "Processing failed");
        } finally {
            setLoading(false);
            setStatusMsg(null);
        }
    };

    const callAskAIForLabJSON = async (
        raw: string
    ): Promise<{ rows: LabValueRow[]; test_date?: string }> => {
        // Build line-limited message; instruct consistent JSON.
        const lines = raw.split(/\r?\n/).filter((l) => l.trim());
        const prompt =
            `Extract structured lab test results and the overall test date from the input. Output ONLY JSON in this shape: {"test_date": "YYYY-MM-DD" or "", "results": [...]}

- test_date: Extract the most relevant specimen collection date in any format. If missing, use an empty string.
- results: List of items, each as {"test_name": string, "value": number, "unit": string, "reference_range": string, "category": string}
    - If value is missing or "not detected," return 0.
    - reference_range: Always use the format a<x<b, strict bounds. Convert all forms to this. If only a lower or upper limit, set missing bounds to 0 or 999999. If missing, use "NO_RANGE".
    - Normalize all units.
    - Only use category values: blood, metabolic, vision, hormonal, kidney, liver, lipid, vitamin, immune, other.
    - Simplify all test names to their core standardized names; expand abbreviations and remove location/specimen.
- If the tests are given together, it's highly probable they share the same category. 

Edge cases:
- If only one date is present but unlabeled, use it.
- Never invent missing fields or values.
- Always follow strict reference_range formatting.

Respond with a single JSON object matching ALL above rules. No explanation.

# Output Format

Return a single JSON object with fields exactly as described. No extra text.

# Example

Input:  
"Lab Panel – Collected May 12, 2023  
Alanine Aminotransferase (ALT) 32 IU/L (Norm: 7-56 IU/L)  
Serum Creatinine 1.02 mg/dL (Ref Range: 0.6–1.3)  
TSH 2.8 mIU/L (0.5-4.5)  
Vitamin B12 432 pg/mL  
White Blood Cells 8.1 x10^3/uL (Norm: 4.5–11.0)"

Output:  
{
  "test_date": "2023-05-12",
  "results": [
    {"test_name": "Alanine Aminotransferase", "value": 32, "unit": "IU/L", "reference_range": "7<x<56", "category": "liver"},
    {"test_name": "Creatinine", "value": 1.02, "unit": "mg/dL", "reference_range": "0.6<x<1.3", "category": "kidney"},
    {"test_name": "Thyroid Stimulating Hormone", "value": 2.8, "unit": "mIU/L", "reference_range": "0.5<x<4.5", "category": "hormonal"},
    {"test_name": "Vitamin B12", "value": 432, "unit": "pg/mL", "reference_range": "NO_RANGE", "category": "vitamin"},
    {"test_name": "White Blood Cells", "value": 8.1, "unit": "x10^3/uL", "reference_range": "4.5<x<11.0", "category": "blood"}
  ]
}

(Reminder: Only output the JSON object, strictly following field requirements and normalization rules.)

---

Your task: Parse input and output JSON matching all rules above. Do not add commentary. Respond only with the JSON.` +
            lines.slice(0, 300).join("\n");
        const { data, error } = await supabase.functions.invoke("ask-ai", {
            body: { message: prompt, model: "gpt-5-mini" },
        });
        if (error) throw error;
        const text: string = data?.response || "";
        // Attempt to locate JSON substring
        const match = text.match(/\{[\s\S]*\}$/);
        let jsonStr = match ? match[0] : text;
        try {
            const parsed = JSON.parse(jsonStr);
            const arr = Array.isArray(parsed) ? parsed : parsed.results;
            if (!Array.isArray(arr))
                throw new Error("JSON missing results array");
            const rows = arr.map((r: any) => {
                let rr = String(r.reference_range || r.ref || "").trim();
                // Normalize legacy / bad missing indicators
                if (!rr) {
                    // leave empty for now; we'll replace below if truly missing
                } else if (/^0\s*<\s*x\s*<\s*0$/i.test(rr)) {
                    rr = "NO_RANGE"; // treat 0<x<0 as missing sentinel
                }
                if (!rr) rr = "NO_RANGE"; // enforce sentinel for missing
                return {
                    test_name: String(r.test_name || r.name || ""),
                    value: String(r.value ?? r.val ?? 0),
                    unit: String(r.unit || ""),
                    reference_range: rr,
                    category: String(r.category || r.group || ""),
                };
            });
            // Override categories using existing historical categories when test name already known
            if (dashboardData && dashboardData.length) {
                const existingCategoryByName: Record<string, string> = {};
                dashboardData.forEach((d: any) => {
                    const n = (d.test_name || "")
                        .toString()
                        .trim()
                        .toLowerCase();
                    if (n && d.category && !existingCategoryByName[n]) {
                        existingCategoryByName[n] = d.category;
                    }
                });
                for (let i = 0; i < rows.length; i++) {
                    const key = rows[i].test_name.trim().toLowerCase();
                    if (existingCategoryByName[key]) {
                        rows[i].category = existingCategoryByName[key];
                    }
                }
            }
            return { rows, test_date: parsed.test_date || parsed.date };
        } catch (err) {
            console.error("Failed parsing AI output", text);
            throw new Error("AI JSON parse failed");
        }
    };

    const saveToDb = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        setError(null);
        try {
            const finalDate = testDate || new Date().toISOString().slice(0, 10);
            const datedRows = rows.map((r) => ({
                ...r,
                dateAdded: new Date().toISOString(),
                test_date: finalDate,
            }));
            const { error: insertError } = await supabase
                .from("lab_results")
                .insert({
                    user_id: session.user.id,
                    raw_text: rawOcrText,
                    data_json: datedRows,
                });
            if (insertError) throw insertError;
            setRows(datedRows);
            await loadDashboard();
            setView("dashboard");
        } catch (e: any) {
            setError(e.message || "Save failed");
        } finally {
            setLoading(false);
        }
    }, [session, rawOcrText, rows, testDate]);

    const loadDashboard = useCallback(async () => {
        if (!session) return;
        setLoading(true);
        try {
            const { data, error: fetchError } = await supabase
                .from("lab_results")
                .select("id, created_at, data_json")
                .order("created_at", { ascending: false })
                .limit(100);
            if (fetchError) throw fetchError;
            // Flatten into array with test_name + dateAdded
            const flat: any[] = [];
            (data || []).forEach((row: any) => {
                (row.data_json || []).forEach((d: any) => {
                    flat.push({
                        ...d,
                        parent_id: row.id,
                        created_at: row.created_at,
                        dateAdded: d.dateAdded || row.created_at,
                    });
                });
            });
            setDashboardData(flat);
        } catch (e: any) {
            setError(e.message || "Failed loading dashboard");
        } finally {
            setLoading(false);
        }
    }, [session]);

    const clearAllData = useCallback(async () => {
        if (!session) return;
        const confirmMsg = `This will permanently delete ALL saved lab results for this account.\n\nType DELETE to confirm.`;
        const input = window.prompt(confirmMsg, "");
        if (input !== "DELETE") return;
        setLoading(true);
        setError(null);
        try {
            const { error: delError } = await supabase
                .from("lab_results")
                .delete()
                .eq("user_id", session.user.id);
            if (delError) throw delError;
            setDashboardData([]);
        } catch (e: any) {
            setError(e.message || "Failed deleting data");
        } finally {
            setLoading(false);
        }
    }, [session]);

    return (
        <div className="min-h-screen bg-slate-50 text-slate-800 font-sans">
            <header className="sticky top-0 z-20 backdrop-blur bg-white/80 border-b border-slate-200 px-6 py-3 flex items-center justify-between shadow-sm">
                <div className="flex items-center gap-2">
                    <div className="w-9 h-9 rounded-lg bg-gradient-to-tr from-blue-600 to-cyan-500 flex items-center justify-center text-white shadow-md">
                        <PiHeartbeatLight className="w-5 h-5" />
                    </div>
                    <div className="leading-tight">
                        <div className="font-semibold text-lg tracking-tight">
                            LabLog
                        </div>
                        <div className="text-[11px] uppercase tracking-widest text-blue-600 font-medium">
                            Labs Tracker
                        </div>
                    </div>
                </div>
                {session && (
                    <nav className="flex items-center gap-2">
                        <button
                            className={`group inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-slate-300 hover:border-blue-500 hover:bg-blue-50 transition ${
                                view === "dashboard"
                                    ? "bg-blue-600 text-white border-blue-600 hover:bg-blue-600"
                                    : ""
                            }`}
                            onClick={() => {
                                loadDashboard();
                                setView("dashboard");
                            }}
                        >
                            <PiGaugeLight className="w-4 h-4 group-[&:not(.bg-blue-600)]:text-blue-600" />
                            <span>Dashboard</span>
                        </button>
                        <button
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded text-sm font-medium border border-slate-300 hover:border-red-500 hover:bg-red-50 transition"
                            onClick={() => {
                                logout();
                                setSession(null);
                                setView("landing");
                            }}
                        >
                            <PiSignOutLight className="w-4 h-4" /> Logout
                        </button>
                    </nav>
                )}
            </header>
            <main className="px-6 py-6">
                {view === "landing" && <SimpleLanding onSignIn={startAuth} />}
                {view === "auth" && (
                    <AuthFrame
                        onAuthComplete={handleAuthComplete}
                        onCancel={() => setView("landing")}
                    />
                )}
                {view === "setup" && (
                    <div className="max-w-[1000px] mx-auto grid lg:grid-cols-2 gap-8 items-start">
                        <div className="space-y-6">
                            <h2 className="text-2xl font-semibold flex items-center gap-2 tracking-tight">
                                <PiCloudArrowUpLight className="w-6 h-6 text-blue-600" />
                                Upload Lab Report
                            </h2>
                            <FileUpload onFileSelected={handleFileSelected} />
                            <div className="mt-2 flex gap-3 items-center text-sm">
                                <button
                                    className="inline-flex items-center gap-2 px-4 py-2 rounded-md border border-blue-600 text-blue-600 font-medium disabled:opacity-50 hover:bg-blue-600 hover:text-white transition"
                                    onClick={runOcrAndAI}
                                    disabled={!fileInfo || loading}
                                >
                                    <PiFlaskLight className="w-4 h-4" />
                                    {loading ? "Processing..." : "Run OCR + AI"}
                                </button>
                                {statusMsg && (
                                    <span className="text-xs text-slate-600">
                                        {statusMsg}
                                    </span>
                                )}
                            </div>
                            {error && (
                                <div className="text-red-600 mt-2 text-sm flex items-center gap-2">
                                    {error}
                                </div>
                            )}
                            {rawOcrText && (
                                <details className="mt-4 text-sm">
                                    <summary className="cursor-pointer font-medium flex items-center gap-2">
                                        <PiStethoscopeLight className="w-4 h-4 text-slate-600" />{" "}
                                        Raw OCR Text
                                    </summary>
                                    <pre className="whitespace-pre-wrap text-xs bg-slate-900/90 text-slate-100 p-3 rounded mt-2 max-h-72 overflow-auto ring-1 ring-slate-800">
                                        {rawOcrText}
                                    </pre>
                                </details>
                            )}
                        </div>
                        <div className="hidden lg:flex flex-col gap-4 pt-10 pr-4 text-sm text-slate-600">
                            <div className="p-4 rounded-lg bg-white shadow border border-blue-100">
                                <h4 className="font-semibold text-blue-700 mb-2 text-sm uppercase tracking-wide">
                                    Workflow
                                </h4>
                                <ol className="space-y-1 text-xs list-decimal list-inside">
                                    <li>Select file (PDF / image)</li>
                                    <li>OCR extracts raw text</li>
                                    <li>AI structures tests & ranges</li>
                                    <li>You review & edit values</li>
                                    <li>Save into secure dashboard</li>
                                </ol>
                            </div>
                            <div className="p-4 rounded-lg bg-gradient-to-br from-cyan-50 to-blue-50 border border-cyan-100">
                                <p className="text-xs leading-relaxed">
                                    Keep your longitudinal lab metrics
                                    organized. Identify out-of-range or steep
                                    trends and schedule follow-ups
                                    automatically.
                                </p>
                            </div>
                        </div>
                    </div>
                )}
                {view === "review" && fileInfo && (
                    <div className="max-w-[1300px] mx-auto">
                        <h2 className="text-2xl font-semibold mb-6 flex items-center gap-2 tracking-tight">
                            <PiStethoscopeLight className="w-6 h-6 text-blue-600" />{" "}
                            Review Extracted Values
                        </h2>
                        {error && (
                            <div className="text-red-600 mb-3 text-sm">
                                {error}
                            </div>
                        )}
                        <div className="flex gap-4 items-center mb-3 text-xs">
                            <label className="flex items-center gap-1">
                                <span className="font-medium">Test Date:</span>
                                <input
                                    type="date"
                                    value={testDate}
                                    max={new Date().toISOString().slice(0, 10)}
                                    onChange={(e) =>
                                        setTestDate(e.target.value)
                                    }
                                    className="border rounded px-2 py-1"
                                />
                            </label>
                            {!testDate && (
                                <span className="text-red-600">
                                    No date detected - please set or use today
                                </span>
                            )}
                            {!testDate && (
                                <button
                                    type="button"
                                    onClick={() =>
                                        setTestDate(
                                            new Date()
                                                .toISOString()
                                                .slice(0, 10)
                                        )
                                    }
                                    className="px-3 py-1 border rounded text-xs hover:bg-gray-100"
                                >
                                    Use Today
                                </button>
                            )}
                        </div>
                        <Compare
                            originalFileUrl={fileInfo.objectUrl}
                            rows={rows}
                            onChange={setRows}
                            onConfirm={saveToDb}
                            disabled={loading || rows.length === 0 || !testDate}
                        />
                        <button
                            className="mt-4 inline-flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-slate-100 text-sm"
                            onClick={() => setView("setup")}
                        >
                            <PiArrowCounterClockwiseLight className="w-4 h-4" />{" "}
                            Back
                        </button>
                    </div>
                )}
                {view === "dashboard" && (
                    <div className="max-w-[1400px] mx-auto">
                        <div className="flex flex-wrap items-center gap-3 mb-6">
                            <h2 className="text-2xl font-semibold flex items-center gap-2 tracking-tight">
                                <PiGaugeLight className="w-6 h-6 text-blue-600" />
                                Dashboard {loading && <Spinner />}
                            </h2>
                            <div className="flex items-center gap-2 ml-auto">
                                <button
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition"
                                    onClick={() => setView("setup")}
                                >
                                    <PiPlusCircleLight className="w-4 h-4" />{" "}
                                    Add Result
                                </button>
                                <button
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-slate-300 hover:border-blue-500 hover:bg-blue-50 disabled:opacity-50 transition"
                                    onClick={loadDashboard}
                                    disabled={loading}
                                >
                                    <PiArrowCounterClockwiseLight className="w-4 h-4" />{" "}
                                    Refresh
                                </button>
                                <button
                                    className="inline-flex items-center gap-1.5 px-3 py-2 rounded-md text-sm font-medium border border-red-600 text-red-600 hover:bg-red-600 hover:text-white disabled:opacity-40 transition"
                                    onClick={clearAllData}
                                    disabled={loading || !dashboardData.length}
                                    title="Delete all saved lab results"
                                >
                                    <PiTrashSimpleLight className="w-4 h-4" />{" "}
                                    Clear All
                                </button>
                            </div>
                        </div>
                        <div className="rounded-xl border border-slate-200 bg-white/70 backdrop-blur-sm shadow-sm p-4 ring-1 ring-slate-100">
                            <Dashboard
                                data={dashboardData}
                                userId={session?.user.id}
                            />
                        </div>
                    </div>
                )}
            </main>
        </div>
    );
}

export default App;
