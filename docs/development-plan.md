# Book My Ride — Development Plan (v1)

> Working name **"Book My Ride"** (from PDF: *Hariwan Ashram Carpool*). The app name is a
> single configurable variable so it can be changed without touching UI code.

A simple, premium, low-cognitive-load ride-share board for an Art of Living community.
Users post rides to/from an **admin-defined event location** (e.g. *Hariwan Ashram*),
browse rides, request a seat, and coordinate offline by phone. **No payments, no in-app
chat, no live tracking** (per MVP scope).

---

## 1. Tech Stack

| Layer | Choice | Notes |
|---|---|---|
| Framework | **Next.js 15** (App Router, TypeScript, RSC + Server Actions) | Web app |
| Styling | **Tailwind CSS** + **shadcn/ui** (Radix) | Accessible primitives, fast to theme |
| Auth | **Supabase Auth** — Google OAuth only | Cookie sessions via `@supabase/ssr` |
| Database | **Supabase Postgres** + Row Level Security | Migrations in `supabase/migrations` |
| Storage | **Supabase Storage** | Mandatory profile photos |
| Maps | **Leaflet + react-leaflet + OpenStreetMap tiles**; **Nominatim** geocoding | No API key, no billing |
| Hosting | **Vercel** | Env-based config |
| Fonts | **Lexend** (headings) + **Source Sans 3** (body) | Trustworthy, highly readable (a11y) |

**Why these:** all free-tier friendly, no third-party billing to enable, and Supabase +
Vercel + Next.js is the lowest-friction path from zero to production for this scope.

---

## 2. Confirmed Product Decisions

1. **Maps** → Free Leaflet/OSM with a draggable pin + Nominatim search & reverse-geocode.
   No Google Cloud key or billing. (Attribution + request throttling required — see Risks.)
2. **Profile photo** → **Mandatory** before a user can post or request a ride (trust signal
   from the PDF). Upload from gallery; camera capture where the device supports it.
3. **Gender visibility** → Gender is shown **only to female users** on ride cards, and female
   users get a **"Women drivers only"** filter. Male users do not see gender on cards.
4. **Admin access** → **Email allowlist** (env var, mirrored to a DB table for RLS).
5. **Roles** → Single select on the profile: **Teacher / Volunteer / None** (PDF only had
   teacher; extended per request).
6. **Event locations** → Managed by Admin (name, address, lat/lng, Google Maps link,
   active flag). Rides attach to one event location and a direction (to/from).

---

## 3. Branding / Config (single source of truth)

`src/config/app.ts`
```ts
export const APP_CONFIG = {
  name: process.env.NEXT_PUBLIC_APP_NAME ?? "Book My Ride",
  tagline: "Share the drive. Arrive together.",
  supportPhone: process.env.NEXT_PUBLIC_SUPPORT_PHONE ?? "",
  supportWhatsApp: process.env.NEXT_PUBLIC_SUPPORT_WHATSAPP ?? "",
} as const;
```
Every user-facing surface (title bar, login, emails, footer) reads `APP_CONFIG.name`.
Changing the name later = one env var.

---

## 4. Data Model (Postgres)

```
profiles (1:1 auth.users)
  id uuid PK → auth.users.id
  full_name text
  email text
  avatar_url text            -- Google avatar (fallback)
  photo_url text             -- uploaded, REQUIRED to transact
  phone text                 -- REQUIRED
  gender  enum('male','female','other')
  role    enum('teacher','volunteer','none') default 'none'
  is_complete boolean        -- (phone is not null AND photo_url is not null)
  created_at / updated_at

event_locations
  id uuid PK
  name text                  -- "Hariwan Ashram"
  address text
  lat / lng numeric
  maps_url text
  is_active boolean default true
  created_at

rides
  id uuid PK
  driver_id uuid → profiles.id
  event_location_id uuid → event_locations.id
  direction enum('to_event','from_event')
  depart_date date
  depart_time time
  pickup_label text          -- short address / landmark
  pickup_lat / pickup_lng numeric
  seats_total int
  seats_available int
  show_phone_public boolean default false
  status enum('active','full','cancelled') default 'active'
  paired_ride_id uuid → rides.id   -- links the going & return posts
  created_at / updated_at

ride_requests
  id uuid PK
  ride_id uuid → rides.id
  rider_id uuid → profiles.id
  status enum('pending','approved','declined','cancelled') default 'pending'
  created_at / updated_at
  UNIQUE(ride_id, rider_id)

app_admins            -- mirrors the env allowlist for RLS
  email text PK
```

**"Two rides, one screen":** submitting the Post Ride form creates the going ride and (if
the return toggle is ON) a second `from_event` ride, cross-linked via `paired_ride_id`.
They are listed, managed, and cancelled independently — the user never feels the split.

---

## 5. Security / RLS + Sensitive-field Masking

- **RLS on every table.** Users read/write only their own `profiles`, `rides`, and
  `ride_requests`; drivers manage requests on their own rides.
- **Gender + phone are masked via a `SECURITY DEFINER` RPC** (`get_ride_cards(...)`) rather
  than exposing raw columns:
  - Gender is returned **only when the caller's own gender = 'female'**.
  - Driver phone is returned only if `show_phone_public = true`, **or** the caller has an
    **approved** request on that ride.
  - On approval, phone numbers are exchanged **both ways** (driver ↔ rider).
