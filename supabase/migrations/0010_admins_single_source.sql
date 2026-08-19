-- Make public.app_admins the single source of truth for admin access.
-- The /admin page gate and the header admin link now both check is_admin()
-- over RPC (instead of an ADMIN_EMAILS env var), so allow authenticated users
-- to call it. is_admin() is SECURITY DEFINER and only reads app_admins for the
-- caller's own JWT email, so this exposes no data.
grant execute on function public.is_admin() to authenticated;
