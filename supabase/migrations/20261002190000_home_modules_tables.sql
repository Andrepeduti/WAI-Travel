-- Tabelas dos módulos voláteis da Home (doc "Regras dos módulos voláteis da home").

-- 1. Primeira exibição de cada card na Home.
-- Os prazos (24h / 72h / 7 dias) contam a partir da primeira exibição, por item,
-- em tempo corrido, e não reiniciam ao recarregar ou trocar de aparelho.
CREATE TABLE IF NOT EXISTS public.home_module_impressions (
  user_id        uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  module         text NOT NULL,
  item_id        text NOT NULL,
  first_shown_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, module, item_id)
);

ALTER TABLE public.home_module_impressions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own impressions" ON public.home_module_impressions;
CREATE POLICY "Users read own impressions"
  ON public.home_module_impressions FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own impressions" ON public.home_module_impressions;
CREATE POLICY "Users insert own impressions"
  ON public.home_module_impressions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.home_module_impressions TO authenticated;
GRANT ALL ON public.home_module_impressions TO service_role;

-- 2. Feedback da viagem concluída (só roteiros comprados): Gostei / Não gostei.
-- Avalia a viagem/roteiro, não o criador. Comentário opcional.
CREATE TABLE IF NOT EXISTS public.trip_feedback (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  liked        boolean NOT NULL,
  comment      text,
  created_at   timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT trip_feedback_user_itinerary_unique UNIQUE (user_id, itinerary_id)
);

ALTER TABLE public.trip_feedback ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users read own trip feedback" ON public.trip_feedback;
CREATE POLICY "Users read own trip feedback"
  ON public.trip_feedback FOR SELECT TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users insert own trip feedback" ON public.trip_feedback;
CREATE POLICY "Users insert own trip feedback"
  ON public.trip_feedback FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT ON public.trip_feedback TO authenticated;
GRANT ALL ON public.trip_feedback TO service_role;

-- 3. Compra iniciada e não concluída ("Continue comprando").
-- Uma linha por usuário + roteiro. Iniciar/retomar atualiza updated_at
-- (reinicia o prazo de 7 dias); concluir marca status = 'completed';
-- o X do card marca 'dismissed'.
CREATE TABLE IF NOT EXISTS public.checkout_sessions (
  user_id      uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  itinerary_id uuid NOT NULL REFERENCES public.itineraries(id) ON DELETE CASCADE,
  status       text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'completed', 'dismissed')),
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, itinerary_id)
);

CREATE INDEX IF NOT EXISTS idx_checkout_sessions_pending
  ON public.checkout_sessions (user_id, updated_at DESC)
  WHERE status = 'pending';

ALTER TABLE public.checkout_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Users manage own checkout sessions" ON public.checkout_sessions;
CREATE POLICY "Users manage own checkout sessions"
  ON public.checkout_sessions FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

GRANT SELECT, INSERT, UPDATE ON public.checkout_sessions TO authenticated;
GRANT ALL ON public.checkout_sessions TO service_role;
