-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Apply sql/greenfield/*.sql in numeric order. See docs/Database_Outline.md.

-- Self-service account deletion for OttoLog (run in Supabase SQL editor).
-- Deletes the current auth user; public.users cascades via FK.

drop function if exists public.delete_own_account();

create or replace function public.delete_own_account()
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  uid uuid := auth.uid();
begin
  if uid is null then
    raise exception 'Not authenticated';
  end if;

  delete from auth.users where id = uid;
end;
$$;

revoke all on function public.delete_own_account() from public;
grant execute on function public.delete_own_account() to authenticated;

-- Force PostgREST to reload RPC metadata so the app can call this immediately.
notify pgrst, 'reload schema';
