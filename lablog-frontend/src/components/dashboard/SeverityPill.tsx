import { PiWarningCircleLight, PiCheckCircleLight } from "react-icons/pi";
import type { Severity } from "./types";

interface SeverityPillProps {
    severity: Severity;
}
export default function SeverityPill({ severity }: SeverityPillProps) {
    let base: string;
    let label: string;
    let Icon: any;
    if (severity === "in") {
        base = "bg-emerald-50 text-emerald-700 border-emerald-300";
        label = "Fine";
        Icon = PiCheckCircleLight;
    } else if (severity === "slight") {
        base = "bg-amber-50 text-amber-700 border-amber-300";
        label = "Slight";
        Icon = PiWarningCircleLight;
    } else {
        base = "bg-rose-50 text-rose-700 border-rose-300";
        label = "High";
        Icon = PiWarningCircleLight;
    }
    return (
        <span
            className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border font-medium ${base}`}
            role="status"
            aria-label={`Severity ${label}`}
        >
            <Icon className="w-3 h-3" aria-hidden="true" /> {label}
        </span>
    );
}
