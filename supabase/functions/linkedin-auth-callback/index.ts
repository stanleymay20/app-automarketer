import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLISHED_APP_URL = "https://app-automarketer.lovable.app";

function getAppUrl(): string {
  const configuredAppUrl = Deno.env.get("APP_URL")?.trim();

  if (!configuredAppUrl) {
    console.warn(`[LinkedInCallback] APP_URL missing; using ${PUBLISHED_APP_URL}`);
    return PUBLISHED_APP_URL;
  }

  try {
    const origin = new URL(configuredAppUrl).origin;
    if (origin !== PUBLISHED_APP_URL) {
      console.warn(`[LinkedInCallback] APP_URL mismatch (${origin}); using ${PUBLISHED_APP_URL}`);
      return PUBLISHED_APP_URL;
    }
    return origin;
  } catch {
    console.warn(`[LinkedInCallback] APP_URL invalid; using ${PUBLISHED_APP_URL}`);
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
    const clientId = Deno.env.get("LINKEDIN_CLIENT_ID")!;
    const clientSecret = Deno.env.get("LINKEDIN_CLIENT_SECRET")!;
    const redirectUri = Deno.env.get("LINKEDIN_REDIRECT_URI")!;

    if (!clientId) throw new Error("LINKEDIN_CLIENT_ID is not configured");
    if (!clientSecret) throw new Error("LINKEDIN_CLIENT_SECRET is not configured");

    if (error) {
      console.error("[LinkedInCallback] Provider error", JSON.stringify({ error, errorDescription }));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error,
        error_description: errorDescription,
      });
      console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    if (!code || !state) {
      console.error("[LinkedInCallback] Missing code or state params");
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error: "missing_params",
      });
      console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    const stateParts = state.split(":");
    const storedState = stateParts[0];
    const userId = stateParts[1];
    const appId = stateParts[2] || null;

    if (!userId) {
      console.error("[LinkedInCallback] No userId in state");
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error: "invalid_state",
      });
      console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    console.log("[LinkedInCallback] OAuth callback received", JSON.stringify({
      userId,
      appId,
      redirectUri,
      appUrl,
    }));

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    );

    let connectionQuery = serviceClient
      .from("platform_connections")
      .select("scope")
      .eq("user_id", userId)
      .eq("platform", "linkedin");

    if (appId) {
      connectionQuery = connectionQuery.eq("app_id", appId);
    } else {
      connectionQuery = connectionQuery.is("app_id", null);
    }

    const { data: connection } = await connectionQuery.single();

    if (!connection || connection.scope !== storedState) {
      console.error("[LinkedInCallback] State mismatch", JSON.stringify({
        stored: connection?.scope,
        received: storedState,
      }));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error: "state_mismatch",
        app_id: appId,
      });
      console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    console.log("[LinkedInCallback] Exchanging authorization code for tokens...");
    const tokenResponse = await fetch("https://www.linkedin.com/oauth/v2/accessToken", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
      }),
    });

    const tokenData = await tokenResponse.json();
    console.log("[LinkedInCallback] Token exchange result", JSON.stringify({
      status: tokenResponse.status,
      scope: tokenData.scope ?? null,
      has_access_token: !!tokenData.access_token,
      has_refresh_token: !!tokenData.refresh_token,
      expires_in: tokenData.expires_in ?? null,
    }));

    if (!tokenResponse.ok) {
      console.error("[LinkedInCallback] Token exchange FAILED", JSON.stringify(tokenData));
      const finalRedirectUrl = buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error: "token_exchange_failed",
        app_id: appId,
      });
      console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
      return Response.redirect(finalRedirectUrl, 302);
    }

    let accountName = "";
    let accountId = "";
    let profileSource = "none";

    console.log("[LinkedInCallback] Attempting GET /v2/me ...");
    const meResponse = await fetch(
      "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } },
    );
    const meBody = await meResponse.text();
    console.log(`[LinkedInCallback] /v2/me status: ${meResponse.status}`);
    console.log(`[LinkedInCallback] /v2/me body: ${meBody}`);

    if (meResponse.ok) {
      try {
        const meData = JSON.parse(meBody);
        accountId = meData.id || "";
        const firstName = meData.localizedFirstName || "";
        const lastName = meData.localizedLastName || "";
        accountName = `${firstName} ${lastName}`.trim();
        profileSource = "/v2/me";
      } catch (parseError) {
        console.error("[LinkedInCallback] /v2/me parse error", parseError);
      }
    } else {
      console.warn(`[LinkedInCallback] /v2/me failed (${meResponse.status}). Trying /v2/userinfo fallback...`);
      const userinfoResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });
      const userinfoBody = await userinfoResponse.text();
      console.log(`[LinkedInCallback] /v2/userinfo status: ${userinfoResponse.status}`);
      console.log(`[LinkedInCallback] /v2/userinfo body: ${userinfoBody}`);

      if (userinfoResponse.ok) {
        try {
          const userinfoData = JSON.parse(userinfoBody);
          accountId = userinfoData.sub || "";
          accountName =
            userinfoData.name || `${userinfoData.given_name || ""} ${userinfoData.family_name || ""}`.trim();
          profileSource = "/v2/userinfo";
        } catch (parseError) {
          console.error("[LinkedInCallback] /v2/userinfo parse error", parseError);
        }
      } else {
        console.error(`[LinkedInCallback] /v2/userinfo also failed (${userinfoResponse.status})`);
      }
    }

    const expiresIn = tokenData.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    await serviceClient.from("platform_connections").upsert(
      {
        user_id: userId,
        platform: "linkedin",
        app_id: appId,
        connected: true,
        connected_at: new Date().toISOString(),
        account_name: accountName || "LinkedIn User",
        account_id: accountId,
        access_token: tokenData.access_token,
        refresh_token: tokenData.refresh_token || null,
        expires_at: expiresAt,
        token_type: tokenData.token_type || "Bearer",
        scope: tokenData.scope || "w_member_social",
      },
      { onConflict: "user_id,platform,app_id" },
    );

    console.log("[LinkedInCallback] Stored connection", JSON.stringify({
      account_id: accountId || null,
      account_name: accountName || "LinkedIn User",
      profile_source: profileSource,
    }));

    const finalRedirectUrl = buildRedirectUrl(appUrl, {
      platform: "linkedin",
      status: "success",
      connected: "linkedin",
      app_id: appId,
    });
    console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
    return Response.redirect(finalRedirectUrl, 302);
  } catch (err) {
    console.error("[LinkedInCallback] Unhandled error", err);
    const finalRedirectUrl = buildRedirectUrl(appUrl, {
      platform: "linkedin",
      status: "error",
      error: "server_error",
    });
    console.log(`[LinkedInCallback] Final redirect URL: ${finalRedirectUrl}`);
    return Response.redirect(finalRedirectUrl, 302);
  }
});
