-- =========================================================
-- itinerary_reservations  (hospedagem | atividade)
-- =========================================================
CREATE TABLE public.itinerary_reservations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  tipo text NOT NULL DEFAULT 'hospedagem',
  nome text NOT NULL DEFAULT '',
  localizacao text NOT NULL DEFAULT '',
  check_in_at timestamptz,
  check_in_hora text,
  check_in_minuto text,
  check_out_at timestamptz,
  check_out_hora text,
  check_out_minuto text,
  atividade_at timestamptz,
  atividade_hora text,
  atividade_minuto text,
  codigo text,
  valor text,
  attachment_path text,
  attachment_name text,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_reservations_lookup
  ON public.itinerary_reservations (itinerary_id, position);
CREATE INDEX idx_itinerary_reservations_user
  ON public.itinerary_reservations (user_id);

ALTER TABLE public.itinerary_reservations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own reservations"
  ON public.itinerary_reservations FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public itinerary reservations are viewable"
  ON public.itinerary_reservations FOR SELECT TO authenticated
  USING (public.is_itinerary_public(itinerary_id));

CREATE POLICY "Users can insert their own reservations"
  ON public.itinerary_reservations FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own reservations"
  ON public.itinerary_reservations FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own reservations"
  ON public.itinerary_reservations FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_itinerary_reservations_updated_at
  BEFORE UPDATE ON public.itinerary_reservations
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- itinerary_doc_transports  (voo | trem | onibus | carro)
-- =========================================================
CREATE TABLE public.itinerary_doc_transports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  itinerary_id uuid NOT NULL,
  user_id uuid NOT NULL,
  client_id text NOT NULL,
  tipo text NOT NULL DEFAULT 'voo',
  nome text NOT NULL DEFAULT '',
  origem text NOT NULL DEFAULT '',
  destino text NOT NULL DEFAULT '',
  partida_at timestamptz,
  partida_hora text,
  partida_minuto text,
  chegada_at timestamptz,
  chegada_hora text,
  chegada_minuto text,
  codigo text,
  valor text,
  attachment_path text,
  attachment_name text,
  position integer NOT NULL DEFAULT 0,
  metadata jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_itinerary_doc_transports_lookup
  ON public.itinerary_doc_transports (itinerary_id, position);
CREATE INDEX idx_itinerary_doc_transports_user
  ON public.itinerary_doc_transports (user_id);

ALTER TABLE public.itinerary_doc_transports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own doc transports"
  ON public.itinerary_doc_transports FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Public itinerary doc transports are viewable"
  ON public.itinerary_doc_transports FOR SELECT TO authenticated
  USING (public.is_itinerary_public(itinerary_id));

CREATE POLICY "Users can insert their own doc transports"
  ON public.itinerary_doc_transports FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own doc transports"
  ON public.itinerary_doc_transports FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own doc transports"
  ON public.itinerary_doc_transports FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

CREATE TRIGGER trg_itinerary_doc_transports_updated_at
  BEFORE UPDATE ON public.itinerary_doc_transports
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- =========================================================
-- Storage bucket privado para anexos dos documentos
-- Pasta raiz = {user_id}/  (RLS verifica via storage.foldername)
-- =========================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('itinerary-documents', 'itinerary-documents', false)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Users can read own itinerary documents"
  ON storage.objects FOR SELECT TO authenticated
  USING (
    bucket_id = 'itinerary-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can upload own itinerary documents"
  ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (
    bucket_id = 'itinerary-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can update own itinerary documents"
  ON storage.objects FOR UPDATE TO authenticated
  USING (
    bucket_id = 'itinerary-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );

CREATE POLICY "Users can delete own itinerary documents"
  ON storage.objects FOR DELETE TO authenticated
  USING (
    bucket_id = 'itinerary-documents'
    AND auth.uid()::text = (storage.foldername(name))[1]
  );