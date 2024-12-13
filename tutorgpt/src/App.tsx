import '@mantine/core/styles.css';
import '@mantine/notifications/styles.css';
import { MantineProvider, createTheme } from '@mantine/core';
import { Notifications } from '@mantine/notifications';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { useEffect } from 'react';
import Login from './pages/Login.tsx';
import Dashboard from './pages/Dashboard.tsx';
import Profile from './pages/Profile.tsx';
import PrivateRoute from './components/PrivateRoute.tsx';
import Layout from './components/Layout.tsx';
import AuthProvider from './components/AuthProvider.tsx';
import LoadingScreen from './components/LoadingScreen.tsx';
import useStore from './store/useStore.ts';
import React from 'react';

const theme = createTheme({
  primaryColor: 'blue',
  fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
});

function App() {
  return (
    <MantineProvider theme={theme} defaultColorScheme="light">
      <Router>
        <Notifications />
        <AuthProvider>
          <AppRoutes />
        </AuthProvider>
      </Router>
    </MantineProvider>
  );
}

function AppRoutes() {
  const { isLoading, initializeAuth } = useStore();

  useEffect(() => {
    initializeAuth();
  }, [initializeAuth]);

  if (isLoading) {
    return <LoadingScreen />;
  }

  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route element={<PrivateRoute><Layout /></PrivateRoute>}>
        <Route path="/" element={<Dashboard />} />
        <Route path="/dashboard" element={<Dashboard />} />
        <Route path="/profile" element={<Profile />} />
      </Route>
    </Routes>
  );
}

export default App;
