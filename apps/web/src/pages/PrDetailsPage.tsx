import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../lib/api';
import { StatusBadge } from '../components/StatusBadge';
import {
  ExternalLink,
  ArrowLeft,
  Clock,
  GitPullRequest,
  CheckCircle2,
  AlertCircle,
  MessageSquare,
  Users,
  GitCommit,
  GitMerge,
} from 'lucide-react';

export const PrDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [pr, setPr] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchPr = async () => {
      try {
        setIsLoading(true);
        const res = await api.get(`/pull-requests/${id}`);
        setPr(res.data);
      } catch (err) {
        console.error('Failed to load PR details:', err);
      } finally {
        setIsLoading(false);
      }
    };

    if (id) {
      fetchPr();
    }
  }, [id]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-6 bg-zinc-200 dark:bg-zinc-800 rounded w-1/4"></div>
        <div className="h-20 bg-zinc-200 dark:bg-zinc-800 rounded w-full"></div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="text-center py-12 border border-border-light dark:border-border-dark rounded-md">
        <h3 className="text-sm font-semibold">Pull request not found</h3>
        <Link to="/pull-requests" className="text-xs text-ochre-600 dark:text-ochre-400 mt-2 inline-block">
          ← Return to Pull Requests
        </Link>
      </div>
    );
  }

  const formatMinutes = (minutes?: number | null) => {
    if (minutes === undefined || minutes === null) return 'Not recorded';
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    if (h === 0) return `${m}m`;
    return `${h}h ${m}m`;
  };

  const getTimelineIcon = (eventType: string) => {
    switch (eventType) {
      case 'opened':
        return <GitPullRequest className="w-3.5 h-3.5 text-blue-500" />;
      case 'reviewer_requested':
        return <Users className="w-3.5 h-3.5 text-amber-500" />;
      case 'approved':
        return <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />;
      case 'changes_requested':
        return <AlertCircle className="w-3.5 h-3.5 text-red-500" />;
      case 'merged':
        return <GitMerge className="w-3.5 h-3.5 text-purple-500" />;
      case 'synchronize':
        return <GitCommit className="w-3.5 h-3.5 text-zinc-400" />;
      default:
        return <MessageSquare className="w-3.5 h-3.5 text-ochre-500" />;
    }
  };

  return (
    <div className="space-y-8">
      {/* Back button */}
      <div>
        <Link
          to="/pull-requests"
          className="inline-flex items-center gap-1.5 text-xs font-mono text-ink-light-muted dark:text-ink-dark-muted hover:text-ochre-600 dark:hover:text-ochre-400"
        >
          <ArrowLeft className="w-3 h-3" />
          <span>Back to Pull Requests</span>
        </Link>
      </div>

      {/* Header */}
      <div className="border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-semibold text-ochre-600 dark:text-ochre-400">
                #{pr.number}
              </span>
              <span className="text-xs font-mono text-ink-light-subtle dark:text-ink-dark-subtle">
                {pr.repository?.fullName || pr.repository?.name}
              </span>
              <StatusBadge status={pr.reviewStatus} isStale={pr.isStale} />
              {pr.draft && (
                <span className="text-[10px] px-1.5 py-0.5 rounded font-mono bg-zinc-500/10 text-zinc-500">
                  draft
                </span>
              )}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
              {pr.title}
            </h1>

            <div className="flex items-center gap-2 text-xs text-ink-light-muted dark:text-ink-dark-muted">
              <span>Opened by</span>
              <span className="font-mono font-medium text-ink-light dark:text-ink-dark">
                @{pr.author?.githubUsername}
              </span>
              <span>on</span>
              <span className="font-mono">{new Date(pr.openedAt).toLocaleString()}</span>
            </div>
          </div>

          <div>
            <a
              href={pr.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-mono rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark hover:bg-surface-light dark:hover:bg-surface-dark-muted text-ink-light dark:text-ink-dark transition-colors"
            >
              <span>View on GitHub</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
          <div className="text-[11px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle uppercase">
            Time to First Review
          </div>
          <div className="text-2xl font-semibold font-mono text-ochre-600 dark:text-ochre-400 mt-1">
            {formatMinutes(pr.metrics?.timeToFirstReviewMinutes)}
          </div>
          <div className="text-[11px] text-ink-light-muted dark:text-ink-dark-muted mt-1">
            {pr.firstReviewAt ? 'Measured from opening' : 'Awaiting initial review'}
          </div>
        </div>

        <div className="p-4 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
          <div className="text-[11px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle uppercase">
            Total PR Lifetime
          </div>
          <div className="text-2xl font-semibold font-mono text-ink-light dark:text-ink-dark mt-1">
            {formatMinutes(pr.metrics?.lifetimeMinutes)}
          </div>
          <div className="text-[11px] text-ink-light-muted dark:text-ink-dark-muted mt-1">
            {pr.closedAt || pr.mergedAt ? 'From open to close' : 'Currently active'}
          </div>
        </div>

        <div className="p-4 border border-border-light dark:border-border-dark rounded-md bg-surface-light dark:bg-surface-dark-subtle">
          <div className="text-[11px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle uppercase">
            Current Waiting Time
          </div>
          <div
            className={`text-2xl font-semibold font-mono mt-1 ${
              pr.isStale ? 'text-red-600 dark:text-red-400' : 'text-ink-light dark:text-ink-dark'
            }`}
          >
            {formatMinutes(pr.metrics?.currentWaitingMinutes)}
          </div>
          <div className="text-[11px] text-ink-light-muted dark:text-ink-dark-muted mt-1">
            {pr.isStale ? 'Exceeded SLA threshold' : 'Within normal SLA limits'}
          </div>
        </div>
      </div>

      {/* Grid: Metadata + Event Timeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Event Timeline (2 Cols) */}
        <div className="lg:col-span-2 border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle">
          <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark mb-6 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-ochre-500" />
            PULL REQUEST LIFECYCLE TIMELINE
          </h2>

          {pr.timeline && pr.timeline.length > 0 ? (
            <div className="relative pl-6 space-y-6 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-border-light dark:before:bg-border-dark">
              {pr.timeline.map((event: any, idx: number) => (
                <div key={idx} className="relative flex items-start gap-3">
                  <div className="absolute -left-6 mt-0.5 w-4 h-4 rounded-full bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark flex items-center justify-center">
                    {getTimelineIcon(event.eventType)}
                  </div>

                  <div className="flex-1 text-xs">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold capitalize text-ink-light dark:text-ink-dark">
                        {event.eventType.replace(/_/g, ' ')}
                      </span>
                      <span className="font-mono text-[11px] text-ink-light-subtle dark:text-ink-dark-subtle">
                        {new Date(event.timestamp).toLocaleString()}
                      </span>
                    </div>

                    <div className="text-ink-light-muted dark:text-ink-dark-muted mt-0.5">
                      Actor: <span className="font-mono text-ink-light dark:text-ink-dark">@{event.actor?.githubUsername}</span>
                    </div>

                    {event.details && Object.keys(event.details).length > 0 && (
                      <div className="mt-1 text-[11px] font-mono text-ink-light-subtle dark:text-ink-dark-subtle bg-surface-light-subtle dark:bg-surface-dark p-2 rounded border border-border-light dark:border-border-dark">
                        {JSON.stringify(event.details, null, 2)}
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-xs text-ink-light-subtle dark:text-ink-dark-subtle font-mono text-center py-8">
              No granular timeline events recorded for this PR yet
            </div>
          )}
        </div>

        {/* Metadata Details (1 Col) */}
        <div className="border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle space-y-4">
          <h2 className="text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark border-b border-border-light dark:border-border-dark pb-3">
            METADATA & ATTRIBUTES
          </h2>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
                Assigned Reviewers
              </span>
              <div className="mt-1 flex flex-wrap gap-1">
                {pr.reviewers && pr.reviewers.length > 0 ? (
                  pr.reviewers.map((r: string) => (
                    <span key={r} className="px-2 py-0.5 rounded bg-zinc-500/10 font-mono text-xs">
                      @{r}
                    </span>
                  ))
                ) : (
                  <span className="text-ink-light-subtle dark:text-ink-dark-subtle italic">None assigned</span>
                )}
              </div>
            </div>

            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
                First Review Recorded
              </span>
              <span className="font-mono text-ink-light dark:text-ink-dark">
                {pr.firstReviewAt ? new Date(pr.firstReviewAt).toLocaleString() : 'Pending'}
              </span>
            </div>

            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
                Closed / Merged Time
              </span>
              <span className="font-mono text-ink-light dark:text-ink-dark">
                {pr.mergedAt
                  ? `Merged: ${new Date(pr.mergedAt).toLocaleString()}`
                  : pr.closedAt
                  ? `Closed: ${new Date(pr.closedAt).toLocaleString()}`
                  : 'Open'}
              </span>
            </div>

            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
                Latest Review Disposition
              </span>
              <span className="font-mono text-ink-light dark:text-ink-dark">
                {pr.latestReviewState || 'No formal review submitted'}
              </span>
            </div>

            <div className="pt-2 border-t border-border-light dark:border-border-dark">
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle uppercase text-[10px] font-mono block">
                GitHub Pull Request ID
              </span>
              <span className="font-mono text-[11px] text-ink-light-muted dark:text-ink-dark-muted">
                {pr.githubPrId}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
