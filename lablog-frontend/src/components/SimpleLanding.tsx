import {
    PiHeartbeatLight,
    PiFlaskLight,
    PiShieldCheckLight,
} from "react-icons/pi";

interface SimpleLandingProps {
    onSignIn: () => void;
}

export default function SimpleLanding({ onSignIn }: SimpleLandingProps) {
    return (
        <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-0 opacity-40 bg-[radial-gradient(circle_at_20%_20%,rgba(56,189,248,0.20),transparent_60%),radial-gradient(circle_at_80%_70%,rgba(59,130,246,0.18),transparent_65%)]" />
            <div className="max-w-6xl mx-auto pt-24 pb-28 px-6 flex flex-col items-center text-center relative">
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-white/70 backdrop-blur border border-blue-200 text-blue-700 text-[11px] font-medium shadow-sm animate-floatFade">
                    <PiShieldCheckLight className="w-4 h-4" /> Secure Personal
                    Health Data
                </div>
                <h1 className="mt-8 text-5xl md:text-6xl font-bold tracking-tight bg-gradient-to-tr from-slate-900 via-slate-700 to-slate-500 text-transparent bg-clip-text mb-6 leading-[1.05]">
                    Your Longitudinal Lab Companion
                </h1>
                <p className="max-w-3xl text-[17px] md:text-lg text-slate-600 leading-relaxed mb-12">
                    Upload reports, let AI extract and normalize results,
                    visualize trends, and schedule follow‑ups for critical
                    changes.
                </p>
                <div className="flex flex-wrap justify-center gap-4 mb-16">
                    <button
                        onClick={onSignIn}
                        className="group inline-flex items-center gap-2 px-8 py-3 rounded-md bg-blue-600 text-white font-medium shadow hover:bg-blue-700 transition text-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 animate-pulseBorder"
                    >
                        <PiHeartbeatLight className="w-5 h-5 transition-transform group-hover:scale-110" />{" "}
                        Get Started
                    </button>
                    <a
                        href="#workflow"
                        className="inline-flex items-center gap-2 px-8 py-3 rounded-md border border-slate-300 bg-white/80 backdrop-blur font-medium shadow-sm hover:border-blue-500 hover:bg-blue-50 transition text-sm"
                    >
                        <PiFlaskLight className="w-5 h-5 text-blue-600" /> How
                        it Works
                    </a>
                </div>
                <div
                    className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full"
                    id="workflow"
                >
                    {[
                        {
                            icon: (
                                <PiFlaskLight className="w-6 h-6 text-blue-600" />
                            ),
                            title: "AI Extraction",
                            body: "OCR + AI structure your tests and reference ranges with standard categories.",
                        },
                        {
                            icon: (
                                <PiHeartbeatLight className="w-6 h-6 text-blue-600" />
                            ),
                            title: "Actionable Alerts",
                            body: "See only the latest out‑of‑range values; outdated anomalies are auto‑suppressed.",
                        },
                        {
                            icon: (
                                <PiShieldCheckLight className="w-6 h-6 text-blue-600" />
                            ),
                            title: "Private & Secure",
                            body: "Your data stays protected in your account – delete everything anytime.",
                        },
                    ].map((c, i) => (
                        <div
                            key={i}
                            className="group p-5 rounded-xl border border-slate-200 bg-white/90 backdrop-blur-sm shadow-sm text-left flex gap-4 relative overflow-hidden transition hover:shadow-md hover:border-blue-300"
                        >
                            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-br from-blue-50/60 to-cyan-50/40" />
                            <div className="relative shrink-0 w-12 h-12 rounded-lg bg-blue-50 flex items-center justify-center ring-1 ring-blue-100 group-hover:scale-105 transition">
                                {c.icon}
                            </div>
                            <div className="relative text-sm">
                                <h3 className="font-semibold text-slate-800 mb-1">
                                    {c.title}
                                </h3>
                                <p className="text-slate-600 leading-relaxed text-[11px]">
                                    {c.body}
                                </p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
}
