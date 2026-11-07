import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export const AuthCallbackPage: React.FC = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const { refetchUser } = useAuth();

  useEffect(() => {
    const accessToken = params.get('access_token');
    const refreshToken = params.get('refresh_token');

    if (accessToken && refreshToken) {
      localStorage.setItem('reviewrelay_access_token', accessToken);
      localStorage.setItem('reviewrelay_refresh_token', refreshToken);
      refetchUser().then(() => {
        navigate('/overview');
      });
    } else {
      navigate('/');
    }
  }, [params, navigate, refetchUser]);

  return (
    <div className="min-h-screen flex items-center justify-center text-xs font-mono text-ink-light-muted dark:text-ink-dark-muted">
      Authenticating GitHub session...
    </div>
  );
};
