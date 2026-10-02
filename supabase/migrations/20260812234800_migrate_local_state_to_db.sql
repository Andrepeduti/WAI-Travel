-- Adiciona colunas ausentes no profile
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS dream_trips JSONB[] NOT NULL DEFAULT '{}';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS highlight_trip UUID REFERENCES public.itineraries(id);

-- Adiciona colunas ausentes nos itinerários
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS is_paused BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE public.itineraries ADD COLUMN IF NOT EXISTS extra_people JSONB[] NOT NULL DEFAULT '{}';

-- 3. Atualiza a view pública para incluir as novas colunas
-- No PostgreSQL, você pode usar CREATE OR REPLACE VIEW se adicionar colunas apenas no final.
CREATE OR REPLACE VIEW public.profiles_public
WITH (security_invoker = true) AS
SELECT user_id, name, username, location, avatar_url, bio, website,
       instagram, tiktok, youtube, interests,
       followers_count, following_count, created_at, updated_at,
       dream_trips, highlight_trip
FROM public.profiles;

-- 4. Garante que os privilégios de coluna estejam corretos para as novas colunas
GRANT SELECT (dream_trips, highlight_trip) ON public.profiles TO authenticated, anon;

GRANT SELECT ON public.profiles_public TO anon, authenticated;
