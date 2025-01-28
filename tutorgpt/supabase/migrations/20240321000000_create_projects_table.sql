-- Drop projects tables
DROP TABLE IF EXISTS public.projects_community;
DROP TABLE IF EXISTS public.projects;
DROP TABLE IF EXISTS public.project_suggestions;

-- Create project suggestions table (publicly readable)
CREATE TABLE IF NOT EXISTS public.project_suggestions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_hours INTEGER NOT NULL,
    tech_stack TEXT[] NOT NULL,
    learning_outcomes TEXT[] NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for project suggestions
ALTER TABLE public.project_suggestions ENABLE ROW LEVEL SECURITY;

-- Create policy for public read access to suggestions
DROP POLICY IF EXISTS "Allow public read access to project suggestions" ON public.project_suggestions;
CREATE POLICY "Allow public read access to project suggestions"
    ON public.project_suggestions
    FOR SELECT
    TO authenticated, anon
    USING (true);

-- Create projects table (user-specific)
CREATE TABLE IF NOT EXISTS public.projects (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    suggestion_id UUID REFERENCES public.project_suggestions(id),
    title TEXT NOT NULL,
    description TEXT NOT NULL,
    difficulty TEXT NOT NULL CHECK (difficulty IN ('beginner', 'intermediate', 'advanced')),
    estimated_hours INTEGER NOT NULL,
    tech_stack TEXT[] NOT NULL,
    learning_outcomes TEXT[] NOT NULL,
    status TEXT NOT NULL DEFAULT 'not_started' CHECK (status IN ('not_started', 'in_progress', 'completed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS for projects
ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;

-- Create policies for user-specific projects
CREATE POLICY "Users can view their own projects"
    ON public.projects
    FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own projects"
    ON public.projects
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own projects"
    ON public.projects
    FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own projects"
    ON public.projects
    FOR DELETE
    USING (auth.uid() = user_id);

-- Create updated_at trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for both tables
CREATE TRIGGER update_projects_updated_at
    BEFORE UPDATE ON public.projects
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_project_suggestions_updated_at
    BEFORE UPDATE ON public.project_suggestions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 