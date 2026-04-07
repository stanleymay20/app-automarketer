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

    const appUrl = Deno.env.get("APP_URL")
      || req.headers.get("referer")?.replace(/\/settings.*$/, "")
      || req.headers.get("origin")
      || "https://app-automarketer.lovable.app";

    if (error) {
      console.error("LinkedIn OAuth error:", error, errorDescription);
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
      console.error("State mismatch:", { stored: connection?.scope, received: storedState });
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=state_mismatch`, 302);
    }

    // Exchange code for tokens
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

    if (!tokenResponse.ok) {
      console.error("LinkedIn token exchange failed:", tokenData);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=token_exchange_failed`, 302);
    }

    // Fetch user profile via OpenID Connect userinfo endpoint
    const profileResponse = await fetch("https://api.linkedin.com/v2/userinfo", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });

    const profileData = await profileResponse.json();

    if (!profileResponse.ok) {
      console.error("LinkedIn profile fetch failed:", profileData);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=profile_fetch_failed`, 302);
    }

    const accountName = profileData.name || `${profileData.given_name || ""} ${profileData.family_name || ""}`.trim();
    const accountId = profileData.sub; // OpenID subject = LinkedIn member URN

    // LinkedIn access tokens expire in 60 days (5184000 seconds)
    const expiresIn = tokenData.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    // Store tokens
    const upsertData: Record<string, unknown> = {
      user_id: userId,
      platform: "linkedin",
      app_id: appId,
      connected: true,
      connected_at: new Date().toISOString(),
      account_name: accountName,
      account_id: accountId,
      access_token: tokenData.access_token,
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      token_type: tokenData.token_type || "Bearer",
      scope: tokenData.scope || "openid profile email w_member_social",
    };

    await serviceClient.from("platform_connections").upsert(
      upsertData,
      { onConflict: "user_id,platform,app_id" }
    );

    console.log(`LinkedIn OAuth connected for user ${userId} app ${appId}: ${accountName} (sub=${accountId})`);

    const redirectParams = new URLSearchParams({ tab: "platforms", connected: "linkedin" });
    if (appId) redirectParams.set("app_id", appId);

    return Response.redirect(`${appUrl}/settings?${redirectParams.toString()}`, 302);
  } catch (err) {
    console.error("Error in linkedin-auth-callback:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://app-automarketer.lovable.app";
    return Response.redirect(`${appUrl}/settings?tab=platforms&error=server_error`, 302);
  }
});
