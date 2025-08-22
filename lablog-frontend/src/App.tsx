import { useState } from "react";
import { ocrSpace } from "./utils/ocrService";

function App() {
    const [selectedFile, setSelectedFile] = useState<File | null>(null);
    const [ocrResult, setOcrResult] = useState<string>("");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string>("");

    const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            setSelectedFile(file);
            setError("");
            setOcrResult("");
        }
    };

    const processOCR = async () => {
        if (!selectedFile) {
            setError("Please select a file first");
            return;
        }

        setLoading(true);
        setError("");

        try {
            // Use our custom OCR service with the file directly
            const result = await ocrSpace(selectedFile, {
                apiKey: "K89498462088957",
                language: "eng",
            });

            if (result.ParsedResults && result.ParsedResults.length > 0) {
                setOcrResult(result.ParsedResults[0].ParsedText);
            } else {
                setError("No text found in the image");
            }
        } catch (err) {
            setError("Error processing OCR: " + (err as Error).message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <>
            <h1>OCR Demo with OCR.space API</h1>
            <div className="card">
                <div style={{ marginBottom: "20px" }}>
                    <input
                        type="file"
                        accept="image/*,.pdf"
                        onChange={handleFileSelect}
                        style={{ marginBottom: "10px" }}
                    />
                </div>

                <button
                    onClick={processOCR}
                    disabled={!selectedFile || loading}
                    style={{ marginBottom: "20px" }}
                >
                    {loading ? "Processing..." : "Extract Text"}
                </button>

                {error && (
                    <div style={{ color: "red", marginBottom: "20px" }}>
                        {error}
                    </div>
                )}

                {ocrResult && (
                    <div style={{ marginTop: "20px" }}>
                        <h3>Extracted Text:</h3>
                        <textarea
                            value={ocrResult}
                            readOnly
                            rows={10}
                            style={{ width: "100%", padding: "10px" }}
                        />
                    </div>
                )}
            </div>
        </>
    );
}

export default App;
