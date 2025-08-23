import { useState, useEffect } from "react";
import supabase from "../supabase";

interface AuthFrameProps {
    onAuthComplete: (session: any) => void;
    onCancel?: () => void;
}

// Minimal email/password auth (magic link could be added later)
export default function AuthFrame({
    onAuthComplete,
    onCancel,
}: AuthFrameProps) {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [mode, setMode] = useState<"signin" | "signup">("signin");
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        const { data: authListener } = supabase.auth.onAuthStateChange(
            (_evt: string, session: any) => {
                if (session) onAuthComplete(session);
            }
        );
        return () => {
            authListener.subscription.unsubscribe();
        };
    }, [onAuthComplete]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            if (mode === "signup") {
                const { error: signUpError, data } = await supabase.auth.signUp(
                    {
                        email,
                        password,
                    }
                );
                if (signUpError) throw signUpError;
                if (data.session) onAuthComplete(data.session);
            } else {
                const { error: signInError, data } =
                    await supabase.auth.signInWithPassword({
                        email,
                        password,
                    });
                if (signInError) throw signInError;
                if (data.session) onAuthComplete(data.session);
            }
        } catch (err: any) {
            setError(err.message || "Authentication failed");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div
            style={{
                maxWidth: 380,
                margin: "0 auto",
                padding: 24,
                border: "1px solid #ddd",
                borderRadius: 8,
            }}
        >
            <h2 style={{ marginTop: 0 }}>
                {mode === "signin" ? "Sign In" : "Create Account"}
            </h2>
            <form onSubmit={handleSubmit}>
                <label style={{ display: "block", marginBottom: 8 }}>
                    <span
                        style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        Email
                    </span>
                    <input
                        type="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </label>
                <label style={{ display: "block", marginBottom: 12 }}>
                    <span
                        style={{
                            display: "block",
                            fontSize: 12,
                            fontWeight: 600,
                        }}
                    >
                        Password
                    </span>
                    <input
                        type="password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        style={{ width: "100%", padding: 8, marginTop: 4 }}
                    />
                </label>
                {error && (
                    <div style={{ color: "red", marginBottom: 12 }}>
                        {error}
                    </div>
                )}
                <button
                    type="submit"
                    disabled={loading}
                    style={{ width: "100%", padding: 10 }}
                >
                    {loading
                        ? "Please wait..."
                        : mode === "signin"
                        ? "Sign In"
                        : "Sign Up"}
                </button>
            </form>
            <div style={{ marginTop: 12, fontSize: 12, textAlign: "center" }}>
                {mode === "signin" ? (
                    <>
                        Need an account?{" "}
                        <button
                            type="button"
                            onClick={() => setMode("signup")}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                        >
                            Sign Up
                        </button>
                    </>
                ) : (
                    <>
                        Have an account?{" "}
                        <button
                            type="button"
                            onClick={() => setMode("signin")}
                            style={{
                                background: "none",
                                border: "none",
                                color: "#2563eb",
                                cursor: "pointer",
                                textDecoration: "underline",
                            }}
                        >
                            Sign In
                        </button>
                    </>
                )}
            </div>
            {onCancel && (
                <button
                    type="button"
                    onClick={onCancel}
                    style={{
                        marginTop: 12,
                        width: "100%",
                        padding: 8,
                        background: "#f3f4f6",
                    }}
                >
                    Cancel
                </button>
            )}
        </div>
    );
}
