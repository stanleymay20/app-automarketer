
CREATE TABLE public.distribution_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  target_type text NOT NULL, -- channel | community | influencer | event
  platform text,             -- linkedin | x | reddit | facebook | instagram | tiktok | youtube | email | medium | hackernews | producthunt | discord | slack | other
  name text NOT NULL,
  description text,
  url text,
  audience text,
  -- scoring (0-100)
  audience_fit int NOT NULL DEFAULT 50,
  reach_potential int NOT NULL DEFAULT 50,
  competition_level int NOT NULL DEFAULT 50, -- higher = worse
  cost_score int NOT NULL DEFAULT 50,        -- higher = cheaper
  conversion_potential int NOT NULL DEFAULT 50,
  distribution_score int NOT NULL DEFAULT 50,
  rationale text,
  signals jsonb NOT NULL DEFAULT '[]'::jsonb,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  -- lifecycle
  status text NOT NULL DEFAULT 'new', -- new | saved | active | contacted | converted | dismissed
  saved_at timestamptz,
  activated_at timestamptz,
  contacted_at timestamptz,
  -- learning loop / attribution
  posts_count int NOT NULL DEFAULT 0,
  clicks_count int NOT NULL DEFAULT 0,
  leads_count int NOT NULL DEFAULT 0,
  conversions_count int NOT NULL DEFAULT 0,
  revenue_attributed numeric NOT NULL DEFAULT 0,
  -- meta
  source text NOT NULL DEFAULT 'ai_discovery',
  event_date date,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_targets TO authenticated;
GRANT ALL ON public.distribution_targets TO service_role;

ALTER TABLE public.distribution_targets ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own distribution targets" ON public.distribution_targets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service inserts distribution targets" ON public.distribution_targets
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_dist_targets_user_type ON public.distribution_targets(user_id, target_type, distribution_score DESC);
CREATE INDEX idx_dist_targets_status ON public.distribution_targets(user_id, status);

CREATE TRIGGER trg_distribution_targets_updated_at
  BEFORE UPDATE ON public.distribution_targets
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Actions: drafts + learning-loop events
CREATE TABLE public.distribution_actions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  target_id uuid NOT NULL,
  action_type text NOT NULL, -- channel_campaign | community_outreach | influencer_outreach | event_strategy | view | save | activate | contact | convert | dismiss
  channel text,
  subject text,
  body text,
  campaign_id uuid,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_actions TO authenticated;
GRANT ALL ON public.distribution_actions TO service_role;

ALTER TABLE public.distribution_actions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own distribution actions" ON public.distribution_actions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX idx_dist_actions_target ON public.distribution_actions(target_id, created_at DESC);

-- AI recommendations for the distribution dashboard
CREATE TABLE public.distribution_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  insight text NOT NULL,
  recommendation text,
  basis text NOT NULL DEFAULT 'hypothesis', -- attribution | signal | hypothesis
  confidence int NOT NULL DEFAULT 50,
  related_platform text,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.distribution_recommendations TO authenticated;
GRANT ALL ON public.distribution_recommendations TO service_role;

ALTER TABLE public.distribution_recommendations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own distribution recs" ON public.distribution_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service inserts distribution recs" ON public.distribution_recommendations
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_dist_recs_user ON public.distribution_recommendations(user_id, created_at DESC);
