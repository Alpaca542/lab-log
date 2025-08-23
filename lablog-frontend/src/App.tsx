import { useState, useCallback } from "react";
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

    const Spinner = () => <span className="spinner" />;

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

    return (
        <div style={{ padding: 24, fontFamily: "sans-serif" }}>
            <style>{`@keyframes spin {from {transform: rotate(0deg);} to {transform: rotate(360deg);}}`}</style>
            <div
                style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: 12,
                }}
            >
                <strong>LabLog</strong>
                {session && (
                    <div
                        className="flex gap-sm"
                        style={{ alignItems: "center" }}
                    >
                        <button
                            onClick={() => {
                                loadDashboard();
                                setView("dashboard");
                            }}
                        >
                            Dashboard
                        </button>
                        <button
                            onClick={() => {
                                logout();
                                setSession(null);
                                setView("landing");
                            }}
                        >
                            Logout
                        </button>
                    </div>
                )}
            </div>
            {view === "landing" && <SimpleLanding onSignIn={startAuth} />}
            {view === "auth" && (
                <AuthFrame
                    onAuthComplete={handleAuthComplete}
                    onCancel={() => setView("landing")}
                />
            )}
            {view === "setup" && (
                <div style={{ maxWidth: 900, margin: "0 auto" }}>
                    <h2>Upload Lab Report</h2>
                    <FileUpload onFileSelected={handleFileSelected} />
                    <div style={{ marginTop: 16, display: "flex", gap: 12 }}>
                        <button
                            onClick={runOcrAndAI}
                            disabled={!fileInfo || loading}
                        >
                            {loading ? "Processing..." : "Run OCR + AI"}
                        </button>
                        {statusMsg && (
                            <span style={{ fontSize: 12 }}>{statusMsg}</span>
                        )}
                    </div>
                    {error && (
                        <div style={{ color: "red", marginTop: 12 }}>
                            {error}
                        </div>
                    )}
                    {rawOcrText && (
                        <details style={{ marginTop: 16 }}>
                            <summary style={{ cursor: "pointer" }}>
                                Raw OCR Text
                            </summary>
                            <pre
                                style={{
                                    whiteSpace: "pre-wrap",
                                    fontSize: 12,
                                    background: "#f8f8f8",
                                    padding: 8,
                                }}
                            >
                                {rawOcrText}
                            </pre>
                        </details>
                    )}
                </div>
            )}
            {view === "review" && fileInfo && (
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <h2>Review Extracted Values</h2>
                    {error && (
                        <div style={{ color: "red", marginBottom: 12 }}>
                            {error}
                        </div>
                    )}
                    <div
                        style={{
                            display: "flex",
                            gap: 16,
                            alignItems: "center",
                            marginBottom: 12,
                        }}
                    >
                        <label style={{ fontSize: 12 }}>
                            Test Date:{" "}
                            <input
                                type="date"
                                value={testDate}
                                max={new Date().toISOString().slice(0, 10)}
                                onChange={(e) => setTestDate(e.target.value)}
                            />
                        </label>
                        {!testDate && (
                            <span style={{ fontSize: 12, color: "#dc2626" }}>
                                No date detected - please set or use today
                            </span>
                        )}
                        {!testDate && (
                            <button
                                type="button"
                                onClick={() =>
                                    setTestDate(
                                        new Date().toISOString().slice(0, 10)
                                    )
                                }
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
                        style={{ marginTop: 16 }}
                        onClick={() => setView("setup")}
                    >
                        Back
                    </button>
                </div>
            )}
            {view === "dashboard" && (
                <div style={{ maxWidth: 1200, margin: "0 auto" }}>
                    <h2>Your Lab Dashboard {loading && <Spinner />}</h2>
                    <button
                        onClick={() => setView("setup")}
                        style={{ marginBottom: 12 }}
                    >
                        Add New Result
                    </button>
                    <button
                        onClick={loadDashboard}
                        disabled={loading}
                        style={{ marginLeft: 8 }}
                    >
                        Refresh
                    </button>
                    {error && (
                        <div style={{ color: "red", marginTop: 8 }}>
                            {error}
                        </div>
                    )}
                    <Dashboard data={dashboardData} />
                </div>
            )}
        </div>
    );
}

export default App;
