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
        <div className="border border-dashed border-gray-500 p-4 rounded-lg bg-white">
            <input
                type="file"
                accept={accept}
                onChange={handleChange}
                className="text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white hover:file:bg-blue-700"
            />
            {fileName && (
                <div className="mt-2 text-xs text-gray-700">{fileName}</div>
            )}
            {previewUrl && (
                <div className="mt-4">
                    {previewUrl.endsWith(".pdf") ||
                    fileName.toLowerCase().endsWith(".pdf") ? (
                        <embed
                            src={previewUrl}
                            type="application/pdf"
                            width="100%"
                            height={400}
                            className="border rounded"
                        />
                    ) : (
                        <img
                            src={previewUrl}
                            alt="preview"
                            className="max-w-full max-h-[400px] rounded border object-contain"
                        />
                    )}
                </div>
            )}
        </div>
    );
}
