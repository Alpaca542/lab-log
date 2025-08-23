import { PiWarningCircleLight } from "react-icons/pi";
import type { Severity } from "./types";

export default function SeverityPill({ severity }: { severity: Severity }) {
  if (severity === "in") return null;
  const base = severity === "slight" ? "bg-amber-50 text-amber-700 border-amber-300" : "bg-rose-50 text-rose-700 border-rose-300";
  const label = severity === "slight" ? "Slight" : "High";
  return (
    <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 text-[10px] rounded border font-medium ${base}`}>
      <PiWarningCircleLight className="w-3 h-3" /> {label}
    </span>
  );
}