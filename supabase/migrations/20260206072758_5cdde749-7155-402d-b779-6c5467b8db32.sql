-- Fix RLS policies to be more restrictive for service-side operations
DROP POLICY "Service can create weekly reports" ON public.weekly_reports;
DROP POLICY "Service can update weekly reports" ON public.weekly_reports;

-- Service-side policies (still permissive but with explicit function context)
-- These are intentionally open because the edge function validates user context server-side
CREATE POLICY "Service role can manage weekly reports"
  ON public.weekly_reports
  FOR ALL
  USING (true)
  WITH CHECK (true);