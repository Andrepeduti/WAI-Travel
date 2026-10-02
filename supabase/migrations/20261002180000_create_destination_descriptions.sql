-- Mini descrição de cada destino (país) exibida no topo da tela "Destinos em alta".
-- Gerada uma única vez pelo Gemini (edge function destination-description) e
-- reutilizada por todos os usuários. Pode ser editada manualmente aqui.

CREATE TABLE IF NOT EXISTS public.destination_descriptions (
  country     text PRIMARY KEY,
  description text NOT NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  updated_at  timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.destination_descriptions ENABLE ROW LEVEL SECURITY;

-- Leitura liberada; escrita só pela edge function (service role ignora RLS).
DROP POLICY IF EXISTS "Destination descriptions are viewable by everyone" ON public.destination_descriptions;
CREATE POLICY "Destination descriptions are viewable by everyone"
  ON public.destination_descriptions FOR SELECT
  USING (true);

GRANT SELECT ON public.destination_descriptions TO anon, authenticated;
GRANT ALL ON public.destination_descriptions TO service_role;

DROP TRIGGER IF EXISTS trg_destination_descriptions_updated_at ON public.destination_descriptions;
CREATE TRIGGER trg_destination_descriptions_updated_at
  BEFORE UPDATE ON public.destination_descriptions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
