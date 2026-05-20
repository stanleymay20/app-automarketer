
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS landing_features jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_proof jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_objections jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS landing_template text NOT NULL DEFAULT 'executive',
  ADD COLUMN IF NOT EXISTS landing_persona_id uuid,
  ADD COLUMN IF NOT EXISTS landing_brand_color text;

CREATE INDEX IF NOT EXISTS idx_learning_insights_app_type ON public.learning_insights (app_id, insight_type, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_click_events_content ON public.click_events (content_id);
CREATE INDEX IF NOT EXISTS idx_leads_content ON public.leads (source_content_id);
CREATE INDEX IF NOT EXISTS idx_conversions_content ON public.conversions (source_content_id);
