import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { PrTable } from '../components/PrTable';
import { Search, Filter, RefreshCw, GitPullRequest } from 'lucide-react';

export const PullRequestsPage: React.FC = () => {
  const { currentOrg } = useAuth();
  const [prs, setPrs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filterState, setFilterState] = useState<'all' | 'open' | 'stale' | 'merged' | 'closed'>('open');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchPrs = async () => {
    if (!currentOrg) return;
    try {
      setIsLoading(true);
      const res = await api.get(`/pull-requests?organizationId=${currentOrg.id}&state=all`);
      setPrs(res.data);
    } catch (err) {
      console.error('Failed to load pull requests:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPrs();
  }, [currentOrg]);

  // Client-side filtering for fast interaction
  const filteredPrs = prs.filter((pr) => {
    if (filterState === 'open' && pr.state !== 'open') return false;
    if (filterState === 'stale' && !pr.isStale) return false;
    if (filterState === 'merged' && pr.state !== 'merged') return false;
    if (filterState === 'closed' && pr.state !== 'closed') return false;

    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = pr.title?.toLowerCase().includes(q);
      const matchAuthor = pr.author?.githubUsername?.toLowerCase().includes(q);
      const matchNumber = pr.number?.toString().includes(q);
      const matchRepo = pr.repository?.name?.toLowerCase().includes(q);
      if (!matchTitle && !matchAuthor && !matchNumber && !matchRepo) return false;
    }

    return true;
  });

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border-light dark:border-border-dark">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
            Pull Requests
          </h1>
          <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
            Real-time review states across connected repositories
          </p>
        </div>

        <button
          onClick={fetchPrs}
          className="text-xs px-2.5 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted font-medium transition-colors text-ink-light dark:text-ink-dark flex items-center gap-1.5 self-start sm:self-auto"
        >
          <RefreshCw className="w-3.5 h-3.5 text-ochre-500" />
          <span>Sync</span>
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        {/* State Tabs */}
        <div className="inline-flex rounded border border-border-light dark:border-border-dark p-0.5 bg-surface-light dark:bg-surface-dark-subtle text-xs">
          {(['all', 'open', 'stale', 'merged', 'closed'] as const).map((tab) => (
            <button
              key={tab}
              onClick={() => setFilterState(tab)}
              className={`px-3 py-1 font-medium rounded capitalize transition-colors ${
                filterState === tab
                  ? 'bg-ochre-500/10 text-ochre-600 dark:text-ochre-400'
                  : 'text-ink-light-muted dark:text-ink-dark-muted hover:text-ink-light dark:hover:text-ink-dark'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-ink-light-subtle dark:text-ink-dark-subtle" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter by title, author, #..."
            className="w-full text-xs pl-8 pr-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle text-ink-light dark:text-ink-dark placeholder:text-ink-light-subtle dark:placeholder:text-ink-dark-subtle focus:outline-none focus:border-ochre-500"
          />
        </div>
      </div>

      {/* Table */}
      <PrTable prs={filteredPrs} isLoading={isLoading} />
    </div>
  );
};
