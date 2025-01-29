-- Create project_suggestions table
CREATE TABLE IF NOT EXISTS public.project_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_hours INTEGER NOT NULL CHECK (estimated_hours > 0),
    tech_stack TEXT[] NOT NULL,
    learning_outcomes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.project_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'project_suggestions' 
        AND policyname = 'Everyone can view project suggestions'
    ) THEN
        CREATE POLICY "Everyone can view project suggestions"
            ON public.project_suggestions
            FOR SELECT
            TO PUBLIC
            USING (true);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'project_suggestions' 
        AND policyname = 'Authenticated users can insert project suggestions'
    ) THEN
        CREATE POLICY "Authenticated users can insert project suggestions"
            ON public.project_suggestions
            FOR INSERT
            TO authenticated
            WITH CHECK (true);
    END IF;
END
$$;

-- Create updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_project_suggestions_updated_at'
    ) THEN
        CREATE TRIGGER update_project_suggestions_updated_at
            BEFORE UPDATE ON public.project_suggestions
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$; 