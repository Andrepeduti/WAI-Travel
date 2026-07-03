DROP POLICY IF EXISTS "Collaborator can view notes" ON public.itinerary_notes;
CREATE POLICY "Collaborator can view notes" ON public.itinerary_notes
FOR SELECT TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itinerary_notes.itinerary_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "Collaborator can insert notes" ON public.itinerary_notes;
CREATE POLICY "Collaborator can insert notes" ON public.itinerary_notes
FOR INSERT TO authenticated
WITH CHECK (EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itinerary_notes.itinerary_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "Collaborator can update notes" ON public.itinerary_notes;
CREATE POLICY "Collaborator can update notes" ON public.itinerary_notes
FOR UPDATE TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itinerary_notes.itinerary_id AND m.user_id = auth.uid()));

DROP POLICY IF EXISTS "Collaborator can delete notes" ON public.itinerary_notes;
CREATE POLICY "Collaborator can delete notes" ON public.itinerary_notes
FOR DELETE TO authenticated
USING (EXISTS (SELECT 1 FROM public.itinerary_members m WHERE m.itinerary_id = itinerary_notes.itinerary_id AND m.user_id = auth.uid()));
