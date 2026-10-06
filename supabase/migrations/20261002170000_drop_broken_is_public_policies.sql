-- Remove policies que ainda referenciam a coluna itineraries.is_public (removida em
-- hard_refactor_itineraries). Qualquer policy assim faz TODA leitura/escrita da
-- tabela falhar com 42703 — mesmo para o dono, porque o Postgres avalia todas as
-- policies permissivas. O acesso continua coberto por:
--   - "Public itinerary ... are viewable"  -> is_itinerary_public()  (corrigida)
--   - "Members can view ..."               -> can_view_itinerary()  (corrigida)
--   - policies de dono / editor.

DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT schemaname, tablename, policyname
      FROM pg_policies
     WHERE schemaname = 'public'
       AND (qual ILIKE '%is_public%' OR with_check ILIKE '%is_public%')
  LOOP
    RAISE NOTICE 'Dropping policy % on %.%', pol.policyname, pol.schemaname, pol.tablename;
    EXECUTE format('DROP POLICY %I ON %I.%I', pol.policyname, pol.schemaname, pol.tablename);
  END LOOP;
END;
$$;
