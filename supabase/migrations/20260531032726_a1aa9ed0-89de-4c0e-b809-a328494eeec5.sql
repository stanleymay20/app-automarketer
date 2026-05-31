
ALTER TABLE public.growth_recommendations
  ADD COLUMN IF NOT EXISTS accepted_at timestamptz,
  ADD COLUMN IF NOT EXISTS dismissed_at timestamptz,
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS landing_app_id uuid,
  ADD COLUMN IF NOT EXISTS creative_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS published_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS conversions_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS revenue_attributed numeric NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS evidence_summary text,
  ADD COLUMN IF NOT EXISTS persona_id uuid,
  ADD COLUMN IF NOT EXISTS journey_stage text,
  ADD COLUMN IF NOT EXISTS angle text,
  ADD COLUMN IF NOT EXISTS suggested_platform text;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS seed_recommendation_id uuid;

ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS seed_recommendation_id uuid;

CREATE INDEX IF NOT EXISTS idx_growth_recs_status ON public.growth_recommendations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_content_seed_rec ON public.content(seed_recommendation_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_seed_rec ON public.campaigns(seed_recommendation_id);
