-- Log degli accessi utenti.
-- Le sessioni Supabase (auth.sessions) registrano login (created_at, ip, user_agent)
-- e vengono eliminate al logout. Due trigger li specchiano in public.access_logs.

create table if not exists public.access_logs (
  id uuid primary key default gen_random_uuid(),
  session_id uuid,
  user_id uuid not null references auth.users(id) on delete cascade,
  login_time timestamptz not null default now(),
  logout_time timestamptz,
  ip_address text,
  user_agent text
);

create index if not exists access_logs_user_idx on public.access_logs(user_id);
create index if not exists access_logs_login_idx on public.access_logs(login_time desc);
create index if not exists access_logs_session_idx on public.access_logs(session_id);

alter table public.access_logs enable row level security;

-- Trigger: nuovo login (INSERT su auth.sessions) -> riga access_logs
create or replace function public.record_session_login()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  insert into public.access_logs (session_id, user_id, login_time, ip_address, user_agent)
  values (new.id, new.user_id, coalesce(new.created_at, now()), new.ip::text, new.user_agent)
  on conflict do nothing;
  return new;
end;
$$;

drop trigger if exists trg_session_login on auth.sessions;
create trigger trg_session_login
after insert on auth.sessions
for each row execute function public.record_session_login();

-- Trigger: logout (DELETE su auth.sessions) -> compila logout_time
create or replace function public.record_session_logout()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  update public.access_logs
  set logout_time = now(), logout_reason = 'logout'
  where session_id = old.id and logout_time is null;
  return old;
end;
$$;

drop trigger if exists trg_session_logout on auth.sessions;
create trigger trg_session_logout
after delete on auth.sessions
for each row execute function public.record_session_logout();

-- RLS: solo gli admin leggono il log
drop policy if exists "access_logs read admin" on public.access_logs;
create policy "access_logs read admin" on public.access_logs
  for select to authenticated
  using (auth.uid() in (select id from public.profiles where permissions ? 'ALL'));