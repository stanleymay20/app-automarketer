
-- 1) Extend prospects with CRM/contact fields
ALTER TABLE public.prospects
  ADD COLUMN IF NOT EXISTS contact_email TEXT,
  ADD COLUMN IF NOT EXISTS contact_name TEXT,
  ADD COLUMN IF NOT EXISTS contact_linkedin TEXT,
  ADD COLUMN IF NOT EXISTS notes TEXT,
  ADD COLUMN IF NOT EXISTS owner_id UUID,
  ADD COLUMN IF NOT EXISTS next_action_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ,
  ADD COLUMN IF NOT EXISTS pipeline_stage TEXT NOT NULL DEFAULT 'new';

-- Default owner_id to user_id for existing rows
UPDATE public.prospects SET owner_id = user_id WHERE owner_id IS NULL;

-- Sync pipeline_stage from legacy status where reasonable
UPDATE public.prospects SET pipeline_stage = 'contacted' WHERE pipeline_stage = 'new' AND contacted_at IS NOT NULL;
UPDATE public.prospects SET pipeline_stage = 'responded' WHERE responded_at IS NOT NULL AND pipeline_stage IN ('new','contacted');
UPDATE public.prospects SET pipeline_stage = 'won'       WHERE converted_at IS NOT NULL;

CREATE INDEX IF NOT EXISTS prospects_pipeline_stage_idx ON public.prospects(user_id, pipeline_stage);
CREATE INDEX IF NOT EXISTS prospects_next_action_idx    ON public.prospects(user_id, next_action_at);

-- 2) Rate limiting table (ad-hoc; user requested)
CREATE TABLE IF NOT EXISTS public.ai_rate_limits (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL,
  function_name TEXT NOT NULL,
  window_start TIMESTAMPTZ NOT NULL DEFAULT date_trunc('minute', now()),
  call_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, function_name, window_start)
);

GRANT ALL ON public.ai_rate_limits TO service_role;
GRANT USAGE, SELECT ON SEQUENCE public.ai_rate_limits_id_seq TO service_role;

ALTER TABLE public.ai_rate_limits ENABLE ROW LEVEL SECURITY;

-- No anon/authenticated policies: this table is only touched by edge functions via service role.

CREATE INDEX IF NOT EXISTS ai_rate_limits_lookup_idx
  ON public.ai_rate_limits(user_id, function_name, window_start);
