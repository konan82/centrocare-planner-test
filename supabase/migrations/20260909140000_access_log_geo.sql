-- Dettagli geografici/IP nel log degli accessi (da API GeoIP esterna, salvati via RPC).
-- L'app arricchisce la riga della propria sessione al momento del login.

alter table public.access_logs
  add column if not exists city text,
  add column if not exists region text,
  add column if not exists country text,
  add column if not exists postal_code text,
  add column if not exists timezone text,
  add column if not exists utc_offset text,
  add column if not exists isp text,
  add column if not exists asn text;

-- RPC: l'utente autenticato registra i dettagli geo della propria sessione.
create or replace function public.access_logs_set_geo(
  p_session uuid,
  p_city text,
  p_region text,
  p_country text,
  p_postal text,
  p_timezone text,
  p_utc_offset text,
  p_isp text,
  p_asn text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  update public.access_logs
  set city = p_city,
      region = p_region,
      country = p_country,
      postal_code = p_postal,
      timezone = p_timezone,
      utc_offset = p_utc_offset,
      isp = p_isp,
      asn = p_asn
  where session_id = p_session
    and user_id = auth.uid()
    and (city is null and country is null and isp is null);
end;
$$;

grant execute on function public.access_logs_set_geo(uuid, text, text, text, text, text, text, text, text) to authenticated;