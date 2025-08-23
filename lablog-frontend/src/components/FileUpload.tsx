import { useState, useEffect } from "react";
import { PiCloudArrowUpLight } from "react-icons/pi";

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
        <div className="relative group">
            <div className="border-2 border-dashed border-slate-300 group-hover:border-blue-400 transition p-6 rounded-xl bg-white shadow-sm flex flex-col items-center text-center gap-3">
                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-50 to-cyan-50 flex items-center justify-center text-blue-600">
                    <PiCloudArrowUpLight className="w-7 h-7" />
                </div>
                <p className="text-xs text-slate-600 max-w-xs leading-relaxed">
                    Upload a PDF or image of a lab report. We’ll run secure OCR
                    and AI extraction.
                </p>
                <label className="inline-flex cursor-pointer items-center gap-2 px-4 py-2 rounded-md text-sm font-medium border border-blue-600 text-blue-600 hover:bg-blue-600 hover:text-white transition">
                    <input
                        type="file"
                        accept={accept}
                        onChange={handleChange}
                        className="hidden"
                    />
                    <span>Select File</span>
                </label>
                {fileName && (
                    <div className="mt-1 text-[11px] text-slate-500 flex items-center gap-1">
                        <span className="font-medium text-slate-700">
                            Selected:
                        </span>{" "}
                        {fileName}
                    </div>
                )}
            </div>
            {previewUrl && (
                <div className="mt-4">
                    {previewUrl.endsWith(".pdf") ||
                    fileName.toLowerCase().endsWith(".pdf") ? (
                        <embed
                            src={previewUrl}
                            type="application/pdf"
                            width="100%"
                            height={400}
                            className="border rounded shadow-sm"
                        />
                    ) : (
                        <img
                            src={previewUrl}
                            alt="preview"
                            className="max-w-full max-h-[400px] rounded border shadow-sm object-contain"
                        />
                    )}
                </div>
            )}
        </div>
    );
}
