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

    // Without OIDC, we cannot use /v2/userinfo.
    // Use /v2/me (LinkedIn Profile API) to get the member's ID and name.
    // The w_member_social scope grants access to /v2/me for the authorized member.
    const profileResponse = await fetch(
      "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
      {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      }
    );

    let accountName = "LinkedIn User";
    let accountId = "";

    if (profileResponse.ok) {
      const profileData = await profileResponse.json();
      accountId = profileData.id; // This is the LinkedIn member ID (e.g., "dBsV0x1234")
      const firstName = profileData.localizedFirstName || "";
      const lastName = profileData.localizedLastName || "";
      accountName = `${firstName} ${lastName}`.trim() || "LinkedIn User";
      console.log(`LinkedIn profile fetched: id=${accountId} name=${accountName}`);
    } else {
      // If /v2/me fails, we can still store the connection.
      // The access token itself can be introspected later, or
      // we use the token to post — account_id will be derived at post time.
      console.warn("LinkedIn /v2/me failed, storing connection without profile data");
      const errorBody = await profileResponse.text();
      console.warn(`/v2/me response [${profileResponse.status}]: ${errorBody}`);
    }

    // LinkedIn access tokens expire in 60 days (5184000s) by default.
    // LinkedIn does NOT return refresh_token without specific product approval.
    const expiresIn = tokenData.expires_in || 5184000;
    const expiresAt = new Date(Date.now() + expiresIn * 1000).toISOString();

    const upsertData: Record<string, unknown> = {
      user_id: userId,
      platform: "linkedin",
      app_id: appId,
      connected: true,
      connected_at: new Date().toISOString(),
      account_name: accountName,
      account_id: accountId,
      access_token: tokenData.access_token,
      // Do NOT assume refresh_token exists — only store if LinkedIn actually returns one
      refresh_token: tokenData.refresh_token || null,
      expires_at: expiresAt,
      token_type: tokenData.token_type || "Bearer",
      scope: tokenData.scope || "w_member_social",
    };

    await serviceClient.from("platform_connections").upsert(
      upsertData,
      { onConflict: "user_id,platform,app_id" }
    );

    console.log(`LinkedIn OAuth connected for user ${userId} app ${appId}: ${accountName} (id=${accountId})`);

    const redirectParams = new URLSearchParams({ tab: "platforms", connected: "linkedin" });
    if (appId) redirectParams.set("app_id", appId);

    return Response.redirect(`${appUrl}/settings?${redirectParams.toString()}`, 302);
  } catch (err) {
    console.error("Error in linkedin-auth-callback:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://app-automarketer.lovable.app";
    return Response.redirect(`${appUrl}/settings?tab=platforms&error=server_error`, 302);
  }
});
