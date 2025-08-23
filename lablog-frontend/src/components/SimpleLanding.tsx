interface SimpleLandingProps {
    onSignIn: () => void;
}

export default function SimpleLanding({ onSignIn }: SimpleLandingProps) {
    return (
        <div
            style={{ maxWidth: 640, margin: "40px auto", textAlign: "center" }}
        >
            <h1 style={{ fontSize: 42, marginBottom: 12 }}>LabLog</h1>
            <p style={{ fontSize: 18, color: "#555", marginBottom: 28 }}>
                Upload lab results, extract values with AI, normalize units, and
                store securely.
            </p>
            <button
                onClick={onSignIn}
                style={{
                    padding: "14px 32px",
                    fontSize: 16,
                    cursor: "pointer",
                }}
            >
                Sign In / Sign Up
            </button>
        </div>
    );
}
