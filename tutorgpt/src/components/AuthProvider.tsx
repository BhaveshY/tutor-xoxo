import React, { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import useStore from '../store/useStore.ts';

interface AuthProviderProps {
  children: React.ReactNode;
}

function AuthProvider({ children }: AuthProviderProps) {
  const { user } = useStore();
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (!user && location.pathname !== '/login') {
      navigate('/login');
    } else if (user && location.pathname === '/login') {
      navigate('/dashboard');
    }
  }, [user, navigate, location.pathname]);

  return <>{children}</>;
}

export default AuthProvider;
