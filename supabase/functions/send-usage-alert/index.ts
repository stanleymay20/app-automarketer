import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";
import { Resend } from "npm:resend@2.0.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

interface PlanLimits {
  postsPerMonth: number;
}

const PLAN_LIMITS: Record<string, PlanLimits> = {
  free: { postsPerMonth: 10 },
  starter: { postsPerMonth: 100 },
  pro: { postsPerMonth: -1 }, // unlimited
};

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    console.log(`[send-usage-alert] Starting usage alert check at ${new Date().toISOString()}`);

    if (!RESEND_API_KEY) {
      console.log(`[send-usage-alert] RESEND_API_KEY not configured, skipping emails`);
      return new Response(
        JSON.stringify({ success: true, message: "Email sending disabled (no API key)" }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const resend = new Resend(RESEND_API_KEY);

    // Get all user settings with usage data
    const { data: allSettings, error: fetchError } = await supabase
      .from("user_settings")
      .select("id, user_id, plan, posts_this_month")
      .limit(1000);

    if (fetchError) {
      console.error(`[send-usage-alert] Error fetching user settings:`, fetchError);
      throw fetchError;
    }

    if (!allSettings || allSettings.length === 0) {
      console.log(`[send-usage-alert] No user settings found`);
      return new Response(
        JSON.stringify({ success: true, alertsSent: 0 }),
        { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let alertsSent = 0;

    for (const settings of allSettings) {
      const plan = settings.plan || "free";
      const limits = PLAN_LIMITS[plan] || PLAN_LIMITS.free;
      
      // Skip unlimited plans
      if (limits.postsPerMonth === -1) continue;

      const usagePercent = (settings.posts_this_month / limits.postsPerMonth) * 100;
      
      // Check if user is at 70% or 90% threshold
      let alertLevel: "warning" | "critical" | null = null;
      if (usagePercent >= 90) {
        alertLevel = "critical";
      } else if (usagePercent >= 70) {
        alertLevel = "warning";
      }

      if (!alertLevel) continue;

      // Get user email from auth.users
      const { data: authUser, error: authError } = await supabase.auth.admin.getUserById(settings.user_id);
      
      if (authError || !authUser?.user?.email) {
        console.log(`[send-usage-alert] Could not get email for user ${settings.user_id}`);
        continue;
      }

      const userEmail = authUser.user.email;
      const remaining = limits.postsPerMonth - settings.posts_this_month;

      console.log(`[send-usage-alert] Sending ${alertLevel} alert to ${userEmail} (${usagePercent.toFixed(0)}% usage)`);

      const subject = alertLevel === "critical"
        ? "🚨 ScrollMarketer: You're almost at your monthly limit"
        : "⚠️ ScrollMarketer: Approaching your monthly limit";

      const html = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #1a1a1a; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); padding: 30px; border-radius: 12px 12px 0 0;">
    <h1 style="color: white; margin: 0; font-size: 24px;">ScrollMarketer</h1>
  </div>
  
  <div style="background: #f8fafc; padding: 30px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
    <h2 style="margin-top: 0; color: ${alertLevel === "critical" ? "#dc2626" : "#f59e0b"};">
      ${alertLevel === "critical" ? "Almost at your limit!" : "Heads up: Usage update"}
    </h2>
    
    <p>You've used <strong>${settings.posts_this_month} of ${limits.postsPerMonth}</strong> posts this month (${usagePercent.toFixed(0)}%).</p>
    
    <p>${remaining > 0 
      ? `You have <strong>${remaining} post${remaining === 1 ? "" : "s"}</strong> remaining.`
      : "You've reached your monthly limit. Autopilot will pause until next month."
    }</p>
    
    ${alertLevel === "critical" ? `
    <div style="background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 15px; margin: 20px 0;">
      <p style="margin: 0; color: #dc2626;">
        <strong>Autopilot will pause</strong> once you hit your limit. Upgrade to keep your marketing running.
      </p>
    </div>
    ` : ""}
    
    <a href="https://scrollmarketer.com/settings" style="display: inline-block; background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%); color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600; margin-top: 10px;">
      Upgrade Plan
    </a>
    
    <p style="color: #64748b; font-size: 14px; margin-top: 30px;">
      Questions? Just reply to this email.
    </p>
  </div>
</body>
</html>
      `;

      try {
        await resend.emails.send({
          from: "ScrollMarketer <noreply@scrollmarketer.com>",
          to: [userEmail],
          subject,
          html,
        });
        alertsSent++;
        console.log(`[send-usage-alert] Alert sent to ${userEmail}`);
      } catch (emailError) {
        console.error(`[send-usage-alert] Failed to send email to ${userEmail}:`, emailError);
      }
    }

    console.log(`[send-usage-alert] Completed. Sent ${alertsSent} alerts.`);

    return new Response(
      JSON.stringify({ success: true, alertsSent }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (error) {
    console.error(`[send-usage-alert] Unexpected error:`, error);
    return new Response(
      JSON.stringify({ success: false, error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
