import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import { PrTable } from '../components/PrTable';
import { StatusBadge } from '../components/StatusBadge';
import { Link } from 'react-router-dom';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
} from 'recharts';
import {
  AlertCircle,
  Clock,
  GitPullRequest,
  CheckCircle2,
  TrendingUp,
  ArrowRight,
  ExternalLink,
  Users,
} from 'lucide-react';

export const OverviewPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [kpis, setKpis] = useState<any>({
    openPrs: 0,
    stalePrs: 0,
    avgFirstReviewHours: 0,
    medianFirstReviewHours: 0,
  });
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [workload, setWorkload] = useState<any[]>([]);
  const [stalePrs, setStalePrs] = useState<any[]>([]);
  const [recentPrs, setRecentPrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    const loadDashboardData = async () => {
      try {
        setIsLoading(true);
        const [overviewRes, workloadRes, staleRes, prsRes] = await Promise.all([
          api.get(`/analytics/overview?organizationId=${currentOrg.id}&days=14`),
          api.get(`/analytics/reviewer-workload?organizationId=${currentOrg.id}`),
          api.get(`/pull-requests?organizationId=${currentOrg.id}&staleOnly=true`),
          api.get(`/pull-requests?organizationId=${currentOrg.id}&limit=10`),
        ]);

        setKpis(overviewRes.data.kpis);
        setTimeSeries(overviewRes.data.timeSeries);
        setWorkload(workloadRes.data.slice(0, 5));
        setStalePrs(staleRes.data);
        setRecentPrs(prsRes.data);
      } catch (err) {
        console.error('Failed to load dashboard data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadDashboardData();
  }, [currentOrg]);

  return (
    <div className="space-y-8">
      {/* Page Title & Context */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light dark:border-border-dark">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
            Review Health Overview
          </h1>
          <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
            SLA Threshold: {currentOrg?.staleThresholdHours ?? 48}h • Engineering intelligence pipeline
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/pull-requests"
            className="text-xs px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted font-medium transition-colors text-ink-light dark:text-ink-dark flex items-center gap-1.5"
          >
            <span>View All PRs</span>
            <ArrowRight className="w-3.5 h-3.5 text-ochre-500" />
          </Link>
        </div>
      </div>

      {/* Top-Level KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <KpiCard
          label="OPEN PRs"
          value={kpis.openPrs}
          subtext="Active in workflow"
        />
        <KpiCard
          label="STALE PRs"
          value={kpis.stalePrs}
          subtext={`> ${currentOrg?.staleThresholdHours ?? 48}h without review`}
          isAlert={kpis.stalePrs > 0}
        />
        <KpiCard
          label="AVG FIRST REVIEW"
          value={`${kpis.avgFirstReviewHours}h`}
          subtext="Turnaround time"
          isAccent={true}
        />
        <KpiCard
          label="MEDIAN"
          value={`${kpis.medianFirstReviewHours}h`}
          subtext="Typical wait time"
        />
      </div>

      {/* Stale PRs Alert Callout Section */}
      {stalePrs.length > 0 && (
        <section className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-red-600 dark:text-red-400 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
              STALE PULL REQUESTS ({stalePrs.length})
            </h2>
            <span className="text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
              Immediate attention requested
            </span>
          </div>

          <div className="border border-red-500/20 rounded-md overflow-hidden bg-surface-light dark:bg-surface-dark-subtle divide-y divide-border-light dark:divide-border-dark">
            {stalePrs.map((pr) => (
              <div
                key={pr.id}
                className="p-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors"
              >
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs font-semibold text-ink-light-muted dark:text-ink-dark-muted">
                    #{pr.number}
                  </span>
                  <div>
                    <Link
                      to={`/pull-requests/${pr.id}`}
                      className="text-xs font-medium text-ink-light dark:text-ink-dark hover:text-ochre-600 dark:hover:text-ochre-400"
                    >
                      {pr.title}
                    </Link>
                    <div className="text-[11px] text-ink-light-subtle dark:text-ink-dark-subtle font-mono mt-0.5">
                      {pr.repository?.name} • Author: @{pr.author?.githubUsername}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="text-right">
                    <div className="text-xs font-mono font-semibold text-red-600 dark:text-red-400">
                      {Math.round((Date.now() - new Date(pr.openedAt).getTime()) / (1000 * 60 * 60))}h waiting
                    </div>
                    <div className="text-[10px] text-ink-light-subtle dark:text-ink-dark-subtle">
                      0 reviews submitted
                    </div>
                  </div>
                  <StatusBadge status="stale" isStale={true} />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Grid: Review Activity Chart + Reviewer Workload */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Activity Chart (2 Cols) */}
        <div className="lg:col-span-2 border border-border-light dark:border-border-dark rounded-md p-5 bg-surface-light dark:bg-surface-dark-subtle">
          <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-4">
            <div>
              <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
                REVIEW VELOCITY TREND (14 DAYS)
              </h3>
              <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-0.5">
                Daily average hours to first review
              </p>
            </div>
            <span className="font-mono text-xs text-ochre-600 dark:text-ochre-400">
              Avg {kpis.avgFirstReviewHours}h
            </span>
          </div>

          <div className="h-56 w-full">
            {timeSeries.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="ochreGradient" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#C68B18" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#C68B18" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <XAxis
                    dataKey="date"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'monospace' }}
                    tickFormatter={(val) => val.split('-').slice(1).join('/')}
                  />
                  <YAxis
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'monospace' }}
                    unit="h"
                  />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#14161D',
                      borderColor: '#22252E',
                      fontSize: '11px',
                      fontFamily: 'monospace',
                      borderRadius: '4px',
                      color: '#EDEDEF',
                    }}
                    formatter={(value: any) => [`${value} hours`, 'Avg 1st Review']}
                  />
                  <Area
                    type="monotone"
                    dataKey="avgFirstReviewHours"
                    stroke="#C68B18"
                    strokeWidth={2}
                    fillOpacity={1}
                    fill="url(#ochreGradient)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
                No telemetry recorded for this timeframe yet
              </div>
            )}
          </div>
        </div>

        {/* Reviewer Workload Summary (1 Col) */}
        <div className="border border-border-light dark:border-border-dark rounded-md p-5 bg-surface-light dark:bg-surface-dark-subtle">
          <div className="flex items-center justify-between pb-4 border-b border-border-light dark:border-border-dark mb-4">
            <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-ochre-500" />
              REVIEWER WORKLOAD
            </h3>
            <Link
              to="/reviewers"
              className="text-[11px] font-mono text-ochre-600 dark:text-ochre-400 hover:underline"
            >
              All →
            </Link>
          </div>

          {workload.length > 0 ? (
            <div className="divide-y divide-border-light dark:divide-border-dark">
              {workload.map((r) => (
                <div key={r.reviewer} className="py-2.5 flex items-center justify-between text-xs">
                  <div>
                    <span className="font-mono font-medium text-ink-light dark:text-ink-dark">
                      @{r.reviewer}
                    </span>
                    <div className="text-[11px] text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
                      {r.reviewsCompleted} reviews completed
                    </div>
                  </div>

                  <div className="text-right">
                    <span
                      className={`font-mono text-xs ${
                        r.pendingReviews > 4
                          ? 'text-amber-600 dark:text-amber-400 font-semibold'
                          : 'text-ink-light dark:text-ink-dark'
                      }`}
                    >
                      {r.pendingReviews} pending
                    </span>
                    <div className="text-[10px] text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
                      ~{r.avgReviewTimeHours}h avg
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-12 text-center text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
              No reviewer activity recorded yet
            </div>
          )}
        </div>
      </div>

      {/* Recent Open PRs Table */}
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark flex items-center gap-2">
            <GitPullRequest className="w-3.5 h-3.5 text-ochre-500" />
            OPEN PULL REQUESTS
          </h2>
          <span className="text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
            Real-time webhook stream
          </span>
        </div>

        <PrTable prs={recentPrs} isLoading={isLoading} />
      </section>
    </div>
  );
};
