DROP VIEW IF EXISTS public.public_app_landing;

CREATE OR REPLACE FUNCTION public.get_public_landing(_slug text)
RETURNS TABLE (
  id uuid,
  name text,
  landing_slug text,
  landing_headline text,
  landing_subheadline text,
  landing_cta_label text,
  landing_features jsonb,
  landing_proof jsonb,
  landing_objections jsonb,
  landing_brand_color text,
  landing_template text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id, name, landing_slug, landing_headline, landing_subheadline,
         landing_cta_label, landing_features, landing_proof, landing_objections,
         landing_brand_color, landing_template
  FROM public.apps
  WHERE landing_slug = _slug
    AND landing_enabled = true
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.get_public_landing(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_landing(text) TO anon, authenticated;