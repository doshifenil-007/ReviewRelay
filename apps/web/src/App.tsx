import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LandingPage } from './pages/LandingPage';
import { OverviewPage } from './pages/OverviewPage';
import { PullRequestsPage } from './pages/PullRequestsPage';
import { PrDetailsPage } from './pages/PrDetailsPage';
import { AnalyticsPage } from './pages/AnalyticsPage';
import { ReviewersPage } from './pages/ReviewersPage';
import { SettingsPage } from './pages/SettingsPage';
import { AuthCallbackPage } from './pages/AuthCallbackPage';
import { NotFoundPage } from './pages/NotFoundPage';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const App: React.FC = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <BrowserRouter>
            <Routes>
              {/* Public Routes */}
              <Route path="/" element={<LandingPage />} />
              <Route path="/auth/callback" element={<AuthCallbackPage />} />

              {/* Protected Workspace Routes */}
              <Route element={<DashboardLayout />}>
                <Route path="/overview" element={<OverviewPage />} />
                <Route path="/pull-requests" element={<PullRequestsPage />} />
                <Route path="/pull-requests/:id" element={<PrDetailsPage />} />
                <Route path="/analytics" element={<AnalyticsPage />} />
                <Route path="/reviewers" element={<ReviewersPage />} />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>

              {/* Fallback */}
              <Route path="*" element={<NotFoundPage />} />
            </Routes>
          </BrowserRouter>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
};
