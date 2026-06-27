-- 1) Realtime: REPLICA IDENTITY FULL + adicionar à publication supabase_realtime
ALTER TABLE public.itineraries REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_activities REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_transports REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_reservations REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_doc_transports REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_members REPLICA IDENTITY FULL;
ALTER TABLE public.itinerary_invites REPLICA IDENTITY FULL;

DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itineraries; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_activities; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_transports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_reservations; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_doc_transports; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_members; EXCEPTION WHEN duplicate_object THEN NULL; END;
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_invites; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;

-- 2) Tabela de orçamento compartilhado
CREATE TABLE public.itinerary_expenses (
  id uuid NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  category text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  amount_cents integer NOT NULL DEFAULT 0,
  currency text NOT NULL DEFAULT 'BRL',
  paid_by uuid,
  assigned_to uuid[] NOT NULL DEFAULT '{}'::uuid[],
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_expenses_itinerary ON public.itinerary_expenses(itinerary_id);

ALTER TABLE public.itinerary_expenses ENABLE ROW LEVEL SECURITY;

-- Owner / próprios registros
CREATE POLICY "Users can view their own expenses"
  ON public.itinerary_expenses FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own expenses"
  ON public.itinerary_expenses FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own expenses"
  ON public.itinerary_expenses FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own expenses"
  ON public.itinerary_expenses FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Membros / editores
CREATE POLICY "Members can view expenses"
  ON public.itinerary_expenses FOR SELECT
  TO authenticated
  USING (public.can_view_itinerary(itinerary_id, auth.uid()));

CREATE POLICY "Editors can insert expenses"
  ON public.itinerary_expenses FOR INSERT
  TO authenticated
  WITH CHECK (public.can_edit_itinerary(itinerary_id, auth.uid()));

CREATE POLICY "Editors can update expenses"
  ON public.itinerary_expenses FOR UPDATE
  TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

CREATE POLICY "Editors can delete expenses"
  ON public.itinerary_expenses FOR DELETE
  TO authenticated
  USING (public.can_edit_itinerary(itinerary_id, auth.uid()));

CREATE POLICY "Public itinerary expenses are viewable"
  ON public.itinerary_expenses FOR SELECT
  TO authenticated
  USING (public.is_itinerary_public(itinerary_id));

-- Trigger updated_at
CREATE TRIGGER update_itinerary_expenses_updated_at
  BEFORE UPDATE ON public.itinerary_expenses
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Realtime
ALTER TABLE public.itinerary_expenses REPLICA IDENTITY FULL;
DO $$
BEGIN
  BEGIN ALTER PUBLICATION supabase_realtime ADD TABLE public.itinerary_expenses; EXCEPTION WHEN duplicate_object THEN NULL; END;
END $$;
