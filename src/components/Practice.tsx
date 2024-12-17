import React, { useEffect, useState } from 'react';
import { practiceService, PracticeDifficulty } from '../services/practiceService.ts';
import { PracticeSession } from '../services/databaseService.ts';
import { useAuth } from '../hooks/useAuth.ts';
import { ErrorMessage } from './ErrorMessage.tsx';

interface PracticeProps {
  className?: string;
}

export const Practice: React.FC<PracticeProps> = ({ className }) => {
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState<PracticeDifficulty>('medium');
  const [currentSession, setCurrentSession] = useState<PracticeSession | null>(null);
  const [answer, setAnswer] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingHistory, setIsLoadingHistory] = useState(true);
  const [practiceHistory, setPracticeHistory] = useState<PracticeSession[]>([]);
  const [error, setError] = useState<string | null>(null);
  const { session } = useAuth();
  const userId = session?.user?.id;

  useEffect(() => {
    if (userId) {
      loadPracticeHistory();
    }
  }, [userId]);

  const loadPracticeHistory = async () => {
    setIsLoadingHistory(true);
    setError(null);
    try {
      const history = await practiceService.getPracticeHistory(userId!);
      setPracticeHistory(history);
    } catch (error) {
      console.error('Error loading practice history:', error);
      setError('Failed to load practice history. Please try again.');
    } finally {
      setIsLoadingHistory(false);
    }
  };

  const handleStartPractice = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subject.trim() || !userId || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      const response = await practiceService.generatePracticeQuestion(userId, {
        prompt: subject,
        difficulty
      });
      if (response.error) {
        throw new Error(response.error);
      }
      await loadPracticeHistory();
      const latestSession = (await practiceService.getPracticeHistory(userId))[0];
      setCurrentSession(latestSession);
      setSubject('');
    } catch (error) {
      console.error('Error starting practice:', error);
      setError('Failed to start practice session. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmitAnswer = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentSession || !answer.trim() || isLoading) return;

    setIsLoading(true);
    setError(null);
    try {
      await practiceService.submitAnswer(currentSession.id, answer);
      await loadPracticeHistory();
      setAnswer('');
      setCurrentSession(null);
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  if (isLoadingHistory) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`space-y-6 ${className}`}>
      {error && (
        <ErrorMessage
          message={error}
          onRetry={currentSession ? undefined : loadPracticeHistory}
        />
      )}
      
      {!currentSession ? (
        <form onSubmit={handleStartPractice} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700">Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              placeholder="Enter subject to practice..."
              className="mt-1 block w-full p-2 border rounded-lg"
              disabled={isLoading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as PracticeDifficulty)}
              className="mt-1 block w-full p-2 border rounded-lg"
              disabled={isLoading}
            >
              <option value="easy">Easy</option>
              <option value="medium">Medium</option>
              <option value="hard">Hard</option>
            </select>
          </div>
          <button
            type="submit"
            disabled={isLoading || !subject.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Starting...</span>
              </div>
            ) : (
              'Start Practice'
            )}
          </button>
        </form>
      ) : (
        <form onSubmit={handleSubmitAnswer} className="space-y-4">
          <div className="p-4 bg-gray-100 rounded-lg">
            <h3 className="font-medium">Question:</h3>
            <p className="mt-2 text-gray-700">{currentSession.question}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Your Answer</label>
            <textarea
              value={answer}
              onChange={(e) => setAnswer(e.target.value)}
              className="mt-1 block w-full p-2 border rounded-lg"
              rows={4}
              disabled={isLoading}
              placeholder="Type your answer here..."
            />
          </div>
          <button
            type="submit"
            disabled={isLoading || !answer.trim()}
            className="w-full px-4 py-2 bg-blue-500 text-white rounded-lg disabled:opacity-50 hover:bg-blue-600 transition-colors"
          >
            {isLoading ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                <span>Submitting...</span>
              </div>
            ) : (
              'Submit Answer'
            )}
          </button>
        </form>
      )}

      {practiceHistory.length > 0 && (
        <div className="mt-8">
          <h2 className="text-xl font-semibold mb-4">Practice History</h2>
          <div className="space-y-4">
            {practiceHistory.map((session) => (
              <div key={session.id} className="p-4 border rounded-lg hover:border-blue-200 transition-colors">
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{session.subject}</h3>
                    <p className="text-sm text-gray-500">
                      Difficulty: {session.difficulty}
                    </p>
                    <p className="text-sm text-gray-500">
                      {new Date(session.created_at).toLocaleDateString()}
                    </p>
                  </div>
                  {session.score !== null && (
                    <div className={`text-lg font-semibold ${
                      session.score >= 80 ? 'text-green-600' :
                      session.score >= 60 ? 'text-yellow-600' :
                      'text-red-600'
                    }`}>
                      Score: {session.score}%
                    </div>
                  )}
                </div>
                <div className="mt-2">
                  <p className="font-medium">Question:</p>
                  <p className="text-gray-700">{session.question}</p>
                </div>
                {session.answer && (
                  <div className="mt-2">
                    <p className="font-medium">Your Answer:</p>
                    <p className="text-gray-700">{session.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}; 