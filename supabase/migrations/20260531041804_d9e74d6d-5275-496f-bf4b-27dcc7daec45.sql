
ALTER TABLE public.content
  ADD COLUMN IF NOT EXISTS campaign_id uuid,
  ADD COLUMN IF NOT EXISTS distribution_action_id uuid,
  ADD COLUMN IF NOT EXISTS distribution_source_type text;

ALTER TABLE public.campaigns
  ADD COLUMN IF NOT EXISTS seed_distribution_target_id uuid,
  ADD COLUMN IF NOT EXISTS seed_distribution_action_id uuid,
  ADD COLUMN IF NOT EXISTS seed_distribution_source_type text;

CREATE INDEX IF NOT EXISTS idx_content_campaign_id ON public.content(campaign_id);
CREATE INDEX IF NOT EXISTS idx_content_dist_target ON public.content(distribution_target_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_seed_dist_target ON public.campaigns(seed_distribution_target_id);

-- Trigger: propagate distribution lineage from campaign to content on insert
CREATE OR REPLACE FUNCTION public.propagate_distribution_lineage()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE c record;
BEGIN
  IF NEW.campaign_id IS NOT NULL
     AND (NEW.distribution_target_id IS NULL OR NEW.distribution_source_type IS NULL OR NEW.distribution_action_id IS NULL) THEN
    SELECT seed_distribution_target_id, seed_distribution_action_id, seed_distribution_source_type
      INTO c
      FROM public.campaigns WHERE id = NEW.campaign_id;
    IF FOUND THEN
      NEW.distribution_target_id    := COALESCE(NEW.distribution_target_id, c.seed_distribution_target_id);
      NEW.distribution_action_id    := COALESCE(NEW.distribution_action_id, c.seed_distribution_action_id);
      NEW.distribution_source_type  := COALESCE(NEW.distribution_source_type, c.seed_distribution_source_type);
    END IF;
  END IF;
  RETURN NEW;
END $$;

DROP TRIGGER IF EXISTS trg_content_propagate_distribution ON public.content;
CREATE TRIGGER trg_content_propagate_distribution
  BEFORE INSERT ON public.content
  FOR EACH ROW EXECUTE FUNCTION public.propagate_distribution_lineage();
