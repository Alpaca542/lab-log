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
        <div
            style={{
                padding: 40,
                maxWidth: 600,
                margin: "60px auto",
                background: "#fff",
                border: "1px solid #eee",
                borderRadius: 8,
            }}
        >
            <h2>Something went wrong.</h2>
            <pre
                style={{
                    whiteSpace: "pre-wrap",
                    background: "#f8f8f8",
                    padding: 12,
                    fontSize: 12,
                }}
            >
                {error.message}
            </pre>
            <button onClick={handleReload} style={{ padding: "10px 18px" }}>
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
