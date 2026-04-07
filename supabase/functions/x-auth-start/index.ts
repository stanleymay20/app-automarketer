import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

const PUBLISHED_APP_URL = "https://app-automarketer.lovable.app";

function generateCodeVerifier(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return btoa(String.fromCharCode(...array))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await crypto.subtle.digest("SHA-256", data);
  return btoa(String.fromCharCode(...new Uint8Array(digest)))
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function generateState(): string {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, (b) => b.toString(16).padStart(2, "0")).join("");
}

function getRedirectUri(supabaseUrl: string): string {
  const configuredRedirectUri = Deno.env.get("X_REDIRECT_URI")?.trim();
  const fallbackRedirectUri = `${supabaseUrl}/functions/v1/x-auth-callback`;

  if (!configuredRedirectUri) {
    return fallbackRedirectUri;
  }

  try {
    const parsed = new URL(configuredRedirectUri);
    const isLegacyLovableCallback =
      parsed.hostname === "lovable.dev" && parsed.pathname === "/api/x/callback";

    return isLegacyLovableCallback ? fallbackRedirectUri : configuredRedirectUri;
  } catch {
    return fallbackRedirectUri;
  }
}

function getAppUrl(): string {
  const configuredAppUrl = Deno.env.get("APP_URL")?.trim();

  if (!configuredAppUrl) {
    console.warn(`[XAuthStart] APP_URL missing; using ${PUBLISHED_APP_URL}`);
    return PUBLISHED_APP_URL;
  }

  try {
    const origin = new URL(configuredAppUrl).origin;
    if (origin !== PUBLISHED_APP_URL) {
      console.warn(`[XAuthStart] APP_URL mismatch (${origin}); using ${PUBLISHED_APP_URL}`);
      return PUBLISHED_APP_URL;
    }
    return origin;
  } catch {
    console.warn(`[XAuthStart] APP_URL invalid; using ${PUBLISHED_APP_URL}`);
    return PUBLISHED_APP_URL;
  }
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const clientId = Deno.env.get("X_CLIENT_ID");
    if (!clientId) throw new Error("X_CLIENT_ID is not configured");

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
    try {
      const body = await req.json();
      appId = typeof body.app_id === "string" && body.app_id.length > 0 ? body.app_id : null;
    } catch {
      appId = null;
    }

    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);
    const state = generateState();

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    await serviceClient.from("platform_connections").upsert(
      {
        user_id: userId,
        platform: "x",
        app_id: appId,
        connected: false,
        access_token: null,
        refresh_token: null,
        token_type: codeVerifier,
        scope: state,
      },
      { onConflict: "user_id,platform,app_id" },
    );

    const redirectUri = getRedirectUri(supabaseUrl);
    const appUrl = getAppUrl();
    const statePayload = `${state}:${userId}:${appId ?? ""}`;
    const scopes = "tweet.write tweet.read users.read offline.access";
    const authUrl = new URL("https://x.com/i/oauth2/authorize");
    authUrl.searchParams.set("response_type", "code");
    authUrl.searchParams.set("client_id", clientId);
    authUrl.searchParams.set("redirect_uri", redirectUri);
    authUrl.searchParams.set("scope", scopes);
    authUrl.searchParams.set("state", statePayload);
    authUrl.searchParams.set("code_challenge", codeChallenge);
    authUrl.searchParams.set("code_challenge_method", "S256");
    authUrl.searchParams.set("force_login", "true");

    console.log("[XAuthStart] OAuth request", JSON.stringify({
      userId,
      appId,
      redirectUri,
      appUrl,
      scopes,
    }));
    console.log(`[XAuthStart] Final auth URL: ${authUrl.toString()}`);

    return new Response(JSON.stringify({ url: authUrl.toString() }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in x-auth-start:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
