interface OcrOptions {
    apiKey?: string;
    language?: string;
    isOverlayRequired?: boolean;
    fileType?: string;
    isCreateSearchablePDF?: boolean;
    isSearchablePdfHideTextLayer?: boolean;
    detectOrientation?: boolean;
    isTable?: boolean;
    scale?: boolean;
    ocrEngine?: number;
    detectCheckbox?: boolean;
    checkboxTemplate?: number;
}

interface ParsedResult {
    TextOverlay: any;
    TextOrientation: string;
    FileParseExitCode: number;
    ParsedText: string;
    ErrorMessage: string;
    ErrorDetails: string;
}

interface OcrResponse {
    ParsedResults: ParsedResult[];
    OCRExitCode: number;
    IsErroredOnProcessing: boolean;
    ErrorMessage?: string;
    ErrorDetails?: string;
    ProcessingTimeInMilliseconds: string;
}

export const ocrSpace = async (
    input: string | File,
    options: OcrOptions = {}
): Promise<OcrResponse> => {
    const {
        apiKey = "K89498462088957",
        language = "eng",
        isOverlayRequired = false,
        fileType = ".Auto",
        isCreateSearchablePDF = false,
        isSearchablePdfHideTextLayer = true,
        detectOrientation = false,
        isTable = true,
        scale = true,
        ocrEngine = 2,
        detectCheckbox = false,
        checkboxTemplate = 0,
    } = options;

    const formData = new FormData();

    if (typeof input === "string") {
        if (input.startsWith("http")) {
            // Remote URL
            formData.append("url", input);
            formData.append("file", ""); // Empty file field for URL
        } else if (input.startsWith("data:")) {
            // Base64 image
            formData.append("base64Image", input);
            formData.append("file", ""); // Empty file field for base64
        } else {
            throw new Error(
                "Invalid input format. Expected URL or base64 data URI."
            );
        }
    } else if (input instanceof File) {
        // File object
        formData.append("file", input);
        formData.append("url", ""); // Empty URL field for file
    } else {
        throw new Error(
            "Invalid input type. Expected string (URL or base64) or File object."
        );
    }

    // Add all the form fields from the working example
    formData.append("language", language);
    formData.append("isOverlayRequired", isOverlayRequired.toString());
    formData.append("FileType", fileType);
    formData.append("IsCreateSearchablePDF", isCreateSearchablePDF.toString());
    formData.append(
        "isSearchablePdfHideTextLayer",
        isSearchablePdfHideTextLayer.toString()
    );
    formData.append("detectOrientation", detectOrientation.toString());
    formData.append("isTable", isTable.toString());
    formData.append("scale", scale.toString());
    formData.append("OCREngine", ocrEngine.toString());
    formData.append("detectCheckbox", detectCheckbox.toString());
    formData.append("checkboxTemplate", checkboxTemplate.toString());

    const response = await fetch("https://api8.ocr.space/parse/image", {
        method: "POST",
        headers: {
            accept: "application/json, text/javascript, */*; q=0.01",
            apikey: apiKey,
        },
        body: formData,
        mode: "cors",
        credentials: "omit",
    });

    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    const data: OcrResponse = await response.json();
    console.log("Response status:", data);
    if (data.IsErroredOnProcessing) {
        throw new Error(data.ErrorMessage || "OCR processing failed");
    }

    return data;
};
