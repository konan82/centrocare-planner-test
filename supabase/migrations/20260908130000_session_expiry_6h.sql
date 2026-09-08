-- Scadenza automatica sessione a 6 ore di inattivita':
-- le sessioni che non inviano heartbeat da piu' di 6 ore vengono chiuse
-- nel log accessi con motivo 'scadenza' e le corrispondenti sessioni auth
-- vengono revocate, cosi' alla riapertura dell'app scatta un nuovo login.
-- Estende (sostituisce) la funzione public.close_expired_sessions().

create or replace function public.close_expired_sessions()
returns void
language plpgsql
security definer
set search_path = public, auth
as $$
begin
  -- 1) Sessioni eliminate (logout manuale) con motivo 'logout'
  update public.access_logs al
  set logout_time = now(), logout_reason = 'logout'
  where al.logout_time is null
    and not exists (select 1 from auth.sessions s where s.id = al.session_id);

  -- 2) Sessioni con not_after gia' superata con motivo 'scadenza'
  update public.access_logs al
  set logout_time = now(), logout_reason = 'scadenza'
  where al.logout_time is null
    and exists (
      select 1 from auth.sessions s
      where s.id = al.session_id
        and s.not_after is not null
        and s.not_after <= now()
    );

  -- 3) Sessioni inattive da piu' di 6 ore con motivo 'scadenza'.
  --    Grace period di 5 minuti dal login per non chiudere sessioni appena
  --    create prima dell'arrivo del primo heartbeat.
  update public.access_logs al
  set logout_time = now(), logout_reason = 'scadenza'
  where al.logout_time is null
    and al.login_time <= now() - interval '5 minutes'
    and not exists (
      select 1 from public.user_heartbeat hb
      where hb.user_id = al.user_id
        and hb.last_seen > now() - interval '6 hours'
    );

  -- 4) Revoca delle sessioni auth inattive da piu' di 6 ore. Il trigger
  --    trg_session_logout tenterebbe di marcare 'logout', ma le righe di log
  --    sono gia' chiuse con 'scadenza' (logout_time not null), quindi restano
  --    corrette. Al successivo accesso l'app forzera' un nuovo login.
  delete from auth.sessions s
  where s.created_at <= now() - interval '6 hours'
    and not exists (
      select 1 from public.user_heartbeat hb
      where hb.user_id = s.user_id
        and hb.last_seen > now() - interval '6 hours'
    );
end;
$$;