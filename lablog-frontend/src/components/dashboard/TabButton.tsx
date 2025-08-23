import React from "react";

interface TabButtonProps {
    label: string;
    active: boolean;
    onClick: () => void;
    icon?: React.ReactNode;
}

export default function TabButton({
    label,
    active,
    onClick,
    icon,
}: TabButtonProps) {
    return (
        <button
            className={`group text-left px-3 py-2 rounded-md text-sm capitalize border flex items-center gap-2 transition-all duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-blue-400/60 focus-visible:ring-offset-1 ${
                active
                    ? "bg-blue-600 text-white border-blue-600 shadow-sm"
                    : "bg-white hover:bg-blue-50 border-slate-300 hover:border-blue-400 text-slate-700"
            }`}
            onClick={onClick}
            aria-pressed={active}
            aria-label={`${label} tab`}
        >
            {icon && (
                <span
                    className={`transition-colors ${
                        active ? "text-white" : "text-blue-600"
                    }`}
                >
                    {icon}
                </span>
            )}
            <span className="font-medium tracking-wide">{label}</span>
        </button>
    );
}
// End TabButton component
