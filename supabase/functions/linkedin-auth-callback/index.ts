import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const PUBLISHED_APP_URL = "https://app-automarketer.lovable.app";

function buildRedirectUrl(appUrl: string, params: Record<string, string | null | undefined>) {
  const redirectUrl = new URL("/oauth/callback", appUrl);
  Object.entries(params).forEach(([key, value]) => {
    if (value) redirectUrl.searchParams.set(key, value);
  });
  return redirectUrl.toString();
}

Deno.serve(async (req) => {
  let appUrl = PUBLISHED_APP_URL;

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

    // Parse state: state:userId:appId:encodedReturnTo
    const stateParts = (state || "").split(":");
    const storedState = stateParts[0] || "";
    const userId = stateParts[1] || "";
    const appId = stateParts[2] || null;
    const returnTo = stateParts[3] ? decodeURIComponent(stateParts[3]) : null;

    // Use return_to origin if provided
    if (returnTo) {
      try {
        appUrl = new URL(returnTo).origin;
        console.log(`[LinkedInCallback] Using return_to origin: ${appUrl}`);
      } catch {
        console.warn(`[LinkedInCallback] Invalid return_to, using default: ${appUrl}`);
      }
    }

    if (error) {
      console.error("[LinkedInCallback] Provider error", JSON.stringify({ error, errorDescription }));
      return Response.redirect(buildRedirectUrl(appUrl, {
        platform: "linkedin", status: "error", error, error_description: errorDescription,
      }), 302);
    }

    if (!code || !userId) {
      console.error("[LinkedInCallback] Missing code or userId");
      return Response.redirect(buildRedirectUrl(appUrl, {
        platform: "linkedin", status: "error", error: "missing_params",
      }), 302);
    }

    const serviceClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);

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
        stored: connection?.scope, received: storedState,
      }));
      return Response.redirect(buildRedirectUrl(appUrl, {
        platform: "linkedin", status: "error", error: "state_mismatch", app_id: appId,
      }), 302);
    }

    console.log("[LinkedInCallback] Exchanging code for tokens...");
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
    const grantedScopes = new Set(
      String(tokenData.scope ?? "")
        .split(/\s+/)
        .map((scope: string) => scope.trim())
        .filter(Boolean),
    );
    console.log("[LinkedInCallback] Token exchange", JSON.stringify({
      status: tokenResponse.status,
      has_access_token: !!tokenData.access_token,
      scope: tokenData.scope ?? null,
    }));

    if (!tokenResponse.ok) {
      console.error("[LinkedInCallback] Token exchange FAILED", JSON.stringify(tokenData));
      return Response.redirect(buildRedirectUrl(appUrl, {
        platform: "linkedin", status: "error", error: "token_exchange_failed", app_id: appId,
      }), 302);
    }

    // Fetch profile
    let accountName = "";
    let accountId = "";

    const profileRequests = grantedScopes.has("openid")
      ? [
          {
            label: "userinfo",
            url: "https://api.linkedin.com/v2/userinfo",
            extractProfile: (data: Record<string, string>) => ({
              accountId: data.sub || "",
              accountName:
                data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(),
            }),
          },
          {
            label: "/v2/me",
            url: "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
            extractProfile: (data: Record<string, string>) => ({
              accountId: data.id || "",
              accountName:
                `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim(),
            }),
          },
        ]
      : [
          {
            label: "/v2/me",
            url: "https://api.linkedin.com/v2/me?projection=(id,localizedFirstName,localizedLastName)",
            extractProfile: (data: Record<string, string>) => ({
              accountId: data.id || "",
              accountName:
                `${data.localizedFirstName || ""} ${data.localizedLastName || ""}`.trim(),
            }),
          },
          {
            label: "userinfo",
            url: "https://api.linkedin.com/v2/userinfo",
            extractProfile: (data: Record<string, string>) => ({
              accountId: data.sub || "",
              accountName:
                data.name || `${data.given_name || ""} ${data.family_name || ""}`.trim(),
            }),
          },
        ];

    for (const profileRequest of profileRequests) {
      const profileResponse = await fetch(profileRequest.url, {
        headers: { Authorization: `Bearer ${tokenData.access_token}` },
      });

      if (!profileResponse.ok) {
        const errorBody = await profileResponse.text();
        console.warn(`[LinkedInCallback] ${profileRequest.label} failed`, JSON.stringify({
          status: profileResponse.status,
          body: errorBody,
        }));
        continue;
      }

      const profileData = await profileResponse.json();
      const extracted = profileRequest.extractProfile(profileData);
      accountId = extracted.accountId;
      accountName = extracted.accountName;
      console.log(`[LinkedInCallback] ${profileRequest.label} profile`, JSON.stringify({ accountId, accountName }));

      if (accountId) break;
    }

    if (!accountId) {
      console.error("[LinkedInCallback] Could not resolve account_id from any endpoint");
      return Response.redirect(buildRedirectUrl(appUrl, {
        platform: "linkedin",
        status: "error",
        error: "missing_account_id",
        error_description: "LinkedIn did not return a member profile id. Go to developer.linkedin.com → your app → Products and enable 'Sign In with LinkedIn using OpenID Connect', then reconnect.",
        app_id: appId,
      }), 302);
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

    console.log("[LinkedInCallback] Success", JSON.stringify({ accountId, accountName, appUrl }));

    return Response.redirect(buildRedirectUrl(appUrl, {
      platform: "linkedin", status: "success", connected: "linkedin", app_id: appId,
    }), 302);
  } catch (err) {
    console.error("[LinkedInCallback] Unhandled error", err);
    return Response.redirect(buildRedirectUrl(appUrl, {
      platform: "linkedin", status: "error", error: "server_error",
    }), 302);
  }
});
