import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../lib/api';

export interface User {
  id: string;
  githubId: number;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
}

export interface Org {
  id: string;
  name: string;
  role: 'OWNER' | 'MEMBER';
  staleThresholdHours: number;
}

interface AuthContextType {
  user: User | null;
  organizations: Org[];
  currentOrg: Org | null;
  setCurrentOrg: (org: Org) => void;
  isLoading: boolean;
  loginWithGitHub: () => Promise<void>;
  devLogin: (username?: string) => Promise<void>;
  logout: () => Promise<void>;
  refetchUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [organizations, setOrganizations] = useState<Org[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Org | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const fetchUserData = async () => {
    const token = localStorage.getItem('reviewrelay_access_token');
    if (!token) {
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      setIsLoading(false);
      return;
    }

    try {
      const res = await api.get('/auth/me');
      setUser(res.data.user);
      setOrganizations(res.data.organizations || []);

      if (res.data.organizations && res.data.organizations.length > 0) {
        // Restore selected org or default to first
        const savedOrgId = localStorage.getItem('reviewrelay_current_org_id');
        const matched = res.data.organizations.find((o: Org) => o.id === savedOrgId);
        const selected = matched || res.data.organizations[0];
        setCurrentOrg(selected);
        localStorage.setItem('reviewrelay_current_org_id', selected.id);
      }
    } catch (err) {
      console.error('Failed to fetch user profile:', err);
      localStorage.removeItem('reviewrelay_access_token');
      localStorage.removeItem('reviewrelay_refresh_token');
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchUserData();
  }, []);

  const selectOrg = (org: Org) => {
    setCurrentOrg(org);
    localStorage.setItem('reviewrelay_current_org_id', org.id);
  };

  const loginWithGitHub = async () => {
    try {
      const res = await api.get('/auth/github');
      if (res.data.url) {
        window.location.href = res.data.url;
      }
    } catch (err) {
      console.error('GitHub OAuth init error:', err);
      alert('GitHub OAuth not yet configured with CLIENT_ID in .env. Use "Demo Login" for instant access.');
    }
  };

  const devLogin = async (username: string = 'octocat') => {
    try {
      setIsLoading(true);
      const res = await api.post('/auth/dev-login', { username });
      const { accessToken, refreshToken } = res.data;
      localStorage.setItem('reviewrelay_access_token', accessToken);
      localStorage.setItem('reviewrelay_refresh_token', refreshToken);
      await fetchUserData();
    } catch (err) {
      console.error('Dev login failed:', err);
      alert('Failed to log in via Dev mode');
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    const refreshToken = localStorage.getItem('reviewrelay_refresh_token');
    try {
      if (refreshToken) {
        await api.post('/auth/logout', { refreshToken });
      }
    } catch (e) {
      // Ignore error during logout
    } finally {
      localStorage.removeItem('reviewrelay_access_token');
      localStorage.removeItem('reviewrelay_refresh_token');
      localStorage.removeItem('reviewrelay_current_org_id');
      setUser(null);
      setOrganizations([]);
      setCurrentOrg(null);
      window.location.href = '/';
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        organizations,
        currentOrg,
        setCurrentOrg: selectOrg,
        isLoading,
        loginWithGitHub,
        devLogin,
        logout,
        refetchUser: fetchUserData,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
