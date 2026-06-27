-- Add publish state to itineraries
ALTER TABLE public.itineraries
  ADD COLUMN IF NOT EXISTS is_public boolean NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS price_cents integer;

-- Index to quickly list public itineraries
CREATE INDEX IF NOT EXISTS itineraries_is_public_idx
  ON public.itineraries (is_public)
  WHERE is_public = true;

-- Allow authenticated users to view itineraries that have been made public
CREATE POLICY "Public itineraries are viewable by authenticated users"
ON public.itineraries
FOR SELECT
TO authenticated
USING (is_public = true);