- Centralizing this in one RPC keeps the female-safety rule and phone-privacy rule in a
  single, testable place.
- Admin dashboard queries are gated server-side against the env allowlist **and** by RLS
  policies that check `auth.jwt()->>'email' IN (select email from app_admins)`.

> Open detail to confirm during build: in the **approve** flow the driver sees the
> requester's name + photo; whether the driver also sees the requester's *gender* there
> (the PDF implies yes) is a one-line policy choice. Default: show it in that 1:1 consent
> moment regardless of viewer gender.

---

## 6. Screens & Routes (7 screens from PDF)

| # | Route | Screen | Notes |
|---|---|---|---|
| 1 | `/login` | Login | Google sign-in only, brand hero |
| 2 | `/onboarding` | Complete Profile | Phone*, Photo* (upload/camera), Gender*, Role. Blocks transacting until complete |
| 3 | `/` | Home | *Find a Ride* / *Offer a Ride*, upcoming rides, **Contact Ride Admins** |
| 4 | `/rides/new` | Post Ride | Going + Return on one screen; return toggle ON by default; Leaflet pin |
| 5 | `/rides` + `/rides/[id]` | Ride List & Detail | Filter by direction + date; cards; Request Seat; women-only filter (female users) |
| 6 | `/my-rides` | My Rides | *Offered* tab (approve/decline, Mark Full) + *Requested* tab (status, Cancel) |
| 7 | `/admin` | Admin Dashboard | Rides, requests pending >24h (with driver phone), users, event-location CRUD |

**Middleware** guards routes: unauthenticated → `/login`; authenticated-but-incomplete →
`/onboarding`; non-admin hitting `/admin` → 404/home.

---

## 7. UX / Visual Design System

Derived from the `ui-ux-pro-max` skill (Flat Design, WCAG-AAA capable).

- **Style:** Flat, clean, typography-first, minimal shadows. Fast, calm, uncluttered.
- **Type:** Lexend (headings) / Source Sans 3 (body), base 16px, line-height 1.5.
- **Color tokens** (semantic, swappable — same philosophy as the app-name variable):
  - `--primary` calm indigo/violet · `--accent` confirm-green (`#16A34A`, WCAG-checked)
  - `--destructive` red · neutral muted/border grays · full **light + dark** support.
- **Low cognitive load principles baked in:**
  - One primary CTA per screen; secondary actions visually subordinate.
  - Progressive disclosure — Post Ride shows only 3 return fields when the toggle is on;
    nothing extra when off.
  - Smart defaults — return date = same day, drop-off = same pickup point, return toggle ON.
  - Inline validation on blur; errors beside the field; clear recovery text.
  - Trust cues front-and-center: photo, name, teacher/volunteer badge, seats filled/total.
  - Skeleton loaders, meaningful empty states, undo on destructive actions (cancel/decline).
- **Accessibility/interaction:** 44px+ touch targets, visible focus rings, `tel:` inputs,
  `prefers-reduced-motion` respected, 150–300ms transitions, mobile-first (375 → 1440).

---

## 8. Delivery Phases

Each phase is independently demoable.

- **Phase 0 — Scaffold:** Next.js + TS + Tailwind + shadcn, `APP_CONFIG`, design tokens,
  Supabase project + local env, `@supabase/ssr` clients, CI-less Vercel preview.
- **Phase 1 — Auth & Onboarding:** Google OAuth, `profiles` table + RLS, onboarding form
  (phone, photo upload to Storage, gender, role), route-guard middleware.
- **Phase 2 — Event Locations:** table + RLS + admin CRUD; seed *Hariwan Ashram*.
- **Phase 3 — Post Ride:** one-screen going+return, Leaflet pin + Nominatim search,
  two-rides creation, public-phone toggle.
- **Phase 4 — Browse & Request:** list + filters (direction/date), `get_ride_cards` RPC with
  gender/phone masking, women-only filter, detail page, Request Seat.
- **Phase 5 — Manage:** My Rides (Offered/Requested), approve/decline, Mark Full, cancel
  seat, phone exchange on approval.
- **Phase 6 — Contact Admins + Home polish:** tap-to-call + WhatsApp, upcoming-rides home.
- **Phase 7 — Admin Dashboard:** rides, pending>24h with driver phone, user list, locations.
- **Phase 8 — Polish & Ship:** a11y pass, responsive/empty/loading states, dark mode,
  Vercel production deploy + env.

---

## 9. Risks / Watch-list

- **Nominatim (free geocoding)** has strict rate limits + attribution requirements; must
  debounce search and add OSM attribution. If volume grows, revisit a paid geocoder.
- **Photo capture on desktop:** browsers can't force a camera; we use `<input capture>` on
  mobile and gallery upload everywhere. Add client-side image compression before upload.
- **Phone is self-reported** — no OTP verification (per PDF). Admins handle disputes.
- **Timezone:** store dates/times explicitly; render in IST.
- **Not in v1 (locked out on purpose):** payments, chat, tracking, ratings, multiple routes,
  matching algorithms, push campaigns.

---

## 10. Environment Variables

```
NEXT_PUBLIC_APP_NAME=Book My Ride
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=          # server only
ADMIN_EMAILS=a@x.com,b@x.com        # allowlist → seeds app_admins
NEXT_PUBLIC_SUPPORT_PHONE=
NEXT_PUBLIC_SUPPORT_WHATSAPP=
```
