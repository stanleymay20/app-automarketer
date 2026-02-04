-- Create apps table
CREATE TABLE public.apps (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  target_audience TEXT,
  primary_goal TEXT CHECK (primary_goal IN ('growth', 'installs', 'signups', 'engagement', 'awareness')),
  brand_tone TEXT CHECK (brand_tone IN ('professional', 'friendly', 'bold', 'casual', 'faith-aligned', 'technical')),
  website_url TEXT,
  platforms TEXT[] DEFAULT '{}',
  posts_count INTEGER DEFAULT 0,
  engagements_count INTEGER DEFAULT 0,
  traffic_count INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create content table
CREATE TABLE public.content (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL,
  app_id UUID REFERENCES public.apps(id) ON DELETE CASCADE NOT NULL,
  platform TEXT NOT NULL,
  content_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'published', 'rejected')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  engagements INTEGER DEFAULT 0,
  impressions INTEGER DEFAULT 0,
  clicks INTEGER DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_settings table
CREATE TABLE public.user_settings (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES auth.users NOT NULL UNIQUE,
  autopilot_mode BOOLEAN DEFAULT false,
  approval_mode BOOLEAN DEFAULT true,
  smart_scheduling BOOLEAN DEFAULT true,
  default_brand_tone TEXT DEFAULT 'professional',
  notification_content_ready BOOLEAN DEFAULT true,
  notification_post_published BOOLEAN DEFAULT true,
  notification_weekly_report BOOLEAN DEFAULT true,
  notification_engagement_alerts BOOLEAN DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.content ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_settings ENABLE ROW LEVEL SECURITY;

-- Apps policies
CREATE POLICY "Users can view their own apps" 
ON public.apps FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own apps" 
ON public.apps FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own apps" 
ON public.apps FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own apps" 
ON public.apps FOR DELETE USING (auth.uid() = user_id);

-- Content policies
CREATE POLICY "Users can view their own content" 
ON public.content FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own content" 
ON public.content FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own content" 
ON public.content FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own content" 
ON public.content FOR DELETE USING (auth.uid() = user_id);

-- User settings policies
CREATE POLICY "Users can view their own settings" 
ON public.user_settings FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own settings" 
ON public.user_settings FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own settings" 
ON public.user_settings FOR UPDATE USING (auth.uid() = user_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for automatic timestamp updates
CREATE TRIGGER update_apps_updated_at
BEFORE UPDATE ON public.apps
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_content_updated_at
BEFORE UPDATE ON public.content
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_user_settings_updated_at
BEFORE UPDATE ON public.user_settings
FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Create indexes for better performance
CREATE INDEX idx_apps_user_id ON public.apps(user_id);
CREATE INDEX idx_content_user_id ON public.content(user_id);
CREATE INDEX idx_content_app_id ON public.content(app_id);
CREATE INDEX idx_content_status ON public.content(status);
CREATE INDEX idx_content_scheduled_for ON public.content(scheduled_for);