-- 1. Impulsionamento de roteiros à venda.
-- Enquanto boosted_until estiver no futuro, o roteiro exibe a tag "Destaque".
-- O fluxo de impulsionamento ainda não existe; a coluna prepara a regra.

ALTER TABLE public.itinerary_store_listing
  ADD COLUMN IF NOT EXISTS boosted_until timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_itinerary_store_listing_boosted_until
  ON public.itinerary_store_listing (boosted_until)
  WHERE boosted_until IS NOT NULL;

-- 2. Contagem pública de vendas.
-- O RLS de itinerary_sales só deixa o usuário ver as próprias vendas/compras,
-- então rankings (Destinos em alta, Criadores em alta, Roteiros para você)
-- leem itinerary_store_listing.sales_count, mantido por este trigger.

CREATE OR REPLACE FUNCTION public.sync_store_listing_sales_count()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  target_itinerary uuid := COALESCE(NEW.itinerary_id, OLD.itinerary_id);
BEGIN
  UPDATE public.itinerary_store_listing
     SET sales_count = (
       SELECT count(*) FROM public.itinerary_sales
        WHERE itinerary_id = target_itinerary AND status = 'completed'
     )
   WHERE itinerary_id = target_itinerary;
  RETURN NULL;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_store_listing_sales_count ON public.itinerary_sales;
CREATE TRIGGER trg_sync_store_listing_sales_count
  AFTER INSERT OR UPDATE OF status OR DELETE ON public.itinerary_sales
  FOR EACH ROW EXECUTE FUNCTION public.sync_store_listing_sales_count();

-- Backfill
UPDATE public.itinerary_store_listing l
   SET sales_count = s.total
  FROM (
    SELECT itinerary_id, count(*) AS total
      FROM public.itinerary_sales
     WHERE status = 'completed'
     GROUP BY itinerary_id
  ) s
 WHERE s.itinerary_id = l.itinerary_id;
