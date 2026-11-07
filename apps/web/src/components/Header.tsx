import React, { useState } from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import {
  Sun,
  Moon,
  LogOut,
  ChevronDown,
  Building2,
  ExternalLink,
  GitPullRequest,
  BarChart3,
  Users,
  Settings,
  LayoutDashboard,
} from 'lucide-react';

export const Header: React.FC = () => {
  const { user, organizations, currentOrg, setCurrentOrg, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [isOrgDropdownOpen, setIsOrgDropdownOpen] = useState(false);

  const navLinks = [
    { to: '/overview', label: 'Overview', icon: LayoutDashboard },
    { to: '/pull-requests', label: 'Pull Requests', icon: GitPullRequest },
    { to: '/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/reviewers', label: 'Reviewers', icon: Users },
    { to: '/settings', label: 'Settings', icon: Settings },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark backdrop-blur-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6">
        <div className="flex items-center justify-between h-14">
          {/* Left: Brand + Org Switcher */}
          <div className="flex items-center gap-6">
            <Link to="/overview" className="flex items-center gap-2 font-mono text-sm tracking-tight font-semibold text-ink-light dark:text-ink-dark group">
              <span className="w-2 h-2 rounded-full bg-ochre-500"></span>
              <span className="tracking-wider text-xs uppercase font-bold text-ink-light dark:text-ink-dark">REVIEWRELAY</span>
            </Link>

            {/* Org Switcher */}
            {organizations.length > 0 && currentOrg && (
              <div className="relative">
                <button
                  onClick={() => setIsOrgDropdownOpen(!isOrgDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors text-ink-light dark:text-ink-dark"
                >
                  <Building2 className="w-3.5 h-3.5 text-ochre-500" />
                  <span className="max-w-[120px] truncate">{currentOrg.name}</span>
                  <span className="text-[10px] text-ink-light-subtle dark:text-ink-dark-subtle uppercase px-1 py-0.2 rounded bg-zinc-500/10">
                    {currentOrg.role}
                  </span>
                  <ChevronDown className="w-3 h-3 text-ink-light-subtle dark:text-ink-dark-subtle" />
                </button>

                {isOrgDropdownOpen && (
                  <div
                    onMouseLeave={() => setIsOrgDropdownOpen(false)}
                    className="absolute left-0 mt-1 w-52 rounded-md shadow-lg border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark py-1 z-50 text-xs"
                  >
                    <div className="px-3 py-1.5 text-[11px] font-semibold text-ink-light-subtle dark:text-ink-dark-subtle border-b border-border-light dark:border-border-dark">
                      Organizations
                    </div>
                    {organizations.map((org) => (
                      <button
                        key={org.id}
                        onClick={() => {
                          setCurrentOrg(org);
                          setIsOrgDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 flex items-center justify-between hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle ${
                          currentOrg.id === org.id
                            ? 'text-ochre-600 dark:text-ochre-400 font-medium'
                            : 'text-ink-light dark:text-ink-dark'
                        }`}
                      >
                        <span className="truncate">{org.name}</span>
                        <span className="text-[10px] text-ink-light-subtle dark:text-ink-dark-subtle">
                          {org.role}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Center: Main Nav Links */}
          <nav className="hidden md:flex items-center gap-1">
            {navLinks.map(({ to, label }) => (
              <NavLink
                key={to}
                to={to}
                className={({ isActive }) =>
                  `px-3 py-1.5 text-xs font-medium rounded transition-colors ${
                    isActive
                      ? 'text-ochre-600 dark:text-ochre-400 bg-ochre-500/10'
                      : 'text-ink-light-muted dark:text-ink-dark-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle'
                  }`
                }
              >
                {label}
              </NavLink>
            ))}
          </nav>

          {/* Right: Theme Toggle & User controls */}
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTheme}
              aria-label="Toggle color theme"
              className="p-1.5 rounded text-ink-light-muted dark:text-ink-dark-muted hover:text-ink-light dark:hover:text-ink-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle transition-colors"
            >
              {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
            </button>

            {user ? (
              <div className="flex items-center gap-3 pl-2 border-l border-border-light dark:border-border-dark">
                <div className="flex items-center gap-2">
                  {user.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.githubUsername}
                      className="w-6 h-6 rounded-full border border-border-light dark:border-border-dark"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-zinc-700 flex items-center justify-center text-[10px] font-bold text-white">
                      {user.githubUsername.substring(0, 2).toUpperCase()}
                    </div>
                  )}
                  <span className="hidden sm:inline text-xs font-mono text-ink-light dark:text-ink-dark">
                    @{user.githubUsername}
                  </span>
                </div>

                <button
                  onClick={logout}
                  title="Sign out"
                  className="p-1.5 rounded text-ink-light-muted dark:text-ink-dark-muted hover:text-red-500 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                to="/"
                className="px-3 py-1 text-xs font-medium rounded bg-ochre-500 text-white hover:bg-ochre-600 transition-colors"
              >
                Sign In
              </Link>
            )}
          </div>
        </div>

        {/* Mobile Navigation bar */}
        <div className="flex md:hidden items-center justify-between py-2 border-t border-border-light dark:border-border-dark overflow-x-auto gap-2">
          {navLinks.map(({ to, label }) => (
            <NavLink
              key={to}
              to={to}
              className={({ isActive }) =>
                `px-2.5 py-1 text-xs font-medium whitespace-nowrap rounded ${
                  isActive
                    ? 'text-ochre-600 dark:text-ochre-400 bg-ochre-500/10'
                    : 'text-ink-light-muted dark:text-ink-dark-muted'
                }`
              }
            >
              {label}
            </NavLink>
          ))}
        </div>
      </div>
    </header>
  );
};
