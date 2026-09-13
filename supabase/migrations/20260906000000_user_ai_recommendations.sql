-- Create user_ai_recommendations table
CREATE TABLE IF NOT EXISTS public.user_ai_recommendations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    city TEXT NOT NULL,
    places_json JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE(user_id, city)
);

-- Enable RLS
ALTER TABLE public.user_ai_recommendations ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own ai recommendations"
    ON public.user_ai_recommendations
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own ai recommendations"
    ON public.user_ai_recommendations
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own ai recommendations"
    ON public.user_ai_recommendations
    FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own ai recommendations"
    ON public.user_ai_recommendations
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_user_ai_recommendations_lookup ON public.user_ai_recommendations (user_id, city);
