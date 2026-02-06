-- Create weekly_reports table for storing email history
CREATE TABLE public.weekly_reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  posts_published INTEGER NOT NULL DEFAULT 0,
  total_impressions INTEGER NOT NULL DEFAULT 0,
  total_engagements INTEGER NOT NULL DEFAULT 0,
  total_clicks INTEGER NOT NULL DEFAULT 0,
  top_app_id UUID,
  top_app_name TEXT,
  top_platform TEXT,
  engagement_rate NUMERIC,
  email_sent BOOLEAN NOT NULL DEFAULT false,
  sent_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.weekly_reports ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their own weekly reports"
  ON public.weekly_reports
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Service can create weekly reports"
  ON public.weekly_reports
  FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Service can update weekly reports"
  ON public.weekly_reports
  FOR UPDATE
  USING (true);

-- Create index for efficient querying
CREATE INDEX idx_weekly_reports_user_id ON public.weekly_reports(user_id);
CREATE INDEX idx_weekly_reports_period ON public.weekly_reports(user_id, period_start DESC);