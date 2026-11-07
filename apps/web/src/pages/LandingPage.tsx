import React from 'react';
import { useAuth } from '../context/AuthContext';
import { useTheme } from '../context/ThemeContext';
import { useNavigate } from 'react-router-dom';
import {
  GitPullRequest,
  Clock,
  AlertTriangle,
  ArrowRight,
  ShieldCheck,
  Zap,
  Activity,
  Terminal,
  Sun,
  Moon,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  const { user, loginWithGitHub, devLogin } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const navigate = useNavigate();

  if (user) {
    navigate('/overview');
  }

  return (
    <div className="min-h-screen bg-surface-light dark:bg-surface-dark text-ink-light dark:text-ink-dark flex flex-col justify-between selection:bg-ochre-500/20 selection:text-ochre-600">
      {/* Top minimal nav */}
      <nav className="border-b border-border-light dark:border-border-dark px-6 py-4 flex items-center justify-between max-w-7xl mx-auto w-full">
        <div className="flex items-center gap-2.5 font-mono text-sm font-semibold tracking-tight">
          <span className="w-2.5 h-2.5 rounded-full bg-ochre-500"></span>
          <span className="tracking-wider text-xs uppercase font-bold">REVIEWRELAY</span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="p-1.5 rounded text-ink-light-muted dark:text-ink-dark-muted hover:text-ink-light dark:hover:text-ink-dark transition-colors"
          >
            {theme === 'dark' ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          {import.meta.env.DEV && (
            <button
              onClick={() => devLogin('lead-dev')}
              className="text-xs px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted font-medium transition-colors"
            >
              Demo Workspace
            </button>
          )}
        </div>
      </nav>

      {/* Hero Section */}
      <main className="max-w-5xl mx-auto px-6 py-16 sm:py-24 w-full">
        <div className="text-center space-y-6 max-w-3xl mx-auto">
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded text-xs font-mono font-medium border border-ochre-500/30 bg-ochre-500/10 text-ochre-600 dark:text-ochre-400">
            <span className="w-1.5 h-1.5 rounded-full bg-ochre-500 animate-pulse"></span>
            Pull Request Intelligence & Review Bottleneck Analytics
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
            See where your code-review process is getting stuck.
          </h1>

          <p className="text-base sm:text-lg text-ink-light-muted dark:text-ink-dark-muted max-w-2xl mx-auto font-normal leading-relaxed">
            GitHub shows open pull requests. ReviewRelay measures review velocity,
            tracks waiting time to first review, unmasks stale PRs, and visualizes reviewer workload.
          </p>

          {/* Action CTAs */}
          <div className="pt-4 flex flex-col sm:flex-row items-center justify-center gap-3">
            <button
              onClick={loginWithGitHub}
              className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-semibold rounded bg-ochre-500 text-white hover:bg-ochre-600 shadow-sm transition-colors uppercase tracking-wider"
            >
              Continue with GitHub
              <ArrowRight className="w-4 h-4" />
            </button>

            {import.meta.env.DEV && (
              <button
                onClick={() => devLogin('evaluator')}
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-5 py-2.5 text-xs font-medium rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors text-ink-light dark:text-ink-dark"
              >
                <Terminal className="w-3.5 h-3.5 text-ochre-500" />
                Instant Demo Access
              </button>
            )}
          </div>

          <p className="text-[11px] text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
            Zero telemetry slop • HMAC SHA-256 verified webhooks • Real-time event streams
          </p>
        </div>

        {/* Dashboard Preview Component */}
        <div className="mt-16 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle p-6 shadow-sm">
          <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark text-xs font-mono text-ink-light-muted dark:text-ink-dark-muted">
            <span className="flex items-center gap-2">
              <Activity className="w-3.5 h-3.5 text-ochre-500" />
              LIVE METRICS PREVIEW — PROD REPOSITORIES
            </span>
            <span>THRESHOLD: 48h</span>
          </div>

          {/* Mini preview KPI grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 my-4">
            <div className="p-3 border border-border-light dark:border-border-dark rounded bg-surface-light-subtle dark:bg-surface-dark">
              <div className="text-[10px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle uppercase">Open PRs</div>
              <div className="text-2xl font-bold font-mono text-ink-light dark:text-ink-dark mt-1">17</div>
            </div>
            <div className="p-3 border border-red-500/30 rounded bg-red-500/[0.03]">
              <div className="text-[10px] font-mono text-red-600 dark:text-red-400 uppercase">Stale PRs</div>
              <div className="text-2xl font-bold font-mono text-red-600 dark:text-red-400 mt-1">4</div>
            </div>
            <div className="p-3 border border-ochre-500/30 rounded bg-ochre-500/[0.03]">
              <div className="text-[10px] font-mono text-ochre-600 dark:text-ochre-400 uppercase">Avg 1st Review</div>
              <div className="text-2xl font-bold font-mono text-ochre-600 dark:text-ochre-400 mt-1">6.8h</div>
            </div>
            <div className="p-3 border border-border-light dark:border-border-dark rounded bg-surface-light-subtle dark:bg-surface-dark">
              <div className="text-[10px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle uppercase">Median</div>
              <div className="text-2xl font-bold font-mono text-ink-light dark:text-ink-dark mt-1">3.2h</div>
            </div>
          </div>

          {/* Mini table snapshot */}
          <div className="border border-border-light dark:border-border-dark rounded overflow-hidden text-xs">
            <div className="p-2.5 bg-surface-light-subtle dark:bg-surface-dark font-mono text-[11px] font-semibold text-ink-light-muted dark:text-ink-dark-muted flex justify-between border-b border-border-light dark:border-border-dark">
              <span>PR / TITLE</span>
              <span>WAITING / STATUS</span>
            </div>
            <div className="divide-y divide-border-light dark:divide-border-dark">
              <div className="p-2.5 flex items-center justify-between hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ink-light-muted dark:text-ink-dark-muted">#142</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">Payment retry logic with exponential backoff</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-red-600 dark:text-red-400">51h</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                    ● Stale
                  </span>
                </div>
              </div>

              <div className="p-2.5 flex items-center justify-between hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ink-light-muted dark:text-ink-dark-muted">#137</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">Database migration for partitioned audit logs</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-red-600 dark:text-red-400">74h</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-red-500/10 text-red-600 dark:text-red-400 border border-red-500/20 font-medium">
                    ● Stale
                  </span>
                </div>
              </div>

              <div className="p-2.5 flex items-center justify-between hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-ink-light-muted dark:text-ink-dark-muted">#155</span>
                  <span className="font-medium text-ink-light dark:text-ink-dark">Optimize Redis connection pooling</span>
                </div>
                <div className="flex items-center gap-3">
                  <span className="font-mono text-ink-light-muted dark:text-ink-dark-muted">4h</span>
                  <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 font-medium">
                    ● Healthy
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Feature pillars */}
        <div className="mt-16 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div className="p-5 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
            <Clock className="w-5 h-5 text-ochre-500 mb-3" />
            <h3 className="text-sm font-semibold text-ink-light dark:text-ink-dark">Time-to-First-Review</h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-1 leading-relaxed">
              Track the exact elapsed interval between PR creation and the first meaningful review submission.
            </p>
          </div>

          <div className="p-5 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
            <AlertTriangle className="w-5 h-5 text-red-500 mb-3" />
            <h3 className="text-sm font-semibold text-ink-light dark:text-ink-dark">Configurable Stale PRs</h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-1 leading-relaxed">
              Define your team's SLA threshold. Detect abandoned PRs before they disrupt sprint cadence.
            </p>
          </div>

          <div className="p-5 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
            <ShieldCheck className="w-5 h-5 text-emerald-500 mb-3" />
            <h3 className="text-sm font-semibold text-ink-light dark:text-ink-dark">Reviewer Workload Balance</h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-1 leading-relaxed">
              Measure distribution across engineers to prevent review fatigue and eliminate single points of failure.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-border-light dark:border-border-dark py-6 px-6 max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center justify-between text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
        <div>ReviewRelay Engineering Intelligence Platform</div>
        <div className="mt-2 sm:mt-0">GitHub Webhook Protocol v2.0 • SHA-256 HMAC</div>
      </footer>
    </div>
  );
};
