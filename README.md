# Lab Log

Simple flow:

1. Landing screen with sign in / sign up.
2. Auth via Supabase email + password.
3. Upload lab PDF or image.
4. OCR text (ocr.space) and send to `ask-ai` Edge Function to structure results.
5. Review side by side with original file and edit values inline.
6. Save structured JSON to `lab_results` table in Supabase.

Assumed table (create in SQL):

```sql
create table if not exists public.lab_results (
	id uuid primary key default gen_random_uuid(),
	user_id uuid references auth.users(id) on delete cascade,
	raw_text text,
	data_json jsonb,
	created_at timestamptz default now()
);
create index on public.lab_results (user_id, created_at desc);
```

Environment:

Create `lablog-frontend/.env` (or `.env.local`) and supply:

```
VITE_SUPABASE_URL=your_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```

Then update `src/supabase.tsx` to read from env if desired.

Dev:

```
cd lablog-frontend
npm install
npm run dev
```
