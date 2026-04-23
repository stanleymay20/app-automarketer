-- Add landing page fields to apps
ALTER TABLE public.apps
  ADD COLUMN IF NOT EXISTS landing_slug TEXT UNIQUE,
  ADD COLUMN IF NOT EXISTS landing_headline TEXT,
  ADD COLUMN IF NOT EXISTS landing_subheadline TEXT,
  ADD COLUMN IF NOT EXISTS landing_cta_label TEXT DEFAULT 'Get early access',
  ADD COLUMN IF NOT EXISTS landing_enabled BOOLEAN NOT NULL DEFAULT true;

-- Backfill slugs for existing apps
UPDATE public.apps
SET landing_slug = lower(regexp_replace(name, '[^a-zA-Z0-9]+', '-', 'g')) || '-' || substr(id::text, 1, 6)
WHERE landing_slug IS NULL;

-- Allow public read of landing-page-relevant app fields by slug
CREATE POLICY "Public can view apps by slug for landing pages"
  ON public.apps FOR SELECT
  USING (landing_enabled = true AND landing_slug IS NOT NULL);

-- click_events: every click on a tracked post link
CREATE TABLE public.click_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,
  user_agent TEXT,
  referrer TEXT,
  ip_hash TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_click_events_content ON public.click_events(content_id);
CREATE INDEX idx_click_events_app ON public.click_events(app_id);
CREATE INDEX idx_click_events_user ON public.click_events(user_id);
ALTER TABLE public.click_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can record click events"
  ON public.click_events FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own click events"
  ON public.click_events FOR SELECT
  USING (auth.uid() = user_id);

-- leads: captured leads tied to source content/app
CREATE TABLE public.leads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  source_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  email TEXT NOT NULL,
  name TEXT,
  platform TEXT,
  status TEXT NOT NULL DEFAULT 'new',
  lead_score INTEGER NOT NULL DEFAULT 50,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_leads_user ON public.leads(user_id);
CREATE INDEX idx_leads_app ON public.leads(app_id);
CREATE INDEX idx_leads_content ON public.leads(source_content_id);
CREATE UNIQUE INDEX idx_leads_app_email ON public.leads(app_id, lower(email));
ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can submit a lead"
  ON public.leads FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own leads"
  ON public.leads FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own leads"
  ON public.leads FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own leads"
  ON public.leads FOR DELETE
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_leads_updated_at
  BEFORE UPDATE ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- conversions: revenue events tied to a lead
CREATE TABLE public.conversions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  lead_id UUID NOT NULL REFERENCES public.leads(id) ON DELETE CASCADE,
  app_id UUID NOT NULL REFERENCES public.apps(id) ON DELETE CASCADE,
  source_content_id UUID REFERENCES public.content(id) ON DELETE SET NULL,
  amount NUMERIC(12,2) NOT NULL DEFAULT 0,
  currency TEXT NOT NULL DEFAULT 'USD',
  source TEXT NOT NULL DEFAULT 'manual',
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_conversions_user ON public.conversions(user_id);
CREATE INDEX idx_conversions_app ON public.conversions(app_id);
CREATE INDEX idx_conversions_lead ON public.conversions(lead_id);
CREATE INDEX idx_conversions_content ON public.conversions(source_content_id);
ALTER TABLE public.conversions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Service can insert conversions"
  ON public.conversions FOR INSERT
  WITH CHECK (true);
CREATE POLICY "Users can view their own conversions"
  ON public.conversions FOR SELECT
  USING (auth.uid() = user_id);
CREATE POLICY "Users can update their own conversions"
  ON public.conversions FOR UPDATE
  USING (auth.uid() = user_id);
CREATE POLICY "Users can delete their own conversions"
  ON public.conversions FOR DELETE
  USING (auth.uid() = user_id);