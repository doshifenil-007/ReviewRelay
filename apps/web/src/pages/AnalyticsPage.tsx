import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { KpiCard } from '../components/KpiCard';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  CartesianGrid,
} from 'recharts';
import { Calendar, BarChart3, TrendingUp, ShieldAlert, GitMerge } from 'lucide-react';

export const AnalyticsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [days, setDays] = useState<number>(30);
  const [speedMetrics, setSpeedMetrics] = useState<any>({
    avgFirstReviewHours: 0,
    medianFirstReviewHours: 0,
    p90FirstReviewHours: 0,
    totalPrsEvaluated: 0,
  });
  const [prHealth, setPrHealth] = useState<any>({
    totalPrs: 0,
    openPrs: 0,
    stalePrs: 0,
    mergedPrs: 0,
    closedPrs: 0,
  });
  const [timeSeries, setTimeSeries] = useState<any[]>([]);
  const [reviewerWorkload, setReviewerWorkload] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    const loadAnalytics = async () => {
      try {
        setIsLoading(true);
        const [speedRes, overviewRes, workloadRes] = await Promise.all([
          api.get(`/analytics/review-speed?organizationId=${currentOrg.id}&days=${days}`),
          api.get(`/analytics/overview?organizationId=${currentOrg.id}&days=${days}`),
          api.get(`/analytics/reviewer-workload?organizationId=${currentOrg.id}&days=${days}`),
        ]);

        setSpeedMetrics(speedRes.data);
        setPrHealth(overviewRes.data.prHealth);
        setTimeSeries(overviewRes.data.timeSeries);
        setReviewerWorkload(workloadRes.data);
      } catch (err) {
        console.error('Failed to load analytics:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadAnalytics();
  }, [currentOrg, days]);

  return (
    <div className="space-y-8">
      {/* Header with Date Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light dark:border-border-dark">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
            Workflow Analytics
          </h1>
          <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
            Statistical distribution of code review velocity and throughput
          </p>
        </div>

        {/* Date Filter Tabs */}
        <div className="inline-flex rounded border border-border-light dark:border-border-dark p-0.5 bg-surface-light dark:bg-surface-dark-subtle text-xs">
          {[7, 30, 90].map((d) => (
            <button
              key={d}
              onClick={() => setDays(d)}
              className={`px-3 py-1 font-medium rounded transition-colors ${
                days === d
                  ? 'bg-ochre-500/10 text-ochre-600 dark:text-ochre-400'
                  : 'text-ink-light-muted dark:text-ink-dark-muted hover:text-ink-light dark:hover:text-ink-dark'
              }`}
            >
              Last {d} days
            </button>
          ))}
        </div>
      </div>

      {/* Review Speed Metrics */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light-subtle dark:text-ink-dark-subtle">
          REVIEW SPEED DISTRIBUTION (P50 / AVG / P90)
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          <KpiCard
            label="MEDIAN (P50)"
            value={`${speedMetrics.medianFirstReviewHours}h`}
            subtext="50% of PRs reviewed faster"
          />
          <KpiCard
            label="AVERAGE SPEED"
            value={`${speedMetrics.avgFirstReviewHours}h`}
            subtext="Arithmetic mean duration"
            isAccent={true}
          />
          <KpiCard
            label="90TH PERCENTILE (P90)"
            value={`${speedMetrics.p90FirstReviewHours}h`}
            subtext="Long-tail bottleneck threshold"
          />
          <KpiCard
            label="PRS EVALUATED"
            value={speedMetrics.totalPrsEvaluated}
            subtext={`Within last ${days} days`}
          />
        </div>
      </section>

      {/* PR Health Counters */}
      <section className="space-y-3">
        <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light-subtle dark:text-ink-dark-subtle">
          REPOSITORY HEALTH COUNTERS
        </h2>

        <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
          <div className="p-3 border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark-subtle">
            <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
              Total Tracked
            </span>
            <span className="text-xl font-bold font-mono text-ink-light dark:text-ink-dark mt-1 block">
              {prHealth.totalPrs}
            </span>
          </div>

          <div className="p-3 border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark-subtle">
            <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
              Open PRs
            </span>
            <span className="text-xl font-bold font-mono text-ink-light dark:text-ink-dark mt-1 block">
              {prHealth.openPrs}
            </span>
          </div>

          <div className="p-3 border border-red-500/20 rounded bg-red-500/[0.03]">
            <span className="text-red-600 dark:text-red-400 uppercase text-[10px] font-mono block">
              Stale PRs
            </span>
            <span className="text-xl font-bold font-mono text-red-600 dark:text-red-400 mt-1 block">
              {prHealth.stalePrs}
            </span>
          </div>

          <div className="p-3 border border-purple-500/20 rounded bg-purple-500/[0.03]">
            <span className="text-purple-600 dark:text-purple-400 uppercase text-[10px] font-mono block">
              Merged PRs
            </span>
            <span className="text-xl font-bold font-mono text-purple-600 dark:text-purple-400 mt-1 block">
              {prHealth.mergedPrs}
            </span>
          </div>

          <div className="p-3 border border-border-light dark:border-border-dark rounded bg-surface-light dark:bg-surface-dark-subtle">
            <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
              Closed Unmerged
            </span>
            <span className="text-xl font-bold font-mono text-ink-light-muted dark:text-ink-dark-muted mt-1 block">
              {prHealth.closedPrs}
            </span>
          </div>
        </div>
      </section>

      {/* Chart 1: Average First Review Time Over Time */}
      <div className="border border-border-light dark:border-border-dark rounded-md p-5 bg-surface-light dark:bg-surface-dark-subtle">
        <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark mb-4">
          <div>
            <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
              AVERAGE FIRST-REVIEW TIME OVER TIME
            </h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-0.5">
              Daily telemetry trend in hours
            </p>
          </div>
        </div>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="analyticsOchre" x1="0" y1="0" x2="0" y2="1">
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
              />
              <Area
                type="monotone"
                dataKey="avgFirstReviewHours"
                name="Avg Review Hours"
                stroke="#C68B18"
                strokeWidth={2}
                fillOpacity={1}
                fill="url(#analyticsOchre)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Chart 2: PRs Opened vs Merged per Day */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="border border-border-light dark:border-border-dark rounded-md p-5 bg-surface-light dark:bg-surface-dark-subtle">
          <div className="pb-3 border-b border-border-light dark:border-border-dark mb-4">
            <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
              THROUGHPUT: OPENED VS MERGED PRS
            </h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-0.5">
              Daily delivery cadence
            </p>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={timeSeries} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
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
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', fontFamily: 'monospace' }}
                />
                <Bar dataKey="openedCount" name="Opened" fill="#6366F1" radius={[2, 2, 0, 0]} />
                <Bar dataKey="mergedCount" name="Merged" fill="#10B981" radius={[2, 2, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Review Distribution by Team Member */}
        <div className="border border-border-light dark:border-border-dark rounded-md p-5 bg-surface-light dark:bg-surface-dark-subtle">
          <div className="pb-3 border-b border-border-light dark:border-border-dark mb-4">
            <h3 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
              REVIEW DISTRIBUTION BY TEAM MEMBER
            </h3>
            <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-0.5">
              Completed reviews across engineers
            </p>
          </div>

          <div className="h-64 w-full">
            {reviewerWorkload.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={reviewerWorkload.slice(0, 6)}
                  layout="vertical"
                  margin={{ top: 10, right: 20, left: 30, bottom: 0 }}
                >
                  <XAxis
                    type="number"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'monospace' }}
                  />
                  <YAxis
                    type="category"
                    dataKey="reviewer"
                    tickLine={false}
                    axisLine={false}
                    tick={{ fill: '#8E94A0', fontSize: 10, fontFamily: 'monospace' }}
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
                  />
                  <Bar
                    dataKey="reviewsCompleted"
                    name="Completed Reviews"
                    fill="#C68B18"
                    radius={[0, 2, 2, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="h-full flex items-center justify-center text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono">
                No individual reviewer distribution data yet
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
