import React, { useState } from 'react';
import { Chat } from '../components/Chat.tsx';
import { Practice } from '../components/Practice.tsx';
import { Roadmap } from '../components/Roadmap.tsx';
import { useAuth } from '../hooks/useAuth.ts';
import { Navigate } from 'react-router-dom';
import { supabase } from '../services/supabaseClient.ts';
import { LLMSelector, type LLMProvider } from '../components/LLMSelector.tsx';
import { Group } from '@mantine/core';

type Tab = 'chat' | 'practice' | 'roadmap';

export const Dashboard: React.FC = () => {
  const [activeTab, setActiveTab] = useState<Tab>('chat');
  const { session, loading } = useAuth();
  const [provider, setProvider] = useState<LLMProvider>('openai');

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut();
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500" />
      </div>
    );
  }

  if (!session) {
    return <Navigate to="/login" replace />;
  }

  const renderTab = () => {
    switch (activeTab) {
      case 'chat':
        return <Chat className="h-[calc(100vh-8rem)]" provider={provider} />;
      case 'practice':
        return <Practice className="max-w-3xl mx-auto py-6 px-4" provider={provider} />;
      case 'roadmap':
        return <Roadmap className="max-w-3xl mx-auto py-6 px-4" provider={provider} />;
      default:
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex justify-between h-16">
            <div className="flex">
              <div className="flex space-x-8">
                <button
                  onClick={() => setActiveTab('chat')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'chat'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Chat
                </button>
                <button
                  onClick={() => setActiveTab('practice')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'practice'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Practice
                </button>
                <button
                  onClick={() => setActiveTab('roadmap')}
                  className={`inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium ${
                    activeTab === 'roadmap'
                      ? 'border-blue-500 text-gray-900'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  Learning Roadmap
                </button>
              </div>
            </div>
            <div className="flex items-center">
              <LLMSelector value={provider} onChange={setProvider} />
              <span className="text-gray-700 mx-4">
                {session.user.email}
              </span>
              <button
                onClick={handleSignOut}
                className="text-gray-500 hover:text-gray-700"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </nav>

      <main className="max-w-7xl mx-auto">
        {renderTab()}
      </main>
    </div>
  );
}; 