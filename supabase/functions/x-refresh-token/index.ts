import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("X_CLIENT_ID");
    const clientSecret = Deno.env.get("X_CLIENT_SECRET");
    if (!clientId) throw new Error("X_CLIENT_ID is not configured");
    if (!clientSecret) throw new Error("X_CLIENT_SECRET is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Find all X connections with expired or soon-to-expire tokens
    const bufferMinutes = 5;
    const bufferTime = new Date(Date.now() + bufferMinutes * 60 * 1000).toISOString();

    const { data: expiring, error } = await serviceClient
      .from("platform_connections")
      .select("id, user_id, refresh_token, expires_at")
      .eq("platform", "x")
      .eq("connected", true)
      .not("refresh_token", "is", null)
      .lt("expires_at", bufferTime);

    if (error) throw error;

    let refreshed = 0;
    let failed = 0;

    for (const conn of expiring || []) {
      try {
        const response = await fetch("https://api.x.com/2/oauth2/token", {
          method: "POST",
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
            Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
          },
          body: new URLSearchParams({
            grant_type: "refresh_token",
            refresh_token: conn.refresh_token,
          }),
        });

        const data = await response.json();

        if (!response.ok) {
          console.error(`Token refresh failed for user ${conn.user_id}:`, data);
          failed++;
          continue;
        }

        const expiresAt = new Date(Date.now() + (data.expires_in || 7200) * 1000).toISOString();

        await serviceClient.from("platform_connections").update({
          access_token: data.access_token,
          refresh_token: data.refresh_token || conn.refresh_token,
          expires_at: expiresAt,
          token_type: data.token_type || "bearer",
        }).eq("id", conn.id);

        refreshed++;
        console.log(`Refreshed X token for user ${conn.user_id}`);
      } catch (e) {
        console.error(`Error refreshing token for ${conn.user_id}:`, e);
        failed++;
      }
    }

    return new Response(
      JSON.stringify({ refreshed, failed, total: expiring?.length || 0 }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in x-refresh-token:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
