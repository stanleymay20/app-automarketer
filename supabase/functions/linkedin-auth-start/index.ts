import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID");
    if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is not configured");

    const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI");
    if (!redirectUri) throw new Error("LINKEDIN_REDIRECT_URI is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabase = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const {
      data: { user },
      error: userError,
    } = await supabase.auth.getUser();

    if (userError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const userId = user.id;

    let appId: string | null = null;
    let returnTo: string | null = null;
    try {
      const body = await req.json();
      appId = typeof body.app_id === "string" && body.app_id.length > 0 ? body.app_id : null;
      returnTo = typeof body.return_to === "string" && body.return_to.length > 0 ? body.return_to : null;
    } catch {
      appId = null;
    }

    const state = generateState();
    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await serviceClient.from("platform_connections").upsert(
      {
        user_id: userId,
        platform: "linkedin",
        app_id: appId,
        connected: false,
        access_token: null,
        refresh_token: null,
        token_type: null,
        scope: state,
      },
      { onConflict: "user_id,platform,app_id" },
    );

    const encodedReturnTo = returnTo ? encodeURIComponent(returnTo) : "";
    const scopes = "r_liteprofile w_member_social";
    const statePayload = `${state}:${userId}:${appId ?? ""}:${encodedReturnTo}`;
    const authUrl = new URL("https://www.linkedin.com/oauth/v2/authorization");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", statePayload);

    console.log("[LinkedInAuthStart] OAuth request", JSON.stringify({
      userId,
      appId,
      redirectUri,
      returnTo,
      scopes,
    }));

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in linkedin-auth-start:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
