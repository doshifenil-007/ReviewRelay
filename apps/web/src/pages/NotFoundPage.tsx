import React from 'react';
import { Link } from 'react-router-dom';
import { Terminal, ArrowLeft } from 'lucide-react';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-[60vh] flex flex-col items-center justify-center text-center p-6 space-y-4">
      <div className="p-3 rounded-full border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle text-ochre-500">
        <Terminal className="w-8 h-8" />
      </div>

      <div className="space-y-1">
        <span className="font-mono text-xs text-ochre-600 dark:text-ochre-400">404 ERROR</span>
        <h1 className="text-2xl font-bold tracking-tight text-ink-light dark:text-ink-dark">
          Route Not Found
        </h1>
        <p className="text-xs text-ink-light-muted dark:text-ink-dark-muted font-mono max-w-sm mx-auto">
          The requested resource does not exist in the ReviewRelay dashboard routing table.
        </p>
      </div>

      <div className="pt-2">
        <Link
          to="/overview"
          className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-mono font-medium rounded border border-border-light dark:border-border-dark bg-surface-light dark:bg-surface-dark-subtle hover:bg-surface-light-subtle dark:hover:bg-surface-dark-muted transition-colors text-ink-light dark:text-ink-dark"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Return to Command Center</span>
        </Link>
      </div>
    </div>
  );
};
