-- Create enum for difficulty levels
CREATE TYPE practice_difficulty AS ENUM ('easy', 'medium', 'hard');

-- Create practice_sessions table if it doesn't exist
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    subject TEXT NOT NULL,
    difficulty practice_difficulty NOT NULL,
    question TEXT NOT NULL,
    answer TEXT,
    score INTEGER CHECK (score >= 0 AND score <= 100),
    created_at TIMESTAMPTZ DEFAULT now(),
    completed_at TIMESTAMPTZ,
    CONSTRAINT valid_score CHECK (score IS NULL OR (score >= 0 AND score <= 100))
);

-- Create indexes
CREATE INDEX IF NOT EXISTS practice_sessions_user_id_idx ON practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS practice_sessions_created_at_idx ON practice_sessions(created_at DESC);

-- Set up Row Level Security (RLS)
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own practice sessions"
    ON practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
    ON practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own practice sessions"
    ON practice_sessions FOR UPDATE
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Grant access to authenticated users
GRANT ALL ON practice_sessions TO authenticated; 