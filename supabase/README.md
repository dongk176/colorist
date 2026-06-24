# Colori Supabase Setup

Supabase project:

```txt
Gaming
https://mvcprswvfybudtopepuj.supabase.co
```

1. Open Supabase SQL Editor.
2. Run `supabase/colorist-pre-registration.sql`.
3. Add one of these keys to local/Vercel env:

```txt
SUPABASE_URL=https://mvcprswvfybudtopepuj.supabase.co
SUPABASE_ANON_KEY=your_anon_key
```

`SUPABASE_SERVICE_ROLE_KEY` also works because the insert runs inside a Next.js API route, but anon key is enough with the included insert-only RLS policy.
