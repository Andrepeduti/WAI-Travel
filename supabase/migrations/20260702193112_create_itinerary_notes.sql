CREATE TABLE public.itinerary_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  author text NOT NULL DEFAULT '',
  author_image text NOT NULL DEFAULT '',
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  position integer NOT NULL DEFAULT 0,
  client_id text NOT NULL,
  created_at timestamp with time zone NOT NULL DEFAULT now(),
  updated_at timestamp with time zone NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_notes_itinerary_id ON public.itinerary_notes(itinerary_id);
CREATE INDEX idx_itinerary_notes_user_id ON public.itinerary_notes(user_id);

ALTER TABLE public.itinerary_notes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view notes of their itineraries"
ON public.itinerary_notes
FOR SELECT
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_notes.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can insert notes into their itineraries"
ON public.itinerary_notes
FOR INSERT
TO authenticated
WITH CHECK (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_notes.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can update notes of their itineraries"
ON public.itinerary_notes
FOR UPDATE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_notes.itinerary_id
    AND im.user_id = auth.uid()
  )
);

CREATE POLICY "Users can delete notes of their itineraries"
ON public.itinerary_notes
FOR DELETE
TO authenticated
USING (
  user_id = auth.uid() OR 
  EXISTS (
    SELECT 1 FROM public.itinerary_members im
    WHERE im.itinerary_id = itinerary_notes.itinerary_id
    AND im.user_id = auth.uid()
  )
);
