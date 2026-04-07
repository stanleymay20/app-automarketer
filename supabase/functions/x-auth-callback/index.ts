import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

Deno.serve(async (req) => {
  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const clientId = Deno.env.get("X_CLIENT_ID")!;
    const clientSecret = Deno.env.get("X_CLIENT_SECRET")!;

    if (!clientId) throw new Error("X_CLIENT_ID is not configured");
    if (!clientSecret) throw new Error("X_CLIENT_SECRET is not configured");

    const appUrl = Deno.env.get("APP_URL") 
      || req.headers.get("referer")?.replace(/\/settings.*$/, "")
      || req.headers.get("origin")
      || "https://app-automarketer.lovable.app";

    if (error) {
      console.error("X OAuth error:", error);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=${error}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=missing_params`, 302);
    }

    // Parse state: "randomState:userId" or "randomState:userId:appId"
    const stateParts = state.split(":");
    const storedState = stateParts[0];
    const userId = stateParts[1];
    const appId = stateParts[2] || null;

    if (!userId) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=invalid_state`, 302);
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Retrieve stored PKCE verifier from DB — match on app_id too
    let connectionQuery = serviceClient
      .from("platform_connections")
      .select("token_type, scope")
      .eq("user_id", userId)
      .eq("platform", "x");

    if (appId) {
      connectionQuery = connectionQuery.eq("app_id", appId);
    } else {
      connectionQuery = connectionQuery.is("app_id", null);
    }

    const { data: connection } = await connectionQuery.single();

    if (!connection || connection.scope !== storedState) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=state_mismatch`, 302);
    }

    const codeVerifier = connection.token_type;
    const redirectUri = getRedirectUri(supabaseUrl);

    // Exchange code for tokens
    const tokenResponse = await fetch("https://api.x.com/2/oauth2/token", {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        Authorization: `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
      },
      body: new URLSearchParams({
        code,
        grant_type: "authorization_code",
        redirect_uri: redirectUri,
        code_verifier: codeVerifier,
      }),
    });

    const tokenData = await tokenResponse.json();

    if (!tokenResponse.ok) {
      console.error("Token exchange failed:", tokenData);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=token_exchange_failed`, 302);
    }

    // Fetch user profile
    const profileResponse = await fetch("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileResponse.json();
    const profile = profileData.data;

    if (!profile) {
      console.error("Failed to fetch X profile:", profileData);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=profile_fetch_failed`, 302);
    }

    // Calculate token expiry
    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

    // Store tokens securely — upsert keyed on (user_id, platform, app_id)
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      platform: "x",
      app_id: appId,
      connected: true,
      connected_at: new Date().toISOString(),
      account_name: `@${profile.username}`,
      account_id: profile.id,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      token_type: tokenData.token_type || "bearer",
      scope: tokenData.scope || "",
    };

    await serviceClient.from("platform_connections").upsert(
      upsertData,
      { onConflict: "user_id,platform,app_id" }
    );

    console.log(`X OAuth connected for user ${userId} app ${appId}: @${profile.username}`);

    const redirectParams = new URLSearchParams({ tab: "platforms", connected: "x" });
    if (appId) redirectParams.set("app_id", appId);

    return Response.redirect(`${appUrl}/settings?${redirectParams.toString()}`, 302);
  } catch (err) {
    console.error("Error in x-auth-callback:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://app-automarketer.lovable.app";
    return Response.redirect(`${appUrl}/settings?tab=platforms&error=server_error`, 302);
  }
});
