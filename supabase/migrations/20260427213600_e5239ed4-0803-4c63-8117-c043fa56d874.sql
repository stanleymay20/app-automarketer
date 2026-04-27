
-- Grants catalog
CREATE TABLE public.grants (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  title TEXT NOT NULL,
  provider TEXT,
  country TEXT,
  deadline DATE,
  url TEXT NOT NULL,
  eligibility_summary TEXT,
  funding_amount TEXT,
  description TEXT,
  tags TEXT[] DEFAULT '{}',
  fit_score INTEGER NOT NULL DEFAULT 0,
  fit_reasoning TEXT,
  status TEXT NOT NULL DEFAULT 'new', -- new | qualified | dismissed | applied | won | lost
  source TEXT NOT NULL DEFAULT 'manual', -- manual | perplexity | firecrawl | seed
  enriched_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grants ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own grants"
  ON public.grants FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own grants"
  ON public.grants FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own grants"
  ON public.grants FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own grants"
  ON public.grants FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_grants_user_status ON public.grants(user_id, status);
CREATE INDEX idx_grants_deadline ON public.grants(deadline);

CREATE TRIGGER update_grants_updated_at
  BEFORE UPDATE ON public.grants
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Grant applications
CREATE TABLE public.grant_applications (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  grant_id UUID NOT NULL REFERENCES public.grants(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'draft', -- draft | approved | submitted | won | lost
  generated_pitch TEXT,
  answers_json JSONB DEFAULT '{}'::jsonb,
  notes TEXT,
  submitted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE public.grant_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own applications"
  ON public.grant_applications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own applications"
  ON public.grant_applications FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own applications"
  ON public.grant_applications FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own applications"
  ON public.grant_applications FOR DELETE USING (auth.uid() = user_id);

CREATE INDEX idx_applications_user_status ON public.grant_applications(user_id, status);

CREATE TRIGGER update_grant_applications_updated_at
  BEFORE UPDATE ON public.grant_applications
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
