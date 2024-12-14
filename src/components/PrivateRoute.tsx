import { Navigate } from 'react-router-dom';
import useStore from '../store/useStore.ts';
import React from 'react';

const PrivateRoute = ({ children }: { children: React.ReactNode }) => {
  const { user } = useStore();

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};

export default PrivateRoute; 