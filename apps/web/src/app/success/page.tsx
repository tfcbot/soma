import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Payment Complete",
};

// V1: human reassurance only. The CLI that initiated /v1/signup is polling
// /v1/signup/claim server-side and saves the key to ~/.workstation/config.json.
// The browser does not call the API (avoids cross-origin work for the V1 path).
export default function SuccessPage() {
  return (
    <main className="min-h-screen flex items-center justify-center px-4">
      <div className="max-w-lg w-full animate-fade-in">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-green-100 mb-6">
            <svg
              className="w-8 h-8 text-green-600"
              fill="none"
              viewBox="0 0 24 24"
              strokeWidth={2}
              stroke="currentColor"
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
            </svg>
          </div>
          <h1 className="text-2xl font-semibold text-ink mb-2">Payment Complete</h1>
          <p className="text-ink-muted">
            Return to your terminal — your credentials are being saved automatically.
          </p>
        </div>
        <p className="text-center text-xs text-ink-light mt-8">You can close this tab.</p>
      </div>
    </main>
  );
}
