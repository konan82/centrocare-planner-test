import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ONLINE_WINDOW_MS = 3 * 60 * 1000; // online = heartbeat aggiornato negli ultimi 3 minuti

serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

    const { data: users, error: usersError } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 1000 });
    if (usersError) throw usersError;

    const { data: beats, error: beatsError } = await supabaseAdmin
      .from("user_heartbeat")
      .select("user_id, last_seen");
    if (beatsError) throw beatsError;

    const now = Date.now();
    const beatMap: Record<string, number> = {};
    (beats || []).forEach(b => {
      beatMap[b.user_id] = new Date(b.last_seen).getTime();
    });

    const presence = (users?.users || []).map(u => ({
      user_id: u.id,
      online: !!beatMap[u.id] && (now - beatMap[u.id] < ONLINE_WINDOW_MS),
      last_sign_in_at: u.last_sign_in_at || null,
    }));

    return new Response(JSON.stringify({ presence }), {
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