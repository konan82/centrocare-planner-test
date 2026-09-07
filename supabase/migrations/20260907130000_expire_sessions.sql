-- Marcatura della scadenza sessione nel log degli accessi.
-- 1) funzione che chiude le sessioni non piu' attive e marca il motivo
-- 2) trigger di scadenza su auth.sessions (aggiornamento not_after in passato)
-- 3) job pg_cron ogni minuto

create or replace function public.close_expired_sessions()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- Sessioni eliminate (logout) con motivo 'logout'
  update public.access_logs al
  set logout_time = now(), logout_reason = 'logout'
  where al.logout_time is null
    and not exists (select 1 from auth.sessions s where s.id = al.session_id);

  -- Sessioni con not_after gia' superata con motivo 'scadenza'
  update public.access_logs al
  set logout_time = now(), logout_reason = 'scadenza'
  where al.logout_time is null
    and exists (
      select 1 from auth.sessions s
      where s.id = al.session_id
        and s.not_after is not null
        and s.not_after <= now()
    );
end;
$$;

-- Trigger: quando una sessione viene aggiornata con not_after gia' passata (scadenza/expiry),
-- chiudi subito la relativa riga di log con motivo 'scadenza'.
create or replace function public.record_session_expiry()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  if new.not_after is not null and new.not_after <= now() then
    update public.access_logs
    set logout_time = now(), logout_reason = 'scadenza'
    where session_id = new.id and logout_time is null;
  end if;
  return new;
end;
$$;

drop trigger if exists trg_session_expiry on auth.sessions;
create trigger trg_session_expiry
after update of not_after on auth.sessions
for each row execute function public.record_session_expiry();

-- Job pg_cron ogni minuto: ripulisce le sessioni scadute in modo autonomo
select cron.schedule(
  'close-expired-sessions',
  '* * * * *',
  'select public.close_expired_sessions();'
);