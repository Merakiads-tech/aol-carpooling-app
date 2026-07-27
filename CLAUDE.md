@AGENTS.md

# Book My Ride

Community carpooling web app. Full plan: `docs/development-plan.md`. Requirements:
`docs/mvp_requirement.pdf`.

## Stack

- **Next.js 16** (App Router) — note: `middleware.ts` is renamed to **`proxy.ts`** in v16,
  default Node.js runtime. Read `node_modules/next/dist/docs/` before using unfamiliar APIs.
- **Supabase** — Google Auth + Postgres + Storage. Clients in `src/lib/supabase/`.
- **Tailwind v4** + **shadcn/ui** (Radix). Tokens in `src/app/globals.css`, config
  `components.json`. Add components with `npx shadcn@latest add <name>`.
- **Leaflet + OpenStreetMap** + Nominatim for maps (no Google key).
- Fonts: **Lexend** (headings) + **Source Sans 3** (body).

## Conventions

- Brand name is `APP_CONFIG.name` (`src/config/app.ts`, env `NEXT_PUBLIC_APP_NAME`).
  Never hardcode the app name — always read from config.
- Design tokens are CSS variables in `globals.css` (indigo `--primary`, green `--success`,
  role badges `--teacher`/`--female`). Use semantic Tailwind classes (`bg-primary`), not raw hex.
- Sensitive-field rules (gender visible only to women; phone revealed on approval) live in
  a single `SECURITY DEFINER` RPC, not in ad-hoc queries.
- Env template: `.env.example`.
