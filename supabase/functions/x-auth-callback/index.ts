import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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

    // Determine the app URL for redirects
    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--130c11f0-d7a3-425d-8777-403d718af1e7.lovable.app";

    if (error) {
      console.error("X OAuth error:", error);
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=${error}`, 302);
    }

    if (!code || !state) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=missing_params`, 302);
    }

    // Parse state: "randomState:userId"
    const [storedState, userId] = state.split(":");
    if (!userId) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=invalid_state`, 302);
    }

    const serviceClient = createClient(
      supabaseUrl,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Retrieve stored PKCE verifier from DB
    const { data: connection } = await serviceClient
      .from("platform_connections")
      .select("token_type, scope")
      .eq("user_id", userId)
      .eq("platform", "x")
      .single();

    if (!connection || connection.scope !== storedState) {
      return Response.redirect(`${appUrl}/settings?tab=platforms&error=state_mismatch`, 302);
    }

    const codeVerifier = connection.token_type;
    const redirectUri = Deno.env.get("X_REDIRECT_URI") || `${supabaseUrl}/functions/v1/x-auth-callback`;

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

    // Store tokens securely
    await serviceClient.from("platform_connections").upsert(
      {
        user_id: userId,
        platform: "x",
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
      { onConflict: "user_id,platform" }
    );

    console.log(`X OAuth connected for user ${userId}: @${profile.username}`);

    return Response.redirect(`${appUrl}/settings?tab=platforms&connected=x`, 302);
  } catch (err) {
    console.error("Error in x-auth-callback:", err);
    const appUrl = Deno.env.get("APP_URL") || "https://id-preview--130c11f0-d7a3-425d-8777-403d718af1e7.lovable.app";
    return Response.redirect(`${appUrl}/settings?tab=platforms&error=server_error`, 302);
  }
});
