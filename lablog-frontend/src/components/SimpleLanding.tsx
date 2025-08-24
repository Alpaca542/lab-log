import {
    PiHeartbeatLight,
    PiFlaskLight,
    PiShieldCheckLight,
} from "react-icons/pi";

interface SimpleLandingProps {
    onSignIn: () => void;
}

// A sharp, minimal, single-screen landing hero.
export default function SimpleLanding({ onSignIn }: SimpleLandingProps) {
    const features = [
        {
            icon: <PiFlaskLight className="w-5 h-5 text-blue-600" />,
            title: "AI Extraction",
            body: "OCR + LLM normalize panels, units & reference ranges automatically.",
        },
        {
            icon: <PiHeartbeatLight className="w-5 h-5 text-blue-600" />,
            title: "Trend Focused",
            body: "Surface only meaningful shifts & persistent outliers over time.",
        },
        {
            icon: <PiShieldCheckLight className="w-5 h-5 text-blue-600" />,
            title: "Private By Design",
            body: "Your data stays in your account. Delete anytime — no lock‑in.",
        },
    ];

    return (
        <div className="relative min-h-screen flex flex-col overflow-hidden bg-gradient-to-br from-white via-sky-50 to-blue-50">
            {/* Soft background shapes */}
            <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(circle_at_35%_35%,black,transparent_70%)]">
                <div className="absolute -top-32 -left-32 w-[46rem] h-[46rem] rounded-full bg-sky-100/40 blur-3xl" />
                <div className="absolute bottom-[-18rem] right-[-18rem] w-[40rem] h-[40rem] rounded-full bg-blue-100/40 blur-3xl" />
            </div>

            {/* Top Nav */}
            <header className="relative z-10 w-full">
                <nav className="mx-auto max-w-7xl px-6 py-5 flex items-center justify-between">
                    <div className="flex items-center gap-2 select-none">
                        <div className="h-8 w-8 rounded-md bg-gradient-to-br from-blue-600 to-sky-500 flex items-center justify-center text-white font-semibold text-xs shadow-sm">
                            LL
                        </div>
                        <span className="font-semibold text-slate-800 tracking-tight text-sm md:text-base">
                            MedLab
                        </span>
                    </div>
                    <button
                        onClick={onSignIn}
                        className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white/70 backdrop-blur px-4 py-2 text-xs font-medium text-slate-700 shadow-sm hover:bg-white hover:border-blue-400 focus:outline-none focus:ring-2 focus:ring-blue-500/40"
                    >
                        <PiShieldCheckLight className="w-4 h-4" /> Sign In
                    </button>
                </nav>
            </header>

            {/* Hero + Features */}
            <main className="relative z-10 flex-1 flex items-center">
                <div className="mx-auto w-full max-w-7xl px-6 py-10 md:py-0 grid md:grid-cols-12 gap-10 items-center">
                    {/* Text */}
                    <div className="md:col-span-6 lg:col-span-6 flex flex-col items-start">
                        <span className="inline-flex items-center gap-1.5 rounded-full border border-blue-200 bg-white/70 backdrop-blur px-3 py-1 text-[11px] font-medium text-blue-700 shadow-sm">
                            <PiShieldCheckLight className="w-3.5 h-3.5" />{" "}
                            Secure Personal Health Data
                        </span>
                        <h1 className="mt-6 text-4xl md:text-5xl lg:text-[3.2rem] font-bold leading-[1.05] tracking-tight text-slate-900">
                            Your Longitudinal Lab Companion
                        </h1>
                        <p className="mt-5 max-w-xl text-[15px] md:text-[16px] leading-relaxed text-slate-600">
                            Centralize lab reports, extract structured values
                            instantly, and watch how biomarkers evolve. Stay
                            ahead of silent shifts and act when it matters.
                        </p>
                        <div className="mt-8 flex flex-wrap items-center gap-4">
                            <button
                                onClick={onSignIn}
                                className="group inline-flex items-center gap-2 rounded-md bg-blue-600 px-7 py-3 text-sm font-medium text-white shadow-sm hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transition"
                            >
                                <PiHeartbeatLight className="w-5 h-5 transition-transform group-hover:scale-110" />
                                Get Started
                            </button>
                            <a
                                href="#features"
                                className="inline-flex items-center gap-2 rounded-md border border-slate-300 bg-white/70 px-7 py-3 text-sm font-medium text-slate-700 backdrop-blur hover:border-blue-400 hover:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition"
                            >
                                <PiFlaskLight className="w-5 h-5 text-blue-600" />{" "}
                                How it works
                            </a>
                        </div>
                        <div className="mt-6 flex items-center gap-6 text-[11px] text-slate-500">
                            <span>Encryption at rest</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>No data resale</span>
                            <span className="h-1 w-1 rounded-full bg-slate-300" />
                            <span>Delete anytime</span>
                        </div>
                    </div>

                    {/* Visual Placeholder */}
                    <div className="md:col-span-6 lg:col-span-6 relative">
                        <div className="relative mx-auto w-full max-w-md aspect-[4/3] rounded-2xl border border-slate-200/80 bg-white/70 backdrop-blur p-4 shadow-sm overflow-hidden">
                            <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_75%_20%,rgba(59,130,246,0.12),transparent_60%)]" />
                            <div className="flex flex-col h-full text-[11px]">
                                <div className="flex items-center gap-2 mb-3">
                                    <div className="h-2.5 w-2.5 rounded-full bg-rose-400" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-amber-400" />
                                    <div className="h-2.5 w-2.5 rounded-full bg-emerald-400" />
                                    <span className="ml-2 font-medium text-slate-500 tracking-wide">
                                        Lab Panel Trends
                                    </span>
                                </div>
                                {/* Fake chart lines */}
                                <div className="grid grid-cols-12 gap-2 mt-auto">
                                    {Array.from({ length: 12 }).map((_, i) => (
                                        <div
                                            key={i}
                                            className="relative flex items-end justify-center h-24"
                                            aria-hidden="true"
                                        >
                                            <div
                                                className="w-3 rounded-sm bg-gradient-to-t from-blue-200 to-blue-500"
                                                style={{
                                                    height: `${
                                                        30 + ((i * 13) % 55)
                                                    }%`,
                                                }}
                                            />
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                        <div className="absolute -bottom-6 -right-4 w-40 rounded-xl border border-blue-100 bg-white/80 backdrop-blur px-4 py-3 shadow-sm text-[10px] flex flex-col gap-1">
                            <span className="font-semibold text-slate-700">
                                Flagged Values
                            </span>
                            <div className="flex items-center justify-between text-slate-500">
                                <span>Ferritin</span>
                                <span className="font-medium text-amber-600">
                                    ⇧
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                                <span>TSH</span>
                                <span className="font-medium text-rose-600">
                                    ⇩
                                </span>
                            </div>
                            <div className="flex items-center justify-between text-slate-500">
                                <span>HDL</span>
                                <span className="font-medium text-emerald-600">
                                    ⇧
                                </span>
                            </div>
                        </div>
                    </div>
                </div>
            </main>

            {/* Feature strip */}
            <section
                id="features"
                aria-label="Key features"
                className="relative z-10 mt-4 pb-10 md:pb-12"
            >
                <div className="mx-auto max-w-7xl px-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        {features.map((f, i) => (
                            <div
                                key={i}
                                className="group relative overflow-hidden rounded-xl border border-slate-200 bg-white/80 backdrop-blur p-5 shadow-sm transition hover:shadow-md hover:border-blue-300"
                            >
                                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition bg-gradient-to-tr from-blue-50/70 to-sky-50" />
                                <div className="relative flex items-start gap-3">
                                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-50 ring-1 ring-blue-100">
                                        {f.icon}
                                    </div>
                                    <div className="text-sm">
                                        <h3 className="font-semibold text-slate-800 mb-1">
                                            {f.title}
                                        </h3>
                                        <p className="text-[11px] leading-relaxed text-slate-600">
                                            {f.body}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </section>

            {/* Footer (muted) */}
            <footer className="relative z-10 py-6 text-center text-[11px] text-slate-400">
                <span>
                    © {new Date().getFullYear()} MedLab. All rights reserved.
                </span>
            </footer>
        </div>
    );
}
