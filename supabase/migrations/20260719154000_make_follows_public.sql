-- Fix para tornar todos os perfis e listas de seguidores 100% publicos, inclusive para anon

-- Tabela profiles:
-- Garante que qualquer pessoa possa ver os perfis
DROP POLICY IF EXISTS "Profiles are fully public for viewing" ON public.profiles;
CREATE POLICY "Profiles are fully public for viewing"
ON public.profiles FOR SELECT USING (true);

-- Tabela profile_follows:
-- Remove regras antigas restritas
DROP POLICY IF EXISTS "Users can view follows involving themselves" ON public.profile_follows;
DROP POLICY IF EXISTS "Users can view follows" ON public.profile_follows;

-- Cria regra 100% publica
CREATE POLICY "Follows are viewable by everyone"
ON public.profile_follows FOR SELECT USING (true);
