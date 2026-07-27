# Deploying to Vercel

## 1. Push the repo to GitHub

```bash
git add .
git commit -m "Book My Ride MVP"
git push
```

`.env.local` is git-ignored — your keys are **not** pushed. You'll set them in Vercel.

## 2. Import into Vercel

1. <https://vercel.com/new> → import the GitHub repo. Framework auto-detects **Next.js**.
2. Add **Environment Variables** (Project → Settings → Environment Variables):

   | Name | Value |
   |---|---|
   | `NEXT_PUBLIC_APP_NAME` | `Book My Ride` |
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://itubffdvqigyavkrhfok.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | *(anon key)* |
   | `SUPABASE_SERVICE_ROLE_KEY` | *(service role key)* |
   | `ADMIN_EMAILS` | `tech@merakiads.in` (comma-separated) |
   | `NEXT_PUBLIC_SUPPORT_PHONE` | *(ride-admin phone, optional)* |
   | `NEXT_PUBLIC_SUPPORT_WHATSAPP` | *(ride-admin WhatsApp, optional)* |

3. Deploy. You'll get a URL like `https://book-my-ride.vercel.app`.

## 3. Point auth at the production URL

Because login redirects through Supabase, add the production domain in **two** places:

- **Google Cloud Console** → your OAuth client → **Authorized JavaScript origins**:
  add `https://book-my-ride.vercel.app`.
- **Supabase** → Authentication → URL Configuration:
  - **Site URL** → `https://book-my-ride.vercel.app`
  - **Redirect URLs** → add `https://book-my-ride.vercel.app/**`

(The Google *redirect URI* stays `https://itubffdvqigyavkrhfok.supabase.co/auth/v1/callback`.)

## 4. Changing the app name later

It's a single variable — update `NEXT_PUBLIC_APP_NAME` in Vercel and redeploy. No code changes.

## Database migrations

Schema lives in `supabase/migrations/`. It's already applied to the live project. For future
changes, run the SQL in the Supabase SQL Editor (or via any Postgres client using the
**Session pooler** connection string from Project → Settings → Database).
