import React, { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';
import { LLMProvider } from '../services/llmService.ts';
import { supabase } from '../lib/supabaseClient.ts';
import ReactMarkdown from 'react-markdown';

interface Project {
  id: string;
  title: string;
  description: string;
  implementation_plan: string;
  difficulty: string;
  status: string;
}

interface ProjectsProps {
  className?: string;
  provider: LLMProvider;
  roadmapId?: string;
}

export const Projects: React.FC<ProjectsProps> = ({ className, provider, roadmapId }) => {
  const [projects, setProjects] = useState<Project[]>([]);
  const [topic, setTopic] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadProjects();
    }
  }, [userId]);

  const loadProjects = async () => {
    if (!userId) return;
    
    try {
      const { data: projectsData, error } = await supabase
        .from('projects')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(projectsData || []);
    } catch (error) {
      console.error('Error loading projects:', error);
      setError('Failed to load projects. Please try again.');
    }
  };

  const handleGenerateProjects = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId || isLoading) return;
    if (!roadmapId && !topic.trim()) {
      setError('Please enter a topic or select a roadmap');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch(`${import.meta.env.VITE_SUPABASE_URL}/functions/v1/projects`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
        },
        body: JSON.stringify({
          roadmapId,
          topic: topic.trim(),
          provider,
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate projects');
      }

      const data = await response.json();
      
      // Save projects to database
      const { error: saveError } = await supabase
        .from('projects')
        .insert(
          data.projects.map((project: any) => ({
            user_id: userId,
            roadmap_id: roadmapId,
            ...project,
          }))
        );

      if (saveError) throw saveError;
      
      await loadProjects();
      setTopic('');
    } catch (error) {
      console.error('Error generating projects:', error);
      setError('Failed to generate projects. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={className}>
      <form onSubmit={handleGenerateProjects} className="mb-6">
        {!roadmapId && (
          <input
            type="text"
            value={topic}
            onChange={(e) => setTopic(e.target.value)}
            placeholder="Enter a topic for project suggestions..."
            className="w-full p-2 border rounded mb-2"
            disabled={isLoading}
          />
        )}
        <button
          type="submit"
          disabled={isLoading}
          className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
        >
          {isLoading ? 'Generating...' : 'Generate Projects'}
        </button>
      </form>

      {error && <ErrorMessage message={error} />}

      <div className="space-y-6">
        {projects.map((project) => (
          <div key={project.id} className="border rounded p-4">
            <h3 className="text-xl font-bold mb-2">{project.title}</h3>
            <div className="mb-2">
              <span className={`inline-block px-2 py-1 rounded text-sm ${
                project.difficulty === 'Beginner' ? 'bg-green-100 text-green-800' :
                project.difficulty === 'Intermediate' ? 'bg-yellow-100 text-yellow-800' :
                'bg-red-100 text-red-800'
              }`}>
                {project.difficulty}
              </span>
            </div>
            <div className="mb-4">
              <h4 className="font-semibold mb-1">Description:</h4>
              <p>{project.description}</p>
            </div>
            <div>
              <h4 className="font-semibold mb-1">Implementation Plan:</h4>
              <ReactMarkdown className="prose">
                {project.implementation_plan}
              </ReactMarkdown>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}; 