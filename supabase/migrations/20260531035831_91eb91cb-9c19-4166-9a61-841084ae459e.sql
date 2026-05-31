CREATE TABLE public.portfolio_snapshots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid,
  computed_at timestamptz NOT NULL DEFAULT now(),
  coverage_score integer NOT NULL DEFAULT 0,
  revenue_coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  format_coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  stage_coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  angle_coverage jsonb NOT NULL DEFAULT '[]'::jsonb,
  opportunities jsonb NOT NULL DEFAULT '[]'::jsonb,
  coach_headline text,
  coach_action text,
  coach_impact text,
  totals jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.portfolio_snapshots TO authenticated;
GRANT ALL ON public.portfolio_snapshots TO service_role;

ALTER TABLE public.portfolio_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own portfolio snapshots"
ON public.portfolio_snapshots FOR ALL
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Service inserts portfolio snapshots"
ON public.portfolio_snapshots FOR INSERT
WITH CHECK (true);

CREATE INDEX idx_portfolio_snapshots_user_app ON public.portfolio_snapshots(user_id, app_id, computed_at DESC);