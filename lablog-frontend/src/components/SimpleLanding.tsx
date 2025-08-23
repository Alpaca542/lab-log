interface SimpleLandingProps {
    onSignIn: () => void;
}

export default function SimpleLanding({ onSignIn }: SimpleLandingProps) {
    return (
        <div className="max-w-2xl mx-auto mt-16 text-center px-4">
            <h1 className="text-5xl font-bold mb-3 tracking-tight">LabLog</h1>
            <p className="text-lg text-gray-600 mb-8">
                Upload lab results, extract values with AI, normalize units, and
                store securely.
            </p>
            <button
                onClick={onSignIn}
                className="px-8 py-3 text-base rounded border shadow-sm hover:bg-gray-100 transition"
            >
                Sign In / Sign Up
            </button>
        </div>
    );
}
