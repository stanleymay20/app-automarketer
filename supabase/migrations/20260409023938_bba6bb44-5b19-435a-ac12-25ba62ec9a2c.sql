ALTER TABLE public.content DROP CONSTRAINT content_status_check;
ALTER TABLE public.content ADD CONSTRAINT content_status_check 
  CHECK (status = ANY (ARRAY['pending', 'approved', 'published', 'rejected', 'failed']));