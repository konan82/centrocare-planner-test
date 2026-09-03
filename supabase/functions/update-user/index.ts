import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

function generateTempPassword(): string {
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnpqrstuvwxyz23456789";
  const parts: string[] = [];
  const crypto = globalThis.crypto;
  for (let i = 0; i < 3; i++) {
    let seg = "";
    for (let j = 0; j < 4; j++) {
      const buf = new Uint8Array(1);
      crypto.getRandomValues(buf);
      seg += chars[buf[0] % chars.length];
    }
    parts.push(seg);
  }
  return parts.join("-"); // es. "aB3k-pQ9x-Zw2m"
}

async function sendRecoveryEmail(
  resendApiKey: string,
  from: string,
  to: string,
  username: string,
  password: string
): Promise<void> {
  const body = {
    from,
    to: [to],
    subject: "CentroCare - Recupero credenziali",
    text: [
      "Ciao " + username + ",",
      "",
      "Hai richiesto il recupero delle credenziali dell'account CentroCare.",
      "",
      "Ecco le tue nuove credenziali di accesso:",
      "",
      "  Email: " + to,
      "  Password: " + password,
      "",
      "Ti consigliamo di cambiarle subito dopo il primo accesso, tramite la sezione Gestione Utenti.",
      "",
      "Se non hai richiesto tu questa operazione, contatta l'amministratore.",
    ].join("\n"),
  };

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: "Bearer " + resendApiKey,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error("Resend errore (" + res.status + "): " + text);
  }
}

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    const emailFrom = Deno.env.get("EMAIL_FROM") || "CentroCare <onboarding@resend.dev>";

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const { userId, newPassword, sendRecovery } = await req.json();
    if (!userId) throw new Error("userId mancante");

    const { data: authUser, error: getUserError } =
      await supabaseAdmin.auth.admin.getUserById(userId);
    if (getUserError) throw getUserError;
    if (!authUser?.user) throw new Error("Utente non trovato");

    // Email reale salvata nel profilo (sezione Gestione Utenti), altrimenti dagli app_metadata
    let profileEmail: string | null = null;
    const { data: profile } = await supabaseAdmin
      .from("profiles")
      .select("email")
      .eq("id", userId)
      .maybeSingle();
    if (profile?.email) profileEmail = profile.email;

    const metaEmail = profileEmail || authUser.user.user_metadata?.email || authUser.user.user_metadata?.real_email;
    const to = typeof metaEmail === "string" && metaEmail.includes("@") && !metaEmail.endsWith(".local")
      ? metaEmail
      : (authUser.user.email || "");

    const username = (authUser.user.user_metadata?.username as string) || authUser.user.email || userId;

    let effectivePassword: string | null = null;

    if (sendRecovery) {
      if (!resendApiKey) throw new Error("RESEND_API_KEY non configurata nel progetto Supabase");
      if (!to || !to.includes("@")) throw new Error("Nessuna email reale configurata per questo utente");
      effectivePassword = generateTempPassword();
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: effectivePassword,
        email_confirm: true,
      });
      if (upErr) throw upErr;
      await sendRecoveryEmail(resendApiKey, emailFrom, to, username, effectivePassword);
    } else if (typeof newPassword === "string" && newPassword.length > 0) {
      const { error: upErr } = await supabaseAdmin.auth.admin.updateUserById(userId, {
        password: newPassword,
      });
      if (upErr) throw upErr;
    } else {
      throw new Error("Manca newPassword o sendRecovery");
    }

    return new Response(JSON.stringify({ success: true, user: { id: userId, email: to } }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});