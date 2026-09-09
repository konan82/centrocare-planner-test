# CentroCare Planner

Applicazione web per la pianificazione e la gestione dei turni dei tutor/tutori in un centro socio-educativo d'assistenza. Consente di organizzare la **settimana tipo** dei tutor, validarla sui turni reali, elaborare i consuntivi e calcolare le ore lavorate per le paghe.

## Funzionalità principali

- **Gestione ragazzi**: anagrafica completa con dati personali, esigenze, diagnosi, allergie, farmaci, scuola, genitori, referenti, uscite autorizzate e contratto.
- **Gestione tutor**: anagrafica, specializzazioni, requisiti (certificato penale, esperienza), min/max ore settimanali, giorni e fasce orarie di indisponibilità.
- **Pianificazione Turni**: settimana tipo (template) con durata di validità in settimane; il template viene propagato nelle settimane future e copiato nei turni reali.
- **Validazione Turni / Consuntivo**: orari effettivi di inizio/fine, note, stato dei turni (pianificato, effettuato, cancellato).
- **Calcolo ore e paghe**: tariffe (singola/doppia), settimane per mese, mesi completati; turni sovrapposti dello stesso tutor raggruppati e scomposti per validità nel calcolo paga.
- **Report PDF**: resoconti e calcolo paghe esportati in PDF.
- **Utenti e autorizzazioni**: accesso con email/password, profili con matrice dei permessi e modalità "convalida"; creazione/aggiornamento/eliminazione utenti tramite Edge Functions.
- **Log e presenza**: audit log delle operazioni, log degli accessi con dettagli di sessione e geolocalizzazione (città, regione, ISP, ASN) e presenza utenti in tempo reale (heartbeat).

## Stack tecnologico

- **Frontend**: React 19 + TypeScript, Vite 6, Tailwind CSS 4, [@dnd-kit](https://dnd-kit.com) per il drag & drop, date-fns, lucide-react, jsPDF + html-to-image per i PDF.
- **Backend / Dati**: [Supabase](https://supabase.com) — Postgres, Auth, Row Level Security, migrazioni SQL, Edge Functions (Deno).
- **Deploy**: Vercel (static frontend).

## Struttura del progetto

```
App.tsx                      Applicazione React a file singolo
index.tsx                    Entry point
types.ts                     Tipi TypeScript condivisi
constants.ts                 Costanti applicative
src/
  supabaseClient.ts          Client Supabase
  index.css                  Stili Tailwind
supabase/
  migrations/                Migrazioni SQL (schema, RLS, funzioni, trigger)
  functions/                 Edge Functions (create-user, update-user, delete-user, users-presence)
  config.toml                Configurazione locale Supabase
```

## Configurazione e avvio locale

**Prerequisiti:** Node.js

1. Installare le dipendenze:

   ```bash
   npm install
   ```

2. Creare un file `.env.local` con le credenziali del progetto Supabase:

   ```
   VITE_SUPABASE_URL=https://<ref>.supabase.co
   VITE_SUPABASE_ANON_KEY=<anon-key-pubblica>
   ```

3. Avviare in modalità sviluppo:

   ```bash
   npm run dev
   ```

   Build di produzione:

   ```bash
   npm run build
   ```

### Database e Edge Functions

- Le migrazioni in `supabase/migrations/` definiscono schema, indici, RLS, funzioni e trigger:

  ```bash
  npx supabase link --project-ref <ref>
  npx supabase db push
  ```

- Le Edge Functions si distribuiscono singolarmente:

  ```bash
  npx supabase functions deploy create-user
  npx supabase functions deploy update-user
  npx supabase functions deploy delete-user
  npx supabase functions deploy users-presence
  ```

  Le funzioni richiedono in ambiente la variabile `SUPABASE_SERVICE_ROLE_KEY`.

## Deployment

La build viene installata su Vercel. Ogni push sul ramo `main` attiva automaticamente la build di produzione. Le variabili d'ambiente richieste (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) devono essere configurate anche nel progetto Vercel.

## Note operative

- Alcune colonne (es. `access_logs.logout_reason`, `shifts.duration_weeks`) sono state aggiunte manualmente sul database di produzione e allineate tramite migrazioni idempotenti (`ADD COLUMN IF NOT EXISTS`): verificare l'allineamento dello schema in caso di installazioni non derivate dal dump di produzione.
- Il recupero della password invia la mail tramite il servizio SMTP configurato nel progetto Supabase.