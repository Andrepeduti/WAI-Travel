-- 1) Sanitize legacy usernames: remove invalid chars (e.g. leading "@")
--    and resolve resulting collisions with a numeric suffix.
DO $$
DECLARE
  r record;
  cleaned text;
  candidate text;
  suffix int;
BEGIN
  FOR r IN
    SELECT id, username
    FROM public.profiles
    WHERE username IS NOT NULL
      AND username !~ '^[a-z0-9_.]{3,20}$'
  LOOP
    cleaned := lower(regexp_replace(coalesce(r.username, ''), '[^a-z0-9_.]', '', 'g'));
    IF length(cleaned) < 3 THEN
      cleaned := 'user' || substr(replace(r.id::text, '-', ''), 1, 6);
    END IF;
    cleaned := substr(cleaned, 1, 20);

    candidate := cleaned;
    suffix := 0;
    WHILE EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.username = candidate AND p.id <> r.id
    ) LOOP
      suffix := suffix + 1;
      candidate := substr(cleaned, 1, GREATEST(3, 20 - length(suffix::text))) || suffix::text;
    END LOOP;

    UPDATE public.profiles SET username = candidate WHERE id = r.id;
  END LOOP;
END $$;

-- 2) Defense in depth: enforce username format at the DB level
ALTER TABLE public.profiles
  ADD CONSTRAINT profiles_username_format_chk
  CHECK (username IS NULL OR username ~ '^[a-z0-9_.]{3,20}$');