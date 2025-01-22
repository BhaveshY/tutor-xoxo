-- Create roadmaps table
CREATE TABLE IF NOT EXISTS public.roadmaps (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.roadmaps ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own roadmaps"
    ON public.roadmaps
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own roadmaps"
    ON public.roadmaps
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmaps"
    ON public.roadmaps
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own roadmaps"
    ON public.roadmaps
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_roadmaps_updated_at
    BEFORE UPDATE ON public.roadmaps
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 