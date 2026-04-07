-- Add image_url column to content table
ALTER TABLE public.content ADD COLUMN IF NOT EXISTS image_url text DEFAULT NULL;

-- Create storage bucket for post images
INSERT INTO storage.buckets (id, name, public)
VALUES ('post-images', 'post-images', true)
ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload post images
CREATE POLICY "Authenticated users can upload post images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'post-images');

-- Allow public read access to post images
CREATE POLICY "Public can view post images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'post-images');

-- Allow users to delete their own post images
CREATE POLICY "Users can delete their own post images"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'post-images');