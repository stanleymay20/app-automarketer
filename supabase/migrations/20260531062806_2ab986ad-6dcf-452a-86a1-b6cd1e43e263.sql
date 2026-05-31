DROP POLICY IF EXISTS "Public can view apps by slug for landing pages" ON public.apps;

CREATE OR REPLACE VIEW public.public_app_landing
WITH (security_invoker = false) AS
SELECT
  id, name, landing_slug, landing_headline, landing_subheadline,
  landing_cta_label, landing_features, landing_proof, landing_objections,
  landing_brand_color, landing_template
FROM public.apps
WHERE landing_enabled = true AND landing_slug IS NOT NULL;

GRANT SELECT ON public.public_app_landing TO anon, authenticated;

DROP POLICY IF EXISTS "Service can manage scores" ON public.content_scores;
DROP POLICY IF EXISTS "Service can manage signals" ON public.performance_signals;
DROP POLICY IF EXISTS "Service role can manage weekly reports" ON public.weekly_reports;

DROP POLICY IF EXISTS "Anyone can record click events" ON public.click_events;
CREATE POLICY "Anyone can record click events"
ON public.click_events FOR INSERT TO anon, authenticated
WITH CHECK (
  (app_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.apps a
    WHERE a.id = click_events.app_id AND a.user_id = click_events.user_id
  ))
  OR
  (content_id IS NOT NULL AND EXISTS (
    SELECT 1 FROM public.content c
    WHERE c.id = click_events.content_id AND c.user_id = click_events.user_id
  ))
);

DROP POLICY IF EXISTS "Anyone can submit a lead" ON public.leads;
CREATE POLICY "Anyone can submit a lead"
ON public.leads FOR INSERT TO anon, authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.apps a
    WHERE a.id = leads.app_id
      AND a.user_id = leads.user_id
      AND a.landing_enabled = true
  )
);

DROP POLICY IF EXISTS "Service can insert conversions" ON public.conversions;
CREATE POLICY "Users can insert their own conversions"
ON public.conversions FOR INSERT TO authenticated
WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own post images" ON storage.objects;
DROP POLICY IF EXISTS "Public can view post images" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload post images" ON storage.objects;

CREATE POLICY "Users can upload their own post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can view their own post images"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can update their own post images"
ON storage.objects FOR UPDATE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
)
WITH CHECK (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);

CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'post-images'
  AND (storage.foldername(name))[1] = auth.uid()::text
);