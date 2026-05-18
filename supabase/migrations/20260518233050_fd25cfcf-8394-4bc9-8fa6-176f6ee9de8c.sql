
-- 1. audience_profiles (one per app)
CREATE TABLE public.audience_profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL,
  status text NOT NULL DEFAULT 'empty',
  last_generated_at timestamptz,
  raw_research text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id)
);
ALTER TABLE public.audience_profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own audience profiles" ON public.audience_profiles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_audience_profiles_updated BEFORE UPDATE ON public.audience_profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- 2. icps
CREATE TABLE public.icps (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL,
  segment text NOT NULL,
  company_size text,
  industry text,
  signals text[] DEFAULT '{}',
  notes text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.icps ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own icps" ON public.icps
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_icps_updated BEFORE UPDATE ON public.icps
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_icps_app ON public.icps(app_id);

-- 3. personas
CREATE TABLE public.personas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL,
  icp_id uuid,
  title text NOT NULL,
  company_size text,
  responsibilities text[] DEFAULT '{}',
  pains text[] DEFAULT '{}',
  goals text[] DEFAULT '{}',
  triggers text[] DEFAULT '{}',
  objections text[] DEFAULT '{}',
  channels text[] DEFAULT '{}',
  content_style text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.personas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own personas" ON public.personas
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_personas_updated BEFORE UPDATE ON public.personas
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_personas_app ON public.personas(app_id);

-- 4. journey_stages
CREATE TABLE public.journey_stages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL,
  stage text NOT NULL,
  stage_order int NOT NULL,
  customer_thinking text,
  pains text[] DEFAULT '{}',
  best_content text,
  best_cta text,
  channels text[] DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(app_id, stage)
);
ALTER TABLE public.journey_stages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own journey stages" ON public.journey_stages
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_journey_stages_updated BEFORE UPDATE ON public.journey_stages
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_journey_app ON public.journey_stages(app_id);

-- 5. messaging_angles
CREATE TABLE public.messaging_angles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  app_id uuid NOT NULL,
  angle_name text NOT NULL,
  hook_template text,
  when_to_use text,
  example text,
  sort_order int NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.messaging_angles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own angles" ON public.messaging_angles
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE TRIGGER trg_angles_updated BEFORE UPDATE ON public.messaging_angles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE INDEX idx_angles_app ON public.messaging_angles(app_id);

-- 6. Extend content with strategy tags
ALTER TABLE public.content
  ADD COLUMN persona_id uuid,
  ADD COLUMN journey_stage text,
  ADD COLUMN messaging_angle text;
