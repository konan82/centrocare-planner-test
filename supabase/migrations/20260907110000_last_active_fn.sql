-- Restituisce l'attivita' piu' recente (max auth.sessions.updated_at) per ogni utente.
create or replace function public.last_active_for_users(user_ids uuid[])
returns table (user_id uuid, last_active_at timestamptz)
language sql
security definer
set search_path = auth, public
as $$
  select s.user_id as user_id, max(s.updated_at) as last_active_at
  from auth.sessions s
  where s.user_id = any(user_ids)
  group by s.user_id
$$;

revoke all on function public.last_active_for_users(uuid[]) from public, anon, authenticated;
grant execute on function public.last_active_for_users(uuid[]) to service_role;