import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.0";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

Deno.serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST, OPTIONS",
        "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
      },
    });
  }

  try {
    console.log(`[reset-monthly-usage] Starting monthly usage reset at ${new Date().toISOString()}`);

    // Get all users (via user_settings table)
    const { data: allSettings, error: fetchError } = await supabase
      .from("user_settings")
      .select("id, user_id, billing_period_start")
      .limit(1000); // Process in batches if needed

    if (fetchError) {
      console.error(`[reset-monthly-usage] Error fetching user settings:`, fetchError);
      throw fetchError;
    }

    if (!allSettings || allSettings.length === 0) {
      console.log(`[reset-monthly-usage] No user settings found`);
      return new Response(JSON.stringify({ message: "No users to reset" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    // Reset posts_this_month and update billing_period_start for all users
    const now = new Date();
    const { data: updateResult, error: updateError } = await supabase
      .from("user_settings")
      .update({
        posts_this_month: 0,
        billing_period_start: now.toISOString(),
        updated_at: now.toISOString(),
      })
      .neq("id", ""); // Update all rows

    if (updateError) {
      console.error(`[reset-monthly-usage] Error updating user settings:`, updateError);
      throw updateError;
    }

    console.log(`[reset-monthly-usage] Successfully reset usage for ${allSettings.length} users`);

    return new Response(
      JSON.stringify({
        success: true,
        usersReset: allSettings.length,
        timestamp: now.toISOString(),
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error(`[reset-monthly-usage] Unexpected error:`, error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      }
    );
  }
});
