import React from "react";
import { ErrorBoundary as ReactErrorBoundary } from "react-error-boundary";

interface ErrorFallbackProps {
    error: Error;
    resetErrorBoundary: () => void;
}

function ErrorFallback({ error, resetErrorBoundary }: ErrorFallbackProps) {
    const handleReload = () => {
        resetErrorBoundary();
        window.location.reload();
    };

    return (
        <div className="p-10 max-w-xl mx-auto mt-16 bg-white border border-gray-200 rounded-lg shadow-sm">
            <h2 className="text-xl font-semibold mb-4">
                Something went wrong.
            </h2>
            <pre className="whitespace-pre-wrap bg-gray-100 p-3 text-xs rounded mb-4 overflow-auto max-h-60">
                {error.message}
            </pre>
            <button
                onClick={handleReload}
                className="px-4 py-2 rounded bg-blue-600 text-white text-sm font-medium hover:bg-blue-700"
            >
                Reload
            </button>
        </div>
    );
}

interface ErrorBoundaryProps {
    children: React.ReactNode;
}

export default function ErrorBoundary({ children }: ErrorBoundaryProps) {
    return (
        <ReactErrorBoundary
            FallbackComponent={ErrorFallback}
            onError={(error, info) => {
                console.error("ErrorBoundary caught", error, info);
            }}
        >
            {children}
        </ReactErrorBoundary>
    );
}
