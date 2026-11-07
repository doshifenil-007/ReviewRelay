import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { Users, Clock, AlertCircle, CheckCircle, BarChart2 } from 'lucide-react';

export const ReviewersPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [workload, setWorkload] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!currentOrg) return;

    const fetchWorkload = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/analytics/reviewer-workload?organizationId=${currentOrg.id}`);
        setWorkload(res.data);
      } catch (err) {
        console.error('Failed to load reviewer workload:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchWorkload();
  }, [currentOrg]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-border-light dark:border-border-dark">
        <h1 className="text-xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
          Reviewer Workload & Distribution
        </h1>
        <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
          Workload balance and response velocity metrics across the engineering team
        </p>
      </div>

      {/* Philosophy Callout */}
      <div className="p-3.5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle text-xs text-ink-light-muted dark:text-ink-dark-muted flex items-start gap-3">
        <Users className="w-4 h-4 text-ochre-500 shrink-0 mt-0.5" />
        <div>
          <span className="font-semibold text-ink-light dark:text-ink-dark">
            Visibility, not surveillance.
          </span>{' '}
          This section surfaces team-wide review distribution to help prevent burnout and ensure reviews are evenly shared.
        </div>
      </div>

      {/* Reviewer Workload Table */}
      {isLoading ? (
        <div className="border border-border-light dark:border-border-dark rounded-md p-6 animate-pulse space-y-4">
          <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
          <div className="h-10 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
        </div>
      ) : workload.length === 0 ? (
        <div className="p-12 text-center border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
          <Users className="w-8 h-8 mx-auto text-ink-light-subtle dark:text-ink-dark-subtle mb-3" />
          <h3 className="text-sm font-medium text-ink-light dark:text-ink-dark">No reviewer activity recorded yet</h3>
          <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-1 max-w-sm mx-auto">
            As engineers submit reviews on PRs in connected repositories, workload statistics will automatically appear here.
          </p>
        </div>
      ) : (
        <div className="border border-border-light dark:border-border-dark rounded-md overflow-hidden bg-surface-light dark:bg-surface-dark-subtle">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark text-ink-light-subtle dark:text-ink-dark-subtle uppercase tracking-wider text-[11px] font-semibold">
                  <th className="py-2.5 px-3">Reviewer</th>
                  <th className="py-2.5 px-3 text-right">Reviews Completed</th>
                  <th className="py-2.5 px-3 text-right">Pending Reviews</th>
                  <th className="py-2.5 px-3 text-right">Avg Review Time</th>
                  <th className="py-2.5 px-3 text-right">Oldest Pending</th>
                  <th className="py-2.5 px-3 text-right">Team Share</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-light dark:divide-border-dark">
                {workload.map((r) => (
                  <tr
                    key={r.reviewer}
                    className="hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors"
                  >
                    <td className="py-3 px-3">
                      <div className="flex items-center gap-2">
                        {r.avatarUrl ? (
                          <img
                            src={r.avatarUrl}
                            alt={r.reviewer}
                            className="w-5 h-5 rounded-full border border-border-light dark:border-border-dark"
                          />
                        ) : (
                          <div className="w-5 h-5 rounded-full bg-zinc-700 flex items-center justify-center text-[9px] text-white font-mono">
                            {r.reviewer.substring(0, 2).toUpperCase()}
                          </div>
                        )}
                        <span className="font-mono font-medium text-ink-light dark:text-ink-dark">
                          @{r.reviewer}
                        </span>
                      </div>
                    </td>

                    <td className="py-3 px-3 text-right font-mono font-semibold text-ink-light dark:text-ink-dark">
                      {r.reviewsCompleted}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <span
                        className={
                          r.pendingReviews > 5
                            ? 'text-amber-600 dark:text-amber-400 font-semibold'
                            : 'text-ink-light dark:text-ink-dark'
                        }
                      >
                        {r.pendingReviews}
                      </span>
                    </td>

                    <td className="py-3 px-3 text-right font-mono text-ink-light dark:text-ink-dark">
                      {r.avgReviewTimeHours > 0 ? `${r.avgReviewTimeHours}h` : '—'}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      {r.oldestPendingHours !== null ? (
                        <span
                          className={
                            r.oldestPendingHours > 48
                              ? 'text-red-600 dark:text-red-400 font-semibold'
                              : 'text-ink-light-muted dark:text-ink-dark-muted'
                          }
                        >
                          {r.oldestPendingHours}h
                        </span>
                      ) : (
                        <span className="text-ink-light-subtle dark:text-ink-dark-subtle">—</span>
                      )}
                    </td>

                    <td className="py-3 px-3 text-right font-mono">
                      <div className="flex items-center justify-end gap-2">
                        <div className="w-16 h-1.5 bg-zinc-200 dark:bg-zinc-800 rounded overflow-hidden">
                          <div
                            className="h-full bg-ochre-500 rounded"
                            style={{ width: `${r.percentageOfTeamReviews}%` }}
                          ></div>
                        </div>
                        <span className="text-ink-light-muted dark:text-ink-dark-muted min-w-[32px]">
                          {r.percentageOfTeamReviews}%
                        </span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
