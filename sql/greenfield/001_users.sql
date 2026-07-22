-- OttoLog GREENFIELD — fresh Supabase only (do not apply over live sql/001–019).
-- Apply sql/greenfield/*.sql in numeric order. See docs/Database_Outline.md.

-- Minimal auth profile for OttoLog (run in Supabase SQL editor).
-- Full schema / No Tool / Uncategorized seeds come later.

create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint users_username_unique unique (username)
);

alter table public.users enable row level security;

drop policy if exists "users_select_own" on public.users;
drop policy if exists "users_insert_own" on public.users;
drop policy if exists "users_update_own" on public.users;
drop policy if exists "users_select_username_availability" on public.users;

-- Read own row; also allow username lookups for signup availability
create policy "users_select_own"
  on public.users for select
  using (auth.uid() = id);

create policy "users_select_username_availability"
  on public.users for select
  using (true);

create policy "users_insert_own"
  on public.users for insert
  with check (auth.uid() = id);

create policy "users_update_own"
  on public.users for update
  using (auth.uid() = id)
  with check (auth.uid() = id);

-- Required when "Automatically expose new tables" is OFF (PostgREST needs table grants;
-- RLS still restricts rows). anon SELECT covers pre-auth username availability checks.
grant select, insert, update on public.users to authenticated;
grant select on public.users to anon;

-- Create profile even when email confirmation leaves the client without a session
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.users (id, username)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data->>'username'), ''),
      split_part(new.email, '@', 1)
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
