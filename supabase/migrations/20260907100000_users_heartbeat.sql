-- Heartbeat per presenza utenti online / ultimo accesso
-- Ogni utente aggiorna la propria riga ogni ~60s mentre l'app è aperta.
-- Online = last_seen aggiornato negli ultimi 3 minuti.

create table if not exists public.user_heartbeat (
  user_id uuid primary key references auth.users(id) on delete cascade,
  last_seen timestamptz not null default now()
);

alter table public.user_heartbeat enable row level security;

drop policy if exists "heartbeat own insert" on public.user_heartbeat;
create policy "heartbeat own insert" on public.user_heartbeat
  for insert with check (auth.uid() = user_id);

drop policy if exists "heartbeat own update" on public.user_heartbeat;
create policy "heartbeat own update" on public.user_heartbeat
  for update using (auth.uid() = user_id);

drop policy if exists "heartbeat read" on public.user_heartbeat;
create policy "heartbeat read" on public.user_heartbeat
  for select to authenticated using (true);