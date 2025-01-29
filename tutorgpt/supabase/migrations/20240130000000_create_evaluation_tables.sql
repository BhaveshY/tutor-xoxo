-- Create enum types
CREATE TYPE performance_level AS ENUM ('excellent', 'good', 'fair', 'needs_improvement');
CREATE TYPE understanding_level AS ENUM ('high', 'medium', 'low');

-- Create roadmap progress table
CREATE TABLE IF NOT EXISTS roadmap_progress (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    completed_topics TEXT[] DEFAULT '{}',
    current_topic TEXT,
    last_updated TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    UNIQUE(user_id)
);

-- Create practice sessions table
CREATE TABLE IF NOT EXISTS practice_sessions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    topic TEXT NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    performance performance_level NOT NULL,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create tutor interactions table
CREATE TABLE IF NOT EXISTS tutor_interactions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    topic TEXT NOT NULL,
    message_count INTEGER NOT NULL,
    duration INTEGER NOT NULL, -- in seconds
    understanding understanding_level NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_roadmap_progress_user_id ON roadmap_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_practice_sessions_user_id_timestamp ON practice_sessions(user_id, timestamp);
CREATE INDEX IF NOT EXISTS idx_tutor_interactions_user_id_timestamp ON tutor_interactions(user_id, timestamp);

-- Set up RLS (Row Level Security)
ALTER TABLE roadmap_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE practice_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tutor_interactions ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own roadmap progress"
    ON roadmap_progress FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can update their own roadmap progress"
    ON roadmap_progress FOR UPDATE
    USING (auth.uid() = user_id);

CREATE POLICY "Users can view their own practice sessions"
    ON practice_sessions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own practice sessions"
    ON practice_sessions FOR INSERT
    WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can view their own tutor interactions"
    ON tutor_interactions FOR SELECT
    USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own tutor interactions"
    ON tutor_interactions FOR INSERT
    WITH CHECK (auth.uid() = user_id); 