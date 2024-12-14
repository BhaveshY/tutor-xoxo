import { Navigate, Outlet } from 'react-router-dom';
import Layout from './Layout.tsx';
import useStore from '../store/useStore.ts';
import React from 'react';

const PrivateRoute = () => {
  const { user, isLoading } = useStore();

  console.log('PrivateRoute - Auth State:', { 
    isLoading, 
    hasUser: !!user, 
    userData: user,
    timestamp: new Date().toISOString()
  });

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!user) {
    console.log('PrivateRoute - Redirecting to login because no user found');
    return <Navigate to="/login" replace />;
  }

  return (
    <Layout>
      <Outlet />
    </Layout>
  );
};

export default PrivateRoute; 