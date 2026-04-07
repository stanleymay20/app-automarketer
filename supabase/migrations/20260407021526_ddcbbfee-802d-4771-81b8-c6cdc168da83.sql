
-- Add app_id column to platform_connections
ALTER TABLE public.platform_connections ADD COLUMN app_id uuid REFERENCES public.apps(id) ON DELETE CASCADE;

-- Drop the old unique constraint (user_id, platform)
ALTER TABLE public.platform_connections DROP CONSTRAINT IF EXISTS platform_connections_user_id_platform_key;

-- Add new unique constraint (user_id, platform, app_id)
CREATE UNIQUE INDEX platform_connections_user_platform_app_idx ON public.platform_connections (user_id, platform, app_id);
