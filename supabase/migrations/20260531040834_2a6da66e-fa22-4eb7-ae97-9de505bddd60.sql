-- 1. Attribution columns
ALTER TABLE public.click_events ADD COLUMN IF NOT EXISTS distribution_target_id uuid;
ALTER TABLE public.conversions ADD COLUMN IF NOT EXISTS distribution_target_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS distribution_target_id uuid;
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS distribution_target_id uuid;
ALTER TABLE public.distribution_actions ADD COLUMN IF NOT EXISTS content_id uuid;

CREATE INDEX IF NOT EXISTS idx_click_events_dist_target ON public.click_events(distribution_target_id) WHERE distribution_target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_conversions_dist_target ON public.conversions(distribution_target_id) WHERE distribution_target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_leads_dist_target ON public.leads(distribution_target_id) WHERE distribution_target_id IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_content_dist_target ON public.content(distribution_target_id) WHERE distribution_target_id IS NOT NULL;

-- 2. Roll-up triggers
CREATE OR REPLACE FUNCTION public.bump_distribution_click()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tgt uuid;
BEGIN
  tgt := NEW.distribution_target_id;
  IF tgt IS NULL AND NEW.content_id IS NOT NULL THEN
    SELECT distribution_target_id INTO tgt FROM public.content WHERE id = NEW.content_id;
  END IF;
  IF tgt IS NOT NULL THEN
    UPDATE public.distribution_targets SET clicks_count = clicks_count + 1, updated_at = now() WHERE id = tgt;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bump_distribution_lead()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tgt uuid;
BEGIN
  tgt := NEW.distribution_target_id;
  IF tgt IS NULL AND NEW.source_content_id IS NOT NULL THEN
    SELECT distribution_target_id INTO tgt FROM public.content WHERE id = NEW.source_content_id;
  END IF;
  IF tgt IS NOT NULL THEN
    UPDATE public.distribution_targets SET leads_count = leads_count + 1, updated_at = now() WHERE id = tgt;
  END IF;
  RETURN NEW;
END $$;

CREATE OR REPLACE FUNCTION public.bump_distribution_conversion()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE tgt uuid;
BEGIN
  tgt := NEW.distribution_target_id;
  IF tgt IS NULL AND NEW.source_content_id IS NOT NULL THEN
    SELECT distribution_target_id INTO tgt FROM public.content WHERE id = NEW.source_content_id;
  END IF;
  IF tgt IS NOT NULL THEN
    UPDATE public.distribution_targets
      SET conversions_count = conversions_count + 1,
          revenue_attributed = revenue_attributed + COALESCE(NEW.amount, 0),
          updated_at = now()
      WHERE id = tgt;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_bump_dist_click ON public.click_events;
CREATE TRIGGER trg_bump_dist_click AFTER INSERT ON public.click_events
  FOR EACH ROW EXECUTE FUNCTION public.bump_distribution_click();

DROP TRIGGER IF EXISTS trg_bump_dist_lead ON public.leads;
CREATE TRIGGER trg_bump_dist_lead AFTER INSERT ON public.leads
  FOR EACH ROW EXECUTE FUNCTION public.bump_distribution_lead();

DROP TRIGGER IF EXISTS trg_bump_dist_conv ON public.conversions;
CREATE TRIGGER trg_bump_dist_conv AFTER INSERT ON public.conversions
  FOR EACH ROW EXECUTE FUNCTION public.bump_distribution_conversion();

-- 3. Decay logic for recommendations
ALTER TABLE public.distribution_recommendations
  ADD COLUMN IF NOT EXISTS original_confidence integer,
  ADD COLUMN IF NOT EXISTS status text NOT NULL DEFAULT 'active';

UPDATE public.distribution_recommendations SET original_confidence = confidence WHERE original_confidence IS NULL;

CREATE OR REPLACE FUNCTION public.set_original_confidence()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  IF NEW.original_confidence IS NULL THEN NEW.original_confidence := NEW.confidence; END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_set_original_confidence ON public.distribution_recommendations;
CREATE TRIGGER trg_set_original_confidence BEFORE INSERT ON public.distribution_recommendations
  FOR EACH ROW EXECUTE FUNCTION public.set_original_confidence();

CREATE OR REPLACE FUNCTION public.decay_distribution_recommendations()
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE public.distribution_recommendations
  SET status = 'archived'
  WHERE status = 'active' AND created_at < now() - interval '90 days';

  UPDATE public.distribution_recommendations
  SET confidence = GREATEST(0, ROUND(original_confidence * 0.8))
  WHERE status = 'active' AND created_at < now() - interval '60 days';

  UPDATE public.distribution_recommendations
  SET confidence = GREATEST(0, ROUND(original_confidence * 0.9))
  WHERE status = 'active' AND created_at < now() - interval '30 days' AND created_at >= now() - interval '60 days';
END $$;