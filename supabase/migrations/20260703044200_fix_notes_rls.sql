DROP POLICY IF EXISTS "Owner can view notes" ON public.itinerary_notes;

CREATE POLICY "Owner can view notes" ON public.itinerary_notes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_notes.itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Owner can insert notes" ON public.itinerary_notes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_notes.itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Owner can update notes" ON public.itinerary_notes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_notes.itinerary_id AND i.user_id = auth.uid()));

CREATE POLICY "Owner can delete notes" ON public.itinerary_notes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.itineraries i WHERE i.id = itinerary_notes.itinerary_id AND i.user_id = auth.uid()));
