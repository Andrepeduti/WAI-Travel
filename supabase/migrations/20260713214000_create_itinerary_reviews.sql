-- Migration to create itinerary_reviews table

CREATE TABLE IF NOT EXISTS public.itinerary_reviews (
  id uuid NOT NULL DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.profiles_public(user_id) ON DELETE CASCADE,
  rating smallint NOT NULL CHECK (rating >= 1 AND rating <= 5),
  comment text,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  CONSTRAINT itinerary_reviews_pkey PRIMARY KEY (id),
  CONSTRAINT itinerary_reviews_user_itinerary_unique UNIQUE (itinerary_id, user_id)
);

-- Enable RLS
ALTER TABLE public.itinerary_reviews ENABLE ROW LEVEL SECURITY;

-- Policies
CREATE POLICY "Reviews are viewable by everyone" ON public.itinerary_reviews
  FOR SELECT USING (true);

CREATE POLICY "Users can insert their own reviews" ON public.itinerary_reviews
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reviews" ON public.itinerary_reviews
  FOR UPDATE USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reviews" ON public.itinerary_reviews
  FOR DELETE USING (auth.uid() = user_id);

-- Create a function and trigger to update `updated_at` (Check if function already exists first to avoid error, usually handle_updated_at is generic or we can just create it if not exists, but let's use a specific name just in case)
CREATE OR REPLACE FUNCTION public.set_current_timestamp_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_itinerary_reviews_updated_at
  BEFORE UPDATE ON public.itinerary_reviews
  FOR EACH ROW
  EXECUTE PROCEDURE public.set_current_timestamp_updated_at();

-- Add grants
GRANT ALL ON TABLE public.itinerary_reviews TO anon;
GRANT ALL ON TABLE public.itinerary_reviews TO authenticated;
GRANT ALL ON TABLE public.itinerary_reviews TO service_role;
