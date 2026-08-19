-- Grant admin to robin.gautam341@gmail.com.
-- Admin access has two gates that must BOTH include the email:
--   1. public.app_admins  — checked by is_admin() (admin RPCs + RLS). Seeded here.
--   2. ADMIN_EMAILS env    — checked by requireAdmin() for /admin page access.
--      Add the email there too (.env.local locally, Vercel env for production).

insert into public.app_admins (email) values ('robin.gautam341@gmail.com')
  on conflict (email) do nothing;
