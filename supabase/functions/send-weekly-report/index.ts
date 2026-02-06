import { createClient } from "https://esm.sh/@supabase/supabase-js@2.49.1";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
    
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    console.log('[WeeklyReport] Starting weekly report generation...');

    // Get all users
    const { data: { users }, error: usersError } = await supabase.auth.admin.listUsers();
    
    if (usersError) {
      throw usersError;
    }

    const now = new Date();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - 7);
    weekStart.setHours(0, 0, 0, 0);

    const weekEnd = new Date(now);
    weekEnd.setHours(23, 59, 59, 999);

    let reportsGenerated = 0;
    let errors: { userId: string; error: string }[] = [];

    for (const user of users || []) {
      try {
        // Check user notification settings
        const { data: settings } = await supabase
          .from('user_settings')
          .select('notification_weekly_report')
          .eq('user_id', user.id)
          .single();

        if (settings?.notification_weekly_report === false) {
          console.log(`[WeeklyReport] Skipping ${user.id} - notifications disabled`);
          continue;
        }

        // Get last 7 days of published content
        const { data: content, error: contentError } = await supabase
          .from('content')
          .select(`
            id,
            app_id,
            platform,
            impressions,
            engagements,
            clicks,
            published_at,
            apps!inner(id, name)
          `)
          .eq('user_id', user.id)
          .eq('status', 'published')
          .gte('published_at', weekStart.toISOString())
          .lte('published_at', weekEnd.toISOString());

        if (contentError) {
          throw contentError;
        }

        // Aggregate data
        let totalPosts = 0;
        let totalImpressions = 0;
        let totalEngagements = 0;
        let totalClicks = 0;
        const appMetrics: Record<string, any> = {};
        const platformMetrics: Record<string, any> = {};

        for (const item of content || []) {
          totalPosts++;
          totalImpressions += item.impressions || 0;
          totalEngagements += item.engagements || 0;
          totalClicks += item.clicks || 0;

          const appId = item.app_id;
          const appName = (item.apps as any)?.name || 'Unknown';
          const platform = item.platform;

          if (!appMetrics[appId]) {
            appMetrics[appId] = { name: appName, posts: 0, impressions: 0, engagements: 0 };
          }
          appMetrics[appId].posts++;
          appMetrics[appId].impressions += item.impressions || 0;
          appMetrics[appId].engagements += item.engagements || 0;

          if (!platformMetrics[platform]) {
            platformMetrics[platform] = { posts: 0, impressions: 0, engagements: 0 };
          }
          platformMetrics[platform].posts++;
          platformMetrics[platform].impressions += item.impressions || 0;
          platformMetrics[platform].engagements += item.engagements || 0;
        }

        // Find top performers
        let topAppId: string | null = null;
        let topAppName: string | null = null;
        let topAppEngagements = 0;

        for (const [appId, metrics] of Object.entries(appMetrics)) {
          if (metrics.engagements > topAppEngagements) {
            topAppId = appId;
            topAppName = metrics.name;
            topAppEngagements = metrics.engagements;
          }
        }

        let topPlatform: string | null = null;
        let topPlatformEngagements = 0;

        for (const [platform, metrics] of Object.entries(platformMetrics)) {
          if (metrics.engagements > topPlatformEngagements) {
            topPlatform = platform;
            topPlatformEngagements = metrics.engagements;
          }
        }

        const engagementRate = totalImpressions > 0 ? (totalEngagements / totalImpressions) * 100 : 0;

        // Generate email summary
        const emailSummary = `
Weekly Performance Report
${new Date(weekStart).toLocaleDateString()} - ${new Date(weekEnd).toLocaleDateString()}

📊 Performance Summary
• Posts Published: ${totalPosts}
• Total Impressions: ${totalImpressions.toLocaleString()}
• Total Engagements: ${totalEngagements.toLocaleString()}
• Total Clicks: ${totalClicks.toLocaleString()}
• Engagement Rate: ${engagementRate.toFixed(2)}%

🏆 Top Performers
• Top App: ${topAppName || 'N/A'}
• Top Platform: ${topPlatform ? topPlatform.toUpperCase() : 'N/A'}

Keep up the great work!
        `;

        console.log(`[WeeklyReport] Generated report for ${user.id}:`);
        console.log(emailSummary);

        // Store report in database
        const { data: report, error: reportError } = await supabase
          .from('weekly_reports')
          .insert({
            user_id: user.id,
            period_start: weekStart.toISOString().split('T')[0],
            period_end: weekEnd.toISOString().split('T')[0],
            posts_published: totalPosts,
            total_impressions: totalImpressions,
            total_engagements: totalEngagements,
            total_clicks: totalClicks,
            top_app_id: topAppId,
            top_app_name: topAppName,
            top_platform: topPlatform,
            engagement_rate: engagementRate,
            email_sent: true,
            sent_at: new Date().toISOString(),
          })
          .select()
          .single();

        if (reportError) {
          throw reportError;
        }

        reportsGenerated++;
        console.log(`[WeeklyReport] Stored report for user ${user.id}`);
      } catch (userError) {
        console.error(`[WeeklyReport] Error processing user ${user.id}:`, userError);
        errors.push({ userId: user.id, error: String(userError) });
      }
    }

    const result = {
      message: `Generated ${reportsGenerated} weekly reports`,
      reportsGenerated,
      errors: errors.length > 0 ? errors : undefined,
    };

    console.log('[WeeklyReport] Run complete:', result);

    return new Response(
      JSON.stringify(result),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    console.error('[WeeklyReport] Fatal error:', error);
    const errorMessage = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
