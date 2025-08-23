import { useState, useEffect } from "react";
import { PiShieldCheckLight, PiHeartbeatLight } from "react-icons/pi";
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
        <div className="max-w-sm mx-auto p-8 border border-slate-200 rounded-2xl bg-white shadow-sm relative overflow-hidden animate-floatFade">
            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_30%_20%,rgba(37,99,235,0.08),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.06),transparent_65%)]" />
            <div className="relative">
                <h2 className="text-xl font-semibold mb-1 flex items-center gap-2 tracking-tight">
                    {mode === "signin" ? (
                        <PiHeartbeatLight className="w-5 h-5 text-blue-600" />
                    ) : (
                        <PiShieldCheckLight className="w-5 h-5 text-blue-600" />
                    )}{" "}
                    {mode === "signin" ? "Sign In" : "Create Account"}
                </h2>
                <p className="text-[11px] text-slate-500 mb-5">
                    Access your secure lab dashboard.
                </p>
                <form onSubmit={handleSubmit} className="space-y-5">
                    <label className="block text-xs font-semibold tracking-wide">
                        <span className="block mb-1">Email</span>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
                        />
                    </label>
                    <label className="block text-xs font-semibold tracking-wide">
                        <span className="block mb-1">Password</span>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full border rounded px-3 py-2 text-sm focus:outline-none focus:ring focus:ring-blue-200"
                        />
                    </label>
                    {error && (
                        <div className="text-red-600 text-xs">{error}</div>
                    )}
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full py-2.5 rounded-md bg-blue-600 text-white text-sm font-medium disabled:opacity-50 hover:bg-blue-700 transition shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                        {loading
                            ? "Please wait..."
                            : mode === "signin"
                            ? "Sign In"
                            : "Sign Up"}
                    </button>
                </form>
                <div className="mt-4 text-[11px] text-center text-gray-600">
                    {mode === "signin" ? (
                        <>
                            Need an account?{" "}
                            <button
                                type="button"
                                onClick={() => setMode("signup")}
                                className="text-blue-600 underline hover:text-blue-700"
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
                                className="text-blue-600 underline hover:text-blue-700"
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
                        className="mt-3 w-full py-2 rounded-md bg-slate-100 text-sm hover:bg-slate-200 transition"
                    >
                        Cancel
                    </button>
                )}
            </div>
        </div>
    );
}
