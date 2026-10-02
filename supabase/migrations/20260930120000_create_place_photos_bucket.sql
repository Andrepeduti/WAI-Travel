-- Bucket público de leitura para fotos de lugares.
-- Escrita é feita apenas pela edge function save-place-photos (service role).
INSERT INTO storage.buckets (id, name, public)
VALUES ('place-photos', 'place-photos', true)
ON CONFLICT (id) DO UPDATE SET public = true;

DROP POLICY IF EXISTS "Place photos are publicly readable" ON storage.objects;
CREATE POLICY "Place photos are publicly readable"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'place-photos');
