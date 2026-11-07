import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import {
  Building2,
  GitBranch,
  Sliders,
  Plus,
  Trash2,
  Copy,
  Check,
  Zap,
  Info,
  ShieldCheck,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const { currentOrg, refetchUser } = useAuth();
  const [staleThreshold, setStaleThreshold] = useState<number>(48);
  const [orgName, setOrgName] = useState<string>('');
  const [repositories, setRepositories] = useState<any[]>([]);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isConnectingRepo, setIsConnectingRepo] = useState(false);
  const [isSyncingGitHub, setIsSyncingGitHub] = useState(false);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null);

  // Form for connecting repo
  const [repoForm, setRepoForm] = useState({
    name: '',
    fullName: '',
    owner: '',
    githubRepositoryId: 0,
    webhookSecret: '',
  });

  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    if (currentOrg) {
      setStaleThreshold(currentOrg.staleThresholdHours ?? 48);
      setOrgName(currentOrg.name);
      fetchRepositories();
    }
  }, [currentOrg]);

  const fetchRepositories = async () => {
    if (!currentOrg) return;
    try {
      const res = await api.get(`/repositories?organizationId=${currentOrg.id}`);
      setRepositories(res.data);
    } catch (err) {
      console.error('Failed to load repositories:', err);
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      setIsSavingSettings(true);
      setMessage(null);
      await api.patch(`/organizations/${currentOrg.id}`, {
        name: orgName,
        staleThresholdHours: Number(staleThreshold),
      });
      await refetchUser();
      setMessage({ type: 'success', text: 'Organization settings updated successfully' });
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to update organization settings',
      });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleConnectRepo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentOrg) return;
    try {
      setMessage(null);
      const res = await api.post('/repositories', {
        organizationId: currentOrg.id,
        githubRepositoryId: Number(repoForm.githubRepositoryId),
        name: repoForm.name,
        fullName: repoForm.fullName,
        owner: repoForm.owner,
        webhookSecret: repoForm.webhookSecret,
      });
      setIsConnectingRepo(false);
      setCreatedWebhookSecret(res.data.webhookSecret || null);
      setMessage({ type: 'success', text: `Repository ${repoForm.fullName} connected. Save its webhook secret now.` });
      fetchRepositories();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to connect repository',
      });
    }
  };

  const handleDisconnectRepo = async (id: string, name: string) => {
    if (!confirm(`Disconnect repository ${name}?`)) return;
    try {
      await api.delete(`/repositories/${id}`);
      setMessage({ type: 'success', text: `Repository ${name} disconnected.` });
      fetchRepositories();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text: err.response?.data?.error || 'Failed to disconnect repository',
      });
    }
  };

  const handleSyncGitHub = async () => {
    if (!currentOrg) return;
    try {
      setIsSyncingGitHub(true);
      setMessage(null);
      const res = await api.post('/repositories/sync-github', {
        organizationId: currentOrg.id,
      });
      setMessage({
        type: 'success',
        text: `Synced ${res.data.repositoriesSynced} repositories and ${res.data.pullRequestsSynced} pull requests from GitHub.`,
      });
      await fetchRepositories();
    } catch (err: any) {
      setMessage({
        type: 'error',
        text:
          err.response?.data?.error ||
          'Failed to sync GitHub repositories. Sign in with GitHub OAuth and try again.',
      });
    } finally {
      setIsSyncingGitHub(false);
    }
  };

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(key);
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const isOwner = currentOrg?.role === 'OWNER';

  return (
    <div className="space-y-8 max-w-4xl">
      {/* Header */}
      <div className="pb-2 border-b border-border-light dark:border-border-dark">
        <h1 className="text-xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
          Settings & Connected Repositories
        </h1>
        <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono mt-0.5">
          Configure SLA thresholds and GitHub webhook integration
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded text-xs border ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-400'
              : 'bg-red-500/10 border-red-500/30 text-red-700 dark:text-red-400'
          }`}
        >
          <>
            {message.text}
            {createdWebhookSecret && (
              <div className="mt-2 flex items-center gap-2">
                <code className="break-all">{createdWebhookSecret}</code>
                <button
                  onClick={() => copyToClipboard(createdWebhookSecret, 'new-webhook-secret')}
                  className="shrink-0 underline"
                >
                  {copiedKey === 'new-webhook-secret' ? 'Copied' : 'Copy secret'}
                </button>
              </div>
            )}
          </>
        </div>
      )}

      {/* SLA Threshold Settings */}
      <section className="border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
          <Sliders className="w-4 h-4 text-ochre-500" />
          <span>SLA & STALE THRESHOLD</span>
        </div>

        <form onSubmit={handleSaveSettings} className="space-y-4 text-xs">
          <div>
            <label className="block text-ink-light dark:text-ink-dark font-medium mb-1">
              Organization Name
            </label>
            <input
              type="text"
              value={orgName}
              onChange={(e) => setOrgName(e.target.value)}
              disabled={!isOwner}
              className="w-full sm:w-80 px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark text-ink-light dark:text-ink-dark focus:outline-none focus:border-ochre-500 disabled:opacity-50"
            />
          </div>

          <div>
            <label className="block text-ink-light dark:text-ink-dark font-medium mb-1">
              Stale PR SLA Threshold (Hours)
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={720}
                value={staleThreshold}
                onChange={(e) => setStaleThreshold(Number(e.target.value))}
                disabled={!isOwner}
                className="w-32 px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark text-ink-light dark:text-ink-dark font-mono focus:outline-none focus:border-ochre-500 disabled:opacity-50"
              />
              <span className="text-ink-light-muted dark:text-ink-dark-muted font-mono">hours</span>
            </div>
            <p className="text-[11px] text-ink-light-subtle dark:text-ink-dark-subtle mt-1.5">
              Pull requests remaining open without their first submitted review past this threshold are flagged as <strong>Stale</strong>.
            </p>
          </div>

          {isOwner && (
            <button
              type="submit"
              disabled={isSavingSettings}
              className="px-4 py-1.5 text-xs font-medium rounded bg-ochre-500 text-white hover:bg-ochre-600 transition-colors uppercase tracking-wider"
            >
              {isSavingSettings ? 'Saving...' : 'Save Settings'}
            </button>
          )}
        </form>
      </section>

      {/* Connected Repositories */}
      <section className="border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
            <GitBranch className="w-4 h-4 text-ochre-500" />
            <span>CONNECTED REPOSITORIES ({repositories.length})</span>
          </div>

          {isOwner && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleSyncGitHub}
                disabled={isSyncingGitHub}
                className="text-xs px-2.5 py-1 rounded border border-border-light dark:border-border-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted font-medium transition-colors flex items-center gap-1.5 disabled:opacity-60"
              >
                <Zap className="w-3.5 h-3.5" />
                <span>{isSyncingGitHub ? 'Syncing...' : 'Sync GitHub'}</span>
              </button>
              <button
                onClick={() => setIsConnectingRepo(true)}
                className="text-xs px-2.5 py-1 rounded bg-ochre-500 text-white hover:bg-ochre-600 font-medium transition-colors flex items-center gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Connect Repository</span>
              </button>
            </div>
          )}
        </div>

        {repositories.length === 0 ? (
          <div className="p-8 text-center border border-dashed border-border-light dark:border-border-dark rounded text-xs text-ink-light-muted dark:text-ink-dark-muted">
            Connect your first GitHub repository to start tracking PR health.
          </div>
        ) : (
          <div className="divide-y divide-border-light dark:divide-border-dark border border-border-light dark:border-border-dark rounded overflow-hidden">
            {repositories.map((repo) => (
              <div key={repo.id} className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold text-ink-light dark:text-ink-dark">
                      {repo.fullName}
                    </span>
                    {repo.webhookConfigured ? (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-mono">
                        ● Webhook Active
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.2 rounded text-[10px] bg-amber-500/10 text-amber-600 dark:text-amber-400 font-mono">
                        ○ Awaiting First Webhook
                      </span>
                    )}
                  </div>
                  <div className="text-[11px] text-ink-light-subtle dark:text-ink-dark-subtle font-mono mt-0.5">
                    GitHub ID: {repo.githubRepositoryId} • Connected: {new Date(repo.createdAt).toLocaleDateString()}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  {isOwner && (
                    <button
                      onClick={() => handleDisconnectRepo(repo.id, repo.fullName)}
                      className="p-1.5 text-ink-light-subtle dark:text-ink-dark-subtle hover:text-red-500 transition-colors"
                      title="Disconnect repository"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>

      {/* GitHub Webhook Configuration Guide */}
      <section className="border border-border-light dark:border-border-dark rounded-md p-6 bg-surface-light dark:bg-surface-dark-subtle space-y-4">
        <div className="flex items-center gap-2 text-xs font-mono font-semibold tracking-wider uppercase text-ink-light dark:text-ink-dark">
          <Info className="w-4 h-4 text-ochre-500" />
          <span>HOW TO CONFIGURE GITHUB REPOSITORY WEBHOOK</span>
        </div>

        <div className="space-y-3 text-xs text-ink-light-muted dark:text-ink-dark-muted leading-relaxed">
          <p>
            In your GitHub repository, navigate to <strong>Settings → Webhooks → Add webhook</strong>:
          </p>

          <div className="p-3 bg-surface-light-subtle dark:bg-surface-dark rounded border border-border-light dark:border-border-dark font-mono text-[11px] space-y-2 text-ink-light dark:text-ink-dark">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-ink-light-subtle dark:text-ink-dark-subtle">Payload URL: </span>
                <span>http://&lt;your-domain-or-ngrok&gt;/api/webhooks/github</span>
              </div>
              <button
                onClick={() =>
                  copyToClipboard(
                    `${window.location.origin.replace('5173', '4000')}/api/webhooks/github`,
                    'webhook-url'
                  )
                }
                className="text-[10px] text-ochre-600 dark:text-ochre-400 hover:underline flex items-center gap-1"
              >
                {copiedKey === 'webhook-url' ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                Copy URL
              </button>
            </div>
            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle">Content type: </span>
              <span className="text-emerald-600 dark:text-emerald-400">application/json</span>
            </div>
            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle">Secret: </span>
              <span>Set a unique secret for each repository. Do not reuse an application secret.</span>
            </div>
            <div>
              <span className="text-ink-light-subtle dark:text-ink-dark-subtle">Events to select: </span>
              <span>Let me select individual events → Pull requests, Pull request reviews</span>
            </div>
          </div>
        </div>
      </section>

      {/* Modal: Connect Repository */}
      {isConnectingRepo && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-surface-light dark:bg-surface-dark border border-border-light dark:border-border-dark rounded-md max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border-light dark:border-border-dark">
              <h3 className="text-sm font-bold text-ink-light dark:text-ink-dark">
                Connect GitHub Repository
              </h3>
              <button
                onClick={() => setIsConnectingRepo(false)}
                className="text-xs text-ink-light-subtle dark:text-ink-dark-subtle hover:text-ink-light"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleConnectRepo} className="space-y-3 text-xs">
              <div>
                <label className="block font-medium mb-1">Repository Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. acme/core-engine"
                  value={repoForm.fullName}
                  onChange={(e) => {
                    const fullName = e.target.value;
                    const parts = fullName.split('/');
                    setRepoForm({
                      ...repoForm,
                      fullName,
                      owner: parts[0] || '',
                      name: parts[1] || fullName,
                    });
                  }}
                  className="w-full px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-ochre-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">GitHub Repository ID</label>
                <input
                  type="number"
                  required
                  value={repoForm.githubRepositoryId}
                  onChange={(e) =>
                    setRepoForm({ ...repoForm, githubRepositoryId: Number(e.target.value) })
                  }
                  className="w-full px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-ochre-500"
                />
              </div>

              <div>
                <label className="block font-medium mb-1">Webhook Secret</label>
                <input
                  type="text"
                  required
                  value={repoForm.webhookSecret}
                  onChange={(e) => setRepoForm({ ...repoForm, webhookSecret: e.target.value })}
                  className="w-full px-3 py-1.5 rounded border border-border-light dark:border-border-dark bg-surface-light-subtle dark:bg-surface-dark font-mono text-ink-light dark:text-ink-dark focus:outline-none focus:border-ochre-500"
                />
              </div>

              <div className="pt-3 flex justify-end gap-2 border-t border-border-light dark:border-border-dark">
                <button
                  type="button"
                  onClick={() => setIsConnectingRepo(false)}
                  className="px-3 py-1.5 text-xs font-medium rounded border border-border-light dark:border-border-dark hover:bg-surface-light-subtle dark:hover:bg-surface-dark-subtle"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-medium rounded bg-ochre-500 text-white hover:bg-ochre-600 transition-colors uppercase"
                >
                  Connect
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
