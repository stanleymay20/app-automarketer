import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLISHED_APP_URL = "https://app-automarketer.lovable.app";

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
    console.warn(`[XAuthCallback] APP_URL missing; using ${PUBLISHED_APP_URL}`);
    return PUBLISHED_APP_URL;
  }

  try {
    const origin = new URL(configuredAppUrl).origin;
    if (origin !== PUBLISHED_APP_URL) {
      console.warn(`[XAuthCallback] APP_URL mismatch (${origin}); using ${PUBLISHED_APP_URL}`);
      return PUBLISHED_APP_URL;
    }
    return origin;
  } catch {
    console.warn(`[XAuthCallback] APP_URL invalid; using ${PUBLISHED_APP_URL}`);
    return PUBLISHED_APP_URL;
  }
}

function buildRedirectUrl(appUrl: string, params: Record<string, string | null | undefined>) {
  const redirectUrl = new URL("/oauth/callback", appUrl);

  Object.entries(params).forEach(([key, value]) => {
    if (value) {
      redirectUrl.searchParams.set(key, value);
    }
  });

  return redirectUrl.toString();
}

Deno.serve(async (req) => {
  const appUrl = getAppUrl();

  try {
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");
    const errorDescription = url.searchParams.get("error_description");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const clientId = Deno.env.get("X_CLIENT_ID")!;
    const clientSecret = Deno.env.get("X_CLIENT_SECRET")!;

    if (!clientId) throw new Error("X_CLIENT_ID is not configured");
    if (!clientSecret) throw new Error("X_CLIENT_SECRET is not configured");

    if (error) {
      console.error("[XAuthCallback] Provider error", JSON.stringify({ error, errorDescription }));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error,
        error_description: errorDescription,
      });
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    if (!code || !state) {
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error: "missing_params",
      });
      console.error("[XAuthCallback] Missing code or state params");
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const stateParts = state.split(":");
    const storedState = stateParts[0];
    const userId = stateParts[1];
    const appId = stateParts[2] || null;

    if (!userId) {
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error: "invalid_state",
      });
      console.error("[XAuthCallback] Invalid state payload", state);
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

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
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error: "state_mismatch",
        app_id: appId,
      });
      console.error("[XAuthCallback] State mismatch", JSON.stringify({ stored: connection?.scope, received: storedState }));
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const codeVerifier = connection.token_type;
    const redirectUri = getRedirectUri(supabaseUrl);

    console.log("[XAuthCallback] Token exchange request", JSON.stringify({
      redirectUri,
      appUrl,
      appId,
    }));

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
    console.log("[XAuthCallback] Token exchange result", JSON.stringify({
      status: tokenResponse.status,
      scope: tokenData.scope ?? null,
      has_refresh_token: !!tokenData.refresh_token,
    }));

    if (!tokenResponse.ok) {
      console.error("[XAuthCallback] Token exchange failed", JSON.stringify(tokenData));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error: "token_exchange_failed",
        app_id: appId,
      });
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const profileResponse = await fetch("https://api.x.com/2/users/me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const profileData = await profileResponse.json();
    const profile = profileData.data;

    console.log("[XAuthCallback] Profile fetch result", JSON.stringify({
      status: profileResponse.status,
      username: profile?.username ?? null,
      id: profile?.id ?? null,
    }));

    if (!profile) {
      console.error("[XAuthCallback] Failed to fetch X profile", JSON.stringify(profileData));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "x",
        status: "error",
        error: "profile_fetch_failed",
        app_id: appId,
      });
      console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const expiresAt = new Date(Date.now() + (tokenData.expires_in || 7200) * 1000).toISOString();

    await serviceClient.from("platform_connections").upsert(
      {
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
      },
      { onConflict: "user_id,platform,app_id" },
    );

    const finalRedirectUrl = buildRedirectUrl(appUrl, {
      platform: "x",
      status: "success",
      connected: "x",
      app_id: appId,
    });

    console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
    return Response.redirect(finalRedirectUrl, 302);
  } catch (err) {
    console.error("Error in x-auth-callback:", err);
    const finalRedirectUrl = buildRedirectUrl(appUrl, {
      platform: "x",
      status: "error",
      error: "server_error",
    });
    console.log(`[XAuthCallback] Final redirect URL: ${finalRedirectUrl}`);
    return Response.redirect(finalRedirectUrl, 302);
  }
});
