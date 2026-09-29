-- Habilita RLS para as tabelas geradas pelo Entity Framework
ALTER TABLE IF EXISTS public."__EFMigrationsHistory" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Users" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Posts" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."UserBadges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Badges" ENABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS public."Friendships" ENABLE ROW LEVEL SECURITY;

-- Nota: Ao habilitar o RLS sem criar políticas (Policies),
-- o acesso a essas tabelas através da API pública do Supabase (anon key)
-- ficará bloqueado por padrão (o que é o mais seguro).
--
-- Se o seu frontend precisar ler ou escrever diretamente nessas tabelas via Supabase,
-- você precisará criar políticas para elas.
-- Exemplo para permitir leitura:
-- CREATE POLICY "Permitir leitura pública" ON public."Posts" FOR SELECT USING (true);
