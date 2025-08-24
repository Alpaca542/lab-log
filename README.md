# Lab Log

Track, analyze, and act on longitudinal lab results with provenance‑aware reference ranges, trend detection, scheduling reminders, and full‑text search.

## Why

Personal lab reports arrive as PDFs/images. Manually transcribing values, remembering historical trends, and deciding when to re‑test is tedious and error‑prone. Lab Log automates:

1. OCR extraction of raw report text
2. AI structuring into normalized JSON (tests, values, units, categories, reference ranges, doctor specialty)
3. Reference range provenance (authentic vs AI‑inferred, with transparent marking)
4. Inclusive severity checks and trend analysis
5. Automatic scheduling tasks (follow‑ups) when results are out of range or trending sharply
6. Global search across all historical tests

## Key Concepts

| Term              | Meaning                                                                                                                                      |
| ----------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| Reference Range   | Normal interval for a test. Displayed exactly as parsed (original report style) but interpreted inclusively for comparisons.                 |
| AI‑Inferred Range | A range the AI supplies only if the report omits one. Marked with an asterisk (e.g. `3.5–5.1*`).                                             |
| Authentic Range   | A range explicitly present in any past or current report (not starred). Historical authentic ranges override starred ones for the same test. |
| Severity          | Out‑of‑range classification (e.g. low / high / far). Suppressed for purely qualitative (text) results.                                       |
| Schedule Item     | A task reminding you to re‑check a test. Reasons: `out_of_range`, `trend`, or `manual`.                                                      |

## Provenance & The Asterisk (\*)

The star is attached to the reference range value (not the measured value). Tooltip text explains it was inferred by AI because the original document lacked an explicit range. If later an authentic range is found, the star disappears for that test in all future displays.

## Features

-   PDF / image upload (OCR via external service)
-   AI extraction (Supabase Edge Function) → structured JSON schema
-   Doctor specialty inference stored with each batch
-   Reference range inference with historical authentic override & star provenance
-   Inclusive numeric comparisons (treat a ≤ value ≤ b even if original text shows a < x < b)
-   Trend detection (simple linear fit / recent deltas) for scheduling
-   Automatic task creation after each save
-   Search tab: filter by test name or category substring (case‑insensitive)
-   Inline star tooltips (no extra column clutter)
-   Qualitative result handling (excluded from numeric severity & trend logic)

## Architecture Overview

| Layer            | Tech                                            | Notes                                              |
| ---------------- | ----------------------------------------------- | -------------------------------------------------- |
| Frontend         | React + TypeScript + Vite + Tailwind            | UI, parsing, inclusive severity, charts (Recharts) |
| Backend Services | Supabase                                        | Auth, Postgres storage, edge function hosting      |
| Edge Function    | Deno / TypeScript (`supabase/functions/ask-ai`) | Calls AI model with strict JSON schema prompt      |
| OCR              | External API (ocr.space wrapper)                | Raw text extraction prior to AI structuring        |

### Data Flow

Upload → OCR text → Edge Function (AI) → JSON (tests + metadata) → Client post‑processing (range provenance/historical override) → Persist to Supabase → Dashboard (severity, trends, scheduling) → Search & visualization.

## Scheduling Logic

Auto‑creates tasks when:

1. A numeric value is out of (inclusive) range (reason: `out_of_range`).
2. A recent trend indicates a steep change likely to cross bounds (reason: `trend`).
   Manual tasks can be added separately (reason: `manual`). Normalization ensures legacy values map into these three canonical reasons.

## Search

Use the Search tab (sidebar) to filter across all historical entries by test name or category substring. Clearing the input shows all tests again. (Future enhancement: fuzzy matching & highlight.)

## Development Setup

Prerequisites: Node 18+ (or current LTS), pnpm or npm, Supabase project, API keys.

1. Install deps:
    - At repo root (backend deps, minimal): none beyond `@supabase/supabase-js` if used directly.
    - Frontend:
        ```
        cd lablog-frontend
        npm install
        npm run dev
        ```
2. Tailwind is already configured via the Vite plugin.
3. Supabase: create tables for lab results and schedule items (schema not included here—introspect from code or migrations if added later). Deploy edge function `ask-ai` from `supabase/functions/ask-ai`.
4. Environment variables (typical examples):
    - Frontend: `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`, `VITE_OCR_API_KEY`
    - Edge Function: `OPENAI_API_KEY` (or model provider key)
5. Start dev server: `npm run dev` inside `lablog-frontend` then open the shown local URL.

## Reference Range Handling Details

Parsing strips a trailing `*` before numeric math. Multiple textual formats are supported. Stored values preserve original formatting so the UI remains faithful to source while logic applies inclusive bounds.

## Qualitative Results

Strings (e.g. "Positive", "Negative", titer descriptions) bypass numeric severity & trend calculations and aren't considered for auto scheduling, preventing misleading alerts.

## Testing & Validation

Current project relies on manual verification (upload → compare → save → dashboard). Add automated tests as future enhancement (e.g., range parser, severity calculator, trend detector).

## Security & Privacy

-   Do not upload protected health information to third‑party services unless you have appropriate agreements (OCR + AI model providers).
-   API keys should be stored in `.env` (frontend uses Vite `import.meta.env` prefix) and Supabase secrets for edge functions.

## Roadmap (Optional Enhancements)

-   Fuzzy search & match highlighting
-   Global legend / help modal explaining provenance & scheduling
-   Test suite for range parsing & trend logic
-   Display transform of open interval text to inclusive form or explanatory tooltip
-   Export (CSV / JSON) & import utilities

## License

See `LICENSE` for details.

## Contributing

Small, focused PRs welcome. Please document new scheduling reasons or provenance markers clearly.

## Support

Open issues or feature requests in the repository tracker.

---

Star Legend: `*` = AI‑inferred (no explicit range in original source). Authenticated historical ranges take precedence automatically.
