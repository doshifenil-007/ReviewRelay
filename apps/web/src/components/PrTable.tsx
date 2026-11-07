import React from 'react';
import { Link } from 'react-router-dom';
import { StatusBadge } from './StatusBadge';
import { GitPullRequest, ExternalLink, Clock, AlertCircle } from 'lucide-react';
import { IPullRequest } from '@reviewrelay/shared';

interface PrTableProps {
  prs: any[];
  isLoading?: boolean;
}

export const PrTable: React.FC<PrTableProps> = ({ prs, isLoading }) => {
  if (isLoading) {
    return (
      <div className="border border-border-light dark:border-border-dark rounded-md overflow-hidden bg-surface-light dark:bg-surface-dark-subtle">
        <div className="divide-y divide-border-light dark:divide-border-dark">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="p-4 animate-pulse flex items-center justify-between">
              <div className="space-y-2 w-1/3">
                <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-3/4"></div>
                <div className="h-3 bg-zinc-200 dark:bg-zinc-800 rounded w-1/2"></div>
              </div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-20"></div>
              <div className="h-4 bg-zinc-200 dark:bg-zinc-800 rounded w-24"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (prs.length === 0) {
    return (
      <div className="p-12 text-center border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
        <GitPullRequest className="w-8 h-8 mx-auto text-ink-light-subtle dark:text-ink-dark-subtle mb-3" />
        <h3 className="text-sm font-medium text-ink-light dark:text-ink-dark">No open pull requests right now</h3>
        <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted mt-1 max-w-sm mx-auto">
          When pull requests are opened in your connected repositories, ReviewRelay tracks their review lifecycle in real-time.
        </p>
      </div>
    );
  }

  const formatHoursAgo = (dateStr: string) => {
    const diffMs = Date.now() - new Date(dateStr).getTime();
    const hours = Math.round(diffMs / (1000 * 60 * 60));
    if (hours < 1) return '< 1h';
    if (hours < 24) return `${hours}h`;
    const days = Math.floor(hours / 24);
    const remHours = hours % 24;
    return `${days}d ${remHours}h`;
  };

  const formatReviewTime = (minutes?: number | null) => {
    if (minutes === undefined || minutes === null) return 'No review';
    const hours = (minutes / 60).toFixed(1);
    return `${hours}h`;
  };

  return (
    <div className="border border-border-light dark:border-border-dark rounded-md overflow-hidden bg-surface-light dark:bg-surface-dark-subtle">
      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark text-ink-light-subtle dark:text-ink-dark-subtle uppercase tracking-wider text-[11px] font-semibold">
              <th className="py-2.5 px-3 w-16">PR</th>
              <th className="py-2.5 px-3 min-w-[240px]">Title</th>
              <th className="py-2.5 px-3 hidden md:table-cell">Repository</th>
              <th className="py-2.5 px-3">Author</th>
              <th className="py-2.5 px-3 hidden lg:table-cell">Reviewers</th>
              <th className="py-2.5 px-3 text-right">Age</th>
              <th className="py-2.5 px-3 text-right hidden sm:table-cell">1st Review</th>
              <th className="py-2.5 px-3 text-right">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border-light dark:divide-border-dark font-normal">
            {prs.map((pr) => (
              <tr
                key={pr.id}
                className={`group hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors ${
                  pr.isStale ? 'bg-red-500/[0.02] dark:bg-red-500/[0.03]' : ''
                }`}
              >
                {/* PR # */}
                <td className="py-2.5 px-3 font-mono font-medium text-ink-light-muted dark:text-ink-dark-muted">
                  <Link
                    to={`/pull-requests/${pr.id}`}
                    className="hover:text-ochre-600 dark:hover:text-ochre-400"
                  >
                    #{pr.number}
                  </Link>
                </td>

                {/* Title */}
                <td className="py-2.5 px-3">
                  <div className="flex items-center gap-1.5">
                    <Link
                      to={`/pull-requests/${pr.id}`}
                      className="font-medium text-ink-light dark:text-ink-dark hover:text-ochre-600 dark:hover:text-ochre-400 line-clamp-1"
                    >
                      {pr.title}
                    </Link>
                    {pr.draft && (
                      <span className="text-[10px] px-1 py-0.2 rounded font-mono bg-zinc-500/10 text-zinc-500 dark:text-zinc-400">
                        draft
                      </span>
                    )}
                    {pr.url && (
                      <a
                        href={pr.url}
                        target="_blank"
                        rel="noreferrer"
                        title="View on GitHub"
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-ink-light-subtle dark:text-ink-dark-subtle hover:text-ink-light dark:hover:text-ink-dark"
                      >
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>
                </td>

                {/* Repository */}
                <td className="py-2.5 px-3 hidden md:table-cell font-mono text-[11px] text-ink-light-muted dark:text-ink-dark-muted">
                  {pr.repository?.name || 'repo'}
                </td>

                {/* Author */}
                <td className="py-2.5 px-3">
                  <span className="font-mono text-ink-light dark:text-ink-dark">
                    @{pr.author?.githubUsername || 'unknown'}
                  </span>
                </td>

                {/* Reviewers */}
                <td className="py-2.5 px-3 hidden lg:table-cell text-ink-light-muted dark:text-ink-dark-muted">
                  {pr.reviewers && pr.reviewers.length > 0 ? (
                    <div className="flex items-center gap-1 font-mono text-[11px]">
                      {pr.reviewers.slice(0, 2).map((r: string) => (
                        <span key={r} className="px-1.5 py-0.5 rounded bg-zinc-500/10">
                          @{r}
                        </span>
                      ))}
                      {pr.reviewers.length > 2 && (
                        <span className="text-[10px] text-ink-light-subtle dark:text-ink-dark-subtle">
                          +{pr.reviewers.length - 2}
                        </span>
                      )}
                    </div>
                  ) : (
                    <span className="text-ink-light-subtle dark:text-ink-dark-subtle text-[11px] italic">
                      None
                    </span>
                  )}
                </td>

                {/* Age */}
                <td className="py-2.5 px-3 text-right font-mono text-ink-light dark:text-ink-dark">
                  {formatHoursAgo(pr.openedAt)}
                </td>

                {/* First Review Time */}
                <td className="py-2.5 px-3 text-right hidden sm:table-cell font-mono text-ink-light-muted dark:text-ink-dark-muted">
                  {formatReviewTime(pr.timeToFirstReviewMinutes)}
                </td>

                {/* Status Indicator */}
                <td className="py-2.5 px-3 text-right">
                  <StatusBadge status={pr.reviewStatus} isStale={pr.isStale} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
