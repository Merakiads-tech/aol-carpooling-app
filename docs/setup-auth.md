# Enabling Google Login

Login is **Google-only**. Two dashboards need a one-time setup: **Google Cloud** (to create
OAuth credentials) and **Supabase** (to enable the provider + allow your app's URLs).

There are two different "callback" URLs — don't mix them up:

- **Google → Supabase:** `https://itubffdvqigyavkrhfok.supabase.co/auth/v1/callback`
  (goes in Google Cloud). Supabase owns this.
- **Supabase → your app:** `http://localhost:3000/auth/callback` (and your prod domain).
  This goes in Supabase's Redirect URLs allowlist. Our app code owns this.

---

## 1. Google Cloud Console

1. Go to <https://console.cloud.google.com> → create or pick a project.
2. **APIs & Services → OAuth consent screen**
   - User type: **External** → Create.
   - App name: **Book My Ride**; add your support + developer email.
   - Scopes: the defaults (`openid`, `email`, `profile`) are enough.
   - While in **Testing** mode, add the Google accounts that may sign in under
     **Test users** (or **Publish** the app to allow anyone).
3. **APIs & Services → Credentials → Create credentials → OAuth client ID**
   - Application type: **Web application**.
   - **Authorized JavaScript origins:**
     - `http://localhost:3000`
     - `https://<your-vercel-domain>` (add after deploying)
   - **Authorized redirect URIs:**
     - `https://itubffdvqigyavkrhfok.supabase.co/auth/v1/callback`
   - Create, then copy the **Client ID** and **Client secret**.

```
   Client ID: 735987597310-bc6jr0sg3bclsmet9ngp8kf80p9bke1i.apps.googleusercontent.com
   Client Secret: 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

```


## 2. Supabase Dashboard

1. **Authentication → Sign In / Providers → Google** → enable.
   - Paste the **Client ID** and **Client secret** from step 1 → Save.
2. **Authentication → URL Configuration**
   - **Site URL:** `http://localhost:3000` (change to your prod domain later).
   - **Redirect URLs** (add both):
     - `http://localhost:3000/**`
     - `https://<your-vercel-domain>/**` (after deploying)

That's it. Our app uses the PKCE flow (`exchangeCodeForSession`), which works with the
above out of the box.

---

## Test it

```bash
npm run dev
```

Open <http://localhost:3000> → you're redirected to `/login` → **Continue with Google** →
back to the app → **Complete your profile** (phone + photo + gender + role) → **Home**.

The first admin is seeded as `tech@merakiads.in` (from `ADMIN_EMAILS`). Change the allowlist
anytime in `.env.local` / your Vercel env.
