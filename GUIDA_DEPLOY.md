# Guida alla Pubblicazione Web (Deployment)

Per rendere la tua web app accessibile a tutti su internet, useremo **Render.com** (o un servizio simile come Railway/Vercel). Render è consigliato perché offre un piano gratuito e gestisce facilmente sia il Frontend (React) che il Backend (Node.js).

## Prerequisiti

1.  Un account **GitHub** (gratuito).
2.  Un account **Render.com** (gratuito, puoi accedere con GitHub).
3.  Il codice caricato su una repository GitHub.

---

## Passo 1: Caricare il codice su GitHub

Se non l'hai già fatto, devi caricare il tuo progetto su GitHub.
1.  Crea una nuova repository su GitHub (es. `centrocare-planner`).
2.  Apri il terminale nella cartella del progetto e esegui:
    ```bash
    git init
    git add .
    git commit -m "Primo commit"
    git branch -M main
    git remote add origin https://github.com/TUO_USERNAME/centrocare-planner.git
    git push -u origin main
    ```

---

## Passo 2: Pubblicare il Backend (Node.js)

Il backend è il "cervello" che parla con l'AI.

1.  Vai su **Render Dashboard** > **New +** > **Web Service**.
2.  Collega il tuo account GitHub e seleziona la repository `centrocare-planner`.
3.  Configura il servizio:
    *   **Name**: `centrocare-backend` (o simile)
    *   **Region**: Frankfurt (o quella più vicina)
    *   **Branch**: `main`
    *   **Root Directory**: `backend` (IMPORTANTE: perché il tuo server è in questa sottocartella)
    *   **Runtime**: Node
    *   **Build Command**: `npm install`
    *   **Start Command**: `node server.js`
4.  **Environment Variables** (Variabili d'ambiente):
    *   Clicca su "Advanced" o scorri fino a "Environment Variables".
    *   Aggiungi una chiave: `GOOGLE_API_KEY`
    *   Incolla il valore della tua chiave (quella che hai in `key.env`).
5.  Clicca **Create Web Service**.
6.  Attendi il deploy. Una volta finito, Render ti darà un URL (es. `https://centrocare-backend.onrender.com`). **Copialo**.

---

## Passo 3: Pubblicare il Frontend (React)

Il frontend è l'interfaccia grafica.

1.  Vai su **Render Dashboard** > **New +** > **Static Site**.
2.  Seleziona la stessa repository `centrocare-planner`.
3.  Configura il servizio:
    *   **Name**: `centrocare-frontend`
    *   **Branch**: `main`
    *   **Root Directory**: (lascia vuoto o `./`)
    *   **Build Command**: `npm install && npm run build`
    *   **Publish Directory**: `dist`
4.  **Environment Variables**:
    *   Aggiungi una chiave: `VITE_BACKEND_URL`
    *   Valore: L'URL del backend che hai copiato prima (es. `https://centrocare-backend.onrender.com`).
    *   *Nota: Non mettere lo slash finale `/`.*
5.  Clicca **Create Static Site**.

---

## Finito!

Render ti darà un URL per il frontend (es. `https://centrocare-frontend.onrender.com`).
Condividi questo link con chi vuoi: l'app è online!

### Note Importanti
*   **Costi**: Il piano gratuito di Render per il backend va in "sleep" dopo 15 minuti di inattività. La prima volta che lo apri dopo una pausa potrebbe metterci 30-50 secondi a rispondere. Per uso professionale serve il piano a pagamento (pochi euro al mese).
*   **Aggiornamenti**: Ogni volta che fai `git push` su GitHub, Render aggiornerà automaticamente il sito.
