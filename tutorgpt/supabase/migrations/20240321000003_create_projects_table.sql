-- Create projects table
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_id UUID REFERENCES public.project_suggestions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_hours INTEGER NOT NULL CHECK (estimated_hours > 0),
    tech_stack TEXT[] NOT NULL,
    learning_outcomes TEXT[] NOT NULL,
    status TEXT NOT NULL CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress INTEGER NOT NULL CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies if they don't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'projects' 
        AND policyname = 'Users can view their own projects'
    ) THEN
        CREATE POLICY "Users can view their own projects"
            ON public.projects
            FOR SELECT
            USING (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'projects' 
        AND policyname = 'Users can insert their own projects'
    ) THEN
        CREATE POLICY "Users can insert their own projects"
            ON public.projects
            FOR INSERT
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'projects' 
        AND policyname = 'Users can update their own projects'
    ) THEN
        CREATE POLICY "Users can update their own projects"
            ON public.projects
            FOR UPDATE
            USING (auth.uid() = user_id)
            WITH CHECK (auth.uid() = user_id);
    END IF;

    IF NOT EXISTS (
        SELECT 1 FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = 'projects' 
        AND policyname = 'Users can delete their own projects'
    ) THEN
        CREATE POLICY "Users can delete their own projects"
            ON public.projects
            FOR DELETE
            USING (auth.uid() = user_id);
    END IF;
END
$$;

-- Create updated_at trigger if it doesn't exist
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_projects_updated_at'
    ) THEN
        CREATE TRIGGER update_projects_updated_at
            BEFORE UPDATE ON public.projects
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END
$$; 