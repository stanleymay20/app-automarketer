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
 
     console.log('[Publisher] Starting scheduled content publishing run...');
 
     // Query approved content that's ready to publish
     const now = new Date().toISOString();
     const { data: contentToPublish, error: fetchError } = await supabase
       .from('content')
       .select('id, platform, content_text, app_id, scheduled_for')
       .eq('status', 'approved')
       .lte('scheduled_for', now)
       .is('published_at', null);
 
     if (fetchError) {
       console.error('[Publisher] Error fetching content:', fetchError);
       throw fetchError;
     }
 
     if (!contentToPublish || contentToPublish.length === 0) {
       console.log('[Publisher] No content ready to publish');
       return new Response(
         JSON.stringify({ message: 'No content to publish', published: 0 }),
         { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
       );
     }
 
     console.log(`[Publisher] Found ${contentToPublish.length} items to publish`);
 
     const publishedIds: string[] = [];
     const errors: { id: string; error: string }[] = [];
 
     for (const item of contentToPublish) {
       try {
         // Simulate publishing to platform
         console.log(`[Publisher] Publishing to ${item.platform}: "${item.content_text.substring(0, 50)}..."`);
         
         // In the future, this is where real API calls would go:
         // await publishToX(item.content_text);
         // await publishToLinkedIn(item.content_text);
         // etc.
 
         // Mark as published
         const { error: updateError } = await supabase
           .from('content')
           .update({ 
             status: 'published', 
             published_at: new Date().toISOString() 
           })
           .eq('id', item.id)
           .eq('status', 'approved') // Idempotency: only update if still approved
           .is('published_at', null); // Idempotency: only if not already published
 
         if (updateError) {
           console.error(`[Publisher] Error updating content ${item.id}:`, updateError);
           errors.push({ id: item.id, error: updateError.message });
         } else {
           publishedIds.push(item.id);
           console.log(`[Publisher] Successfully published content ${item.id} to ${item.platform}`);
         }
       } catch (itemError) {
         console.error(`[Publisher] Error processing content ${item.id}:`, itemError);
         errors.push({ id: item.id, error: String(itemError) });
       }
     }
 
     const result = {
       message: `Published ${publishedIds.length} items`,
       published: publishedIds.length,
       publishedIds,
       errors: errors.length > 0 ? errors : undefined,
     };
 
     console.log('[Publisher] Run complete:', result);
 
     return new Response(
       JSON.stringify(result),
       { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   } catch (error) {
     console.error('[Publisher] Fatal error:', error);
     const errorMessage = error instanceof Error ? error.message : String(error);
     return new Response(
       JSON.stringify({ error: errorMessage }),
       { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
     );
   }
 });