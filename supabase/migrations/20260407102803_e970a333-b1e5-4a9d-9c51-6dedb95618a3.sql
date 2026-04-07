ALTER TABLE public.automation_policies
  ADD COLUMN auto_publish_enabled boolean NOT NULL DEFAULT false,
  ADD COLUMN auto_publish_time time DEFAULT '09:00';