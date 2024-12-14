import React, { createContext, useContext, useEffect } from 'react';
import { supabase } from '../lib/supabaseClient.ts';
import useStore from '../store/useStore.ts';
import { useNavigate } from 'react-router-dom';

export const AuthContext = createContext<{ isAuthenticated: boolean }>({
  isAuthenticated: false,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const navigate = useNavigate();
  const { setState } = useStore;

  useEffect(() => {
    // Get initial session
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        setState({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            name: (session.user.user_metadata?.name || session.user.email) ?? '',
            interests: session.user.user_metadata?.interests ?? [],
            education: session.user.user_metadata?.education ?? ''
          }
        });
      }
    });

    // Listen for auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session) {
        setState({
          user: {
            id: session.user.id,
            email: session.user.email ?? '',
            name: (session.user.user_metadata?.name || session.user.email) ?? '',
            interests: session.user.user_metadata?.interests ?? [],
            education: session.user.user_metadata?.education ?? ''
          }
        });
      } else if (event === 'SIGNED_OUT') {
        setState({ user: null });
        navigate('/login');
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [setState, navigate]);

  return (
    <AuthContext.Provider value={{ isAuthenticated: !!useStore.getState().user }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
