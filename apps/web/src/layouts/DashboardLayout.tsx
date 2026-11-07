import React from 'react';
import { Outlet, Navigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';

export const DashboardLayout: React.FC = () => {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen bg-surface-light dark:bg-surface-dark flex items-center justify-center">
        <div className="text-xs font-mono text-ink-light-muted dark:text-ink-dark-muted flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-ochre-500 animate-pulse"></span>
          <span>Loading ReviewRelay workspace...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/" replace />;
  }

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-ink-light dark:text-ink-dark flex flex-col">
      <Header />
      <main className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 w-full">
        <Outlet />
      </main>
      <footer className="border-t border-border-light dark:border-border-dark py-4 px-6 text-center text-[11px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle">
        ReviewRelay Engineering Intelligence • Real-time Webhook Engine
      </footer>
    </div>
  );
};
