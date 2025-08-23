import { useState, useEffect } from "react";

export interface UploadFileInfo {
    file: File;
    objectUrl: string;
    textContent?: string; // optionally hold OCR raw text
}

interface FileUploadProps {
    onFileSelected: (info: UploadFileInfo) => void;
    accept?: string;
}

export default function FileUpload({
    onFileSelected,
    accept = "application/pdf,image/*",
}: FileUploadProps) {
    const [previewUrl, setPreviewUrl] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string>("");

    useEffect(() => {
        return () => {
            if (previewUrl) URL.revokeObjectURL(previewUrl);
        };
    }, [previewUrl]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        const url = URL.createObjectURL(file);
        setPreviewUrl(url);
        setFileName(file.name);
        onFileSelected({ file, objectUrl: url });
    };

    return (
        <div
            style={{ border: "1px dashed #999", padding: 16, borderRadius: 8 }}
        >
            <input type="file" accept={accept} onChange={handleChange} />
            {fileName && (
                <div style={{ marginTop: 8, fontSize: 12 }}>{fileName}</div>
            )}
            {previewUrl && (
                <div style={{ marginTop: 16 }}>
                    {previewUrl.endsWith(".pdf") ||
                    fileName.toLowerCase().endsWith(".pdf") ? (
                        <embed
                            src={previewUrl}
                            type="application/pdf"
                            width="100%"
                            height={400}
                        />
                    ) : (
                        <img
                            src={previewUrl}
                            alt="preview"
                            style={{ maxWidth: "100%", maxHeight: 400 }}
                        />
                    )}
                </div>
            )}
        </div>
    );
}
