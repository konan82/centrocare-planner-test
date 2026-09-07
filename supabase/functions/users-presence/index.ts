import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ONLINE_WINDOW_MS = 3 * 60 * 1000; // online = heartbeat aggiornato negli ultimi 3 minuti
const SESSION_WINDOW_MS = 30 * 60 * 1000; // online anche se sessione auth aggiornata negli ultimi 30 minuti

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

    const userIds = (users?.users || []).map(u => u.id);
    const { data: beats, error: beatsError } = await supabaseAdmin
      .from("user_heartbeat")
      .select("user_id, last_seen");
    if (beatsError) throw beatsError;

    const { data: active, error: activeError } = await supabaseAdmin.rpc("last_active_for_users", { user_ids: userIds });
    if (activeError) throw activeError;

    const activeMap: Record<string, string> = {};
    (active || []).forEach((a: any) => {
      activeMap[a.user_id] = a.last_active_at;
    });

    const now = Date.now();
    const beatMap: Record<string, number> = {};
    (beats || []).forEach(b => {
      beatMap[b.user_id] = new Date(b.last_seen).getTime();
    });

    const presence = (users?.users || []).map(u => {
      const beat = !!beatMap[u.id] && (now - beatMap[u.id] < ONLINE_WINDOW_MS);
      const activeTs = activeMap[u.id] ? new Date(activeMap[u.id]).getTime() : 0;
      const sess = activeTs > 0 && (now - activeTs < SESSION_WINDOW_MS);
      return {
        user_id: u.id,
        online: beat || sess,
        last_sign_in_at: u.last_sign_in_at || null,
        last_active_at: activeMap[u.id] || null,
      };
    });

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