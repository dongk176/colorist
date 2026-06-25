# Colori Supabase Setup

Supabase project:

```txt
Gaming
https://mvcprswvfybudtopepuj.supabase.co
```

1. Open Supabase SQL Editor or use Prisma `db execute`.
2. Run `supabase/colorist-pre-registration.sql`.
3. Add server-side env values to local/Vercel:

```txt
SUPABASE_URL=https://mvcprswvfybudtopepuj.supabase.co
DATABASE_URL=postgresql://...
```

The current write path uses `DATABASE_URL` from Next.js API routes. Do not expose it with a `NEXT_PUBLIC_` prefix.

For direct profile creation image uploads, add the same S3/CloudFront style env used by `no_dopamine`:

```txt
AWS_REGION=ap-northeast-2
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
S3_BUCKET=...
S3_APP_PREFIX=colorist/prod
CLOUDFRONT_URL=https://cdn.example.com
```

`CLOUDFRONT_URL` is optional. If it is empty, saved image URLs fall back to the public S3 object URL. Uploaded objects are written with long immutable cache headers.
