import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

Deno.serve(async (req) => {
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

    const fallbackAppUrl = Deno.env.get("APP_URL")
      || req.headers.get("referer")?.replace(/\/settings.*$/, "")
      || req.headers.get("origin")
      || "https://app-automarketer.lovable.app";

    if (error) {
      console.error("[LinkedInCallback] OAuth error:", error, errorDescription);
      return Response.redirect(`${fallbackAppUrl}/settings?tab=platforms&error=${error}`, 302);
    }

    if (!code || !state) {
      console.error("[LinkedInCallback] Missing code or state params");
      return Response.redirect(`${fallbackAppUrl}/settings?tab=platforms&error=missing_params`, 302);
    }

    const stateParts = state.split(":");
    const storedState = stateParts[0];
    const userId = stateParts[1];
    const appId = stateParts[2] || null;
    const returnTo = stateParts[3] || null;

    let appUrl = fallbackAppUrl;
    if (returnTo) {
      try {
        appUrl = new URL(decodeURIComponent(returnTo)).origin;
      } catch {
        appUrl = fallbackAppUrl;
      }
    }

    if (!userId) {
      console.error("[LinkedInCallback] No userId in state");
      return Response.redirect(`${fallbackAppUrl}/settings?tab=platforms&error=invalid_state`, 302);
    }

    console.log(`[LinkedInCallback] Processing callback for user=${userId} app=${appId}`);

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify stored state
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
      console.error("[LinkedInCallback] State mismatch:", { stored: connection?.scope, received: storedState });
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=state_mismatch`, 302);
    }

    // ── Step 1: Exchange code for tokens ──
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

    console.log(`[LinkedInCallback] Token exchange status: ${tokenResponse.status}`);
    console.log(`[LinkedInCallback] Token response keys: ${Object.keys(tokenData).join(", ")}`);
    console.log(`[LinkedInCallback] Has access_token: ${!!tokenData.access_token}`);
    console.log(`[LinkedInCallback] Has refresh_token: ${!!tokenData.refresh_token}`);
    console.log(`[LinkedInCallback] expires_in: ${tokenData.expires_in}`);
    console.log(`[LinkedInCallback] scope: ${tokenData.scope}`);

    if (!tokenResponse.ok) {
      console.error("[LinkedInCallback] Token exchange FAILED:", JSON.stringify(tokenData));
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=token_exchange_failed`, 302);
    }

    console.log("[LinkedInCallback] Token exchange SUCCEEDED");

    // ── Step 2: Try to fetch profile ──
    // Strategy: Try /v2/me first. If it fails, try /v2/userinfo (in case OIDC
    // scopes were implicitly granted). If both fail, store connection anyway
    // but mark account_id as empty — posting will fail later without it.

    let accountName = "";
    let accountId = "";
    let profileSource = "none";

    // Attempt 1: /v2/me
    console.log("[LinkedInCallback] Attempting GET /v2/me ...");
    const meResponse = await fetch(
      "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
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
        console.log(`[LinkedInCallback] /v2/me SUCCEEDED: id=${accountId} name=${accountName}`);
      } catch (e) {
        console.error("[LinkedInCallback] /v2/me parse error:", e);
      }
    } else {
      console.warn(`[LinkedInCallback] /v2/me FAILED (${meResponse.status}). Trying /v2/userinfo fallback...`);

      // Attempt 2: /v2/userinfo (OIDC) — may work if scopes were implicitly added
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
          accountName = userinfoData.name || `${userinfoData.given_name || ""} ${userinfoData.family_name || ""}`.trim();
          profileSource = "/v2/userinfo";
          console.log(`[LinkedInCallback] /v2/userinfo SUCCEEDED: sub=${accountId} name=${accountName}`);
        } catch (e) {
          console.error("[LinkedInCallback] /v2/userinfo parse error:", e);
        }
      } else {
        console.error(`[LinkedInCallback] /v2/userinfo also FAILED (${userinfoResponse.status}).`);

        // Attempt 3: Introspect token to get member URN
        // LinkedIn's token introspection isn't publicly available for self-serve,
        // so we try posting a noop to extract the member ID from error context.
        // Last resort: store connection with empty account_id.
        console.error("[LinkedInCallback] CRITICAL: No profile endpoint worked. account_id will be EMPTY.");
        console.error("[LinkedInCallback] Posting will FAIL until account_id is populated.");
        console.error("[LinkedInCallback] Required fix: Add 'Sign In with LinkedIn using OpenID Connect' product in LinkedIn portal, OR find alternative member ID source.");
      }
    }

    // ── Step 3: Store connection ──
    const expiresIn = tokenData.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const upsertData: Record<string, unknown> = {
      user_id: userId,
      platform: "linkedin",
      app_id: appId,
      connected: true,
      connected_at: new Date().toISOString(),
      account_name: accountName || "LinkedIn User",
      account_id: accountId, // may be empty if both profile endpoints failed
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      token_type: tokenData.token_type || "Bearer",
      scope: tokenData.scope || "w_member_social",
    };

    await serviceClient.from("platform_connections").upsert(
      upsertData,
      { onConflict: "user_id,platform,app_id" }
    );

    console.log(`[LinkedInCallback] Connection stored: account_id=${accountId || "EMPTY"} account_name=${accountName || "LinkedIn User"} profile_source=${profileSource} has_refresh_token=${!!tokenData.refresh_token}`);

    if (!accountId) {
      console.error("[LinkedInCallback] ⚠️  CONNECTION SAVED BUT account_id IS EMPTY — POSTING WILL FAIL");
    }

    const redirectParams = new URLSearchParams({ tab: "platforms", connected: "linkedin" });
    if (appId) redirectParams.set("app_id", appId);

    return Response.redirect(`${appUrl}/settings?${redirectParams.toString()}`, 302);
  } catch (err) {
    console.error("[LinkedInCallback] Unhandled error:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://app-automarketer.lovable.app";
    return Response.redirect(`${appUrl}/settings?tab=platforms&error=server_error`, 302);
  }
});
