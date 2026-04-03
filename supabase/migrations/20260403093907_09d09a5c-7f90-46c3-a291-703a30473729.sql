
-- Growth Goals
CREATE TABLE public.growth_goals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE NOT NULL,
  goal_type TEXT NOT NULL DEFAULT 'awareness',
  target_value INTEGER NOT NULL DEFAULT 100,
  current_value INTEGER NOT NULL DEFAULT 0,
  start_date DATE NOT NULL DEFAULT CURRENT_DATE,
  end_date DATE NOT NULL DEFAULT (CURRENT_DATE + INTERVAL '30 days'),
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.growth_goals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own goals" ON public.growth_goals FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Automation Policies
CREATE TABLE public.automation_policies (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  auto_approve_enabled BOOLEAN NOT NULL DEFAULT false,
  min_quality_score INTEGER NOT NULL DEFAULT 85,
  max_posts_per_day INTEGER NOT NULL DEFAULT 4,
  quiet_hours_start INTEGER DEFAULT 22,
  quiet_hours_end INTEGER DEFAULT 6,
  escalation_mode TEXT NOT NULL DEFAULT 'alert',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(user_id)
);
ALTER TABLE public.automation_policies ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own policies" ON public.automation_policies FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Content Scores
CREATE TABLE public.content_scores (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  quality_score INTEGER NOT NULL DEFAULT 0,
  clarity_score INTEGER NOT NULL DEFAULT 0,
  brand_score INTEGER NOT NULL DEFAULT 0,
  risk_score INTEGER NOT NULL DEFAULT 0,
  conversion_score INTEGER NOT NULL DEFAULT 0,
  auto_approved BOOLEAN NOT NULL DEFAULT false,
  reasons TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE(content_id)
);
ALTER TABLE public.content_scores ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view scores for their content" ON public.content_scores FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.content WHERE content.id = content_scores.content_id AND content.user_id = auth.uid())
);
CREATE POLICY "Service can manage scores" ON public.content_scores FOR ALL USING (true) WITH CHECK (true);

-- Performance Signals
CREATE TABLE public.performance_signals (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  content_id UUID REFERENCES public.content(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  impressions INTEGER NOT NULL DEFAULT 0,
  likes INTEGER NOT NULL DEFAULT 0,
  comments INTEGER NOT NULL DEFAULT 0,
  reposts INTEGER NOT NULL DEFAULT 0,
  clicks INTEGER NOT NULL DEFAULT 0,
  conversions INTEGER NOT NULL DEFAULT 0,
  captured_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.performance_signals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own signals" ON public.performance_signals FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.content WHERE content.id = performance_signals.content_id AND content.user_id = auth.uid())
);
CREATE POLICY "Service can manage signals" ON public.performance_signals FOR ALL USING (true) WITH CHECK (true);

-- Learning Insights
CREATE TABLE public.learning_insights (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  platform TEXT,
  insight_type TEXT NOT NULL DEFAULT 'pattern',
  insight_text TEXT NOT NULL,
  confidence NUMERIC NOT NULL DEFAULT 0.5,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.learning_insights ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own insights" ON public.learning_insights FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Campaigns
CREATE TABLE public.campaigns (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE NOT NULL,
  user_id UUID NOT NULL,
  goal_id UUID REFERENCES public.growth_goals(id) ON DELETE SET NULL,
  campaign_name TEXT NOT NULL,
  strategy_summary TEXT,
  themes TEXT[] DEFAULT '{}',
  platform_mix TEXT[] DEFAULT '{}',
  posting_frequency INTEGER NOT NULL DEFAULT 3,
  active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.campaigns ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can manage their own campaigns" ON public.campaigns FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Audit Log
CREATE TABLE public.automation_audit_log (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  action_type TEXT NOT NULL,
  entity_type TEXT NOT NULL,
  entity_id UUID,
  details JSONB DEFAULT '{}',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);
ALTER TABLE public.automation_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view their own audit logs" ON public.automation_audit_log FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Service can insert audit logs" ON public.automation_audit_log FOR INSERT WITH CHECK (true);
