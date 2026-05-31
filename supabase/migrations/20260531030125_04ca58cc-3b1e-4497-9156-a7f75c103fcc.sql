
-- Market signals
CREATE TABLE public.market_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  signal_type text NOT NULL,
  title text NOT NULL,
  description text,
  source text,
  confidence_score integer NOT NULL DEFAULT 50,
  impact_score integer NOT NULL DEFAULT 50,
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.market_signals TO authenticated;
GRANT ALL ON public.market_signals TO service_role;
ALTER TABLE public.market_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own market signals" ON public.market_signals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service inserts market signals" ON public.market_signals
  FOR INSERT WITH CHECK (true);

-- Competitor signals
CREATE TABLE public.competitor_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  competitor_name text NOT NULL,
  signal_type text NOT NULL,
  description text,
  impact_score integer NOT NULL DEFAULT 50,
  source_url text,
  recommended_response text,
  detected_at timestamptz NOT NULL DEFAULT now(),
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.competitor_signals TO authenticated;
GRANT ALL ON public.competitor_signals TO service_role;
ALTER TABLE public.competitor_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own competitor signals" ON public.competitor_signals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service inserts competitor signals" ON public.competitor_signals
  FOR INSERT WITH CHECK (true);

-- Opportunities
CREATE TABLE public.opportunities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  title text NOT NULL,
  category text NOT NULL,
  description text,
  deadline date,
  relevance_score integer NOT NULL DEFAULT 50,
  url text,
  recommendation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.opportunities TO authenticated;
GRANT ALL ON public.opportunities TO service_role;
ALTER TABLE public.opportunities ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own opportunities" ON public.opportunities
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service inserts opportunities" ON public.opportunities
  FOR INSERT WITH CHECK (true);

-- Customer signals
CREATE TABLE public.customer_signals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  audience text NOT NULL,
  topic text NOT NULL,
  sentiment text,
  trend_score integer NOT NULL DEFAULT 50,
  recommendation text,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.customer_signals TO authenticated;
GRANT ALL ON public.customer_signals TO service_role;
ALTER TABLE public.customer_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own customer signals" ON public.customer_signals
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service inserts customer signals" ON public.customer_signals
  FOR INSERT WITH CHECK (true);

-- Growth recommendations
CREATE TABLE public.growth_recommendations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  recommendation_type text NOT NULL,
  title text NOT NULL,
  explanation text,
  confidence_score integer NOT NULL DEFAULT 50,
  expected_impact text,
  supporting_signal_ids jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'new',
  created_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.growth_recommendations TO authenticated;
GRANT ALL ON public.growth_recommendations TO service_role;
ALTER TABLE public.growth_recommendations ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own growth recommendations" ON public.growth_recommendations
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Service inserts growth recommendations" ON public.growth_recommendations
  FOR INSERT WITH CHECK (true);

CREATE INDEX idx_market_signals_user ON public.market_signals(user_id, detected_at DESC);
CREATE INDEX idx_competitor_signals_user ON public.competitor_signals(user_id, detected_at DESC);
CREATE INDEX idx_opportunities_user ON public.opportunities(user_id, deadline);
CREATE INDEX idx_customer_signals_user ON public.customer_signals(user_id, trend_score DESC);
CREATE INDEX idx_growth_recs_user ON public.growth_recommendations(user_id, created_at DESC);
