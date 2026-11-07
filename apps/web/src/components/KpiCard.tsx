import React from 'react';

interface KpiCardProps {
  label: string;
  value: string | number;
  subtext?: string;
  isAlert?: boolean;
  isAccent?: boolean;
}

export const KpiCard: React.FC<KpiCardProps> = ({
  label,
  value,
  subtext,
  isAlert,
  isAccent,
}) => {
  return (
    <div
      className={`p-4 rounded-md border bg-surface-light dark:bg-surface-dark-subtle transition-colors ${
        isAlert
          ? 'border-red-500/30 dark:border-red-500/30'
          : isAccent
          ? 'border-ochre-500/40 dark:border-ochre-500/30'
          : 'border-border-light dark:border-border-dark'
      }`}
    >
      <div className="flex items-center justify-between text-xs font-medium uppercase tracking-wider text-ink-light-muted dark:text-ink-dark-muted mb-1">
        <span>{label}</span>
        {isAlert && (
          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
        )}
      </div>

      <div className="flex items-baseline gap-2">
        <span
          className={`text-2xl sm:text-3xl font-semibold tracking-tight ${
            isAlert
              ? 'text-red-600 dark:text-red-400'
              : isAccent
              ? 'text-ochre-600 dark:text-ochre-400'
              : 'text-ink-light dark:text-ink-dark'
          }`}
        >
          {value}
        </span>
      </div>

      {subtext && (
        <div className="mt-1 text-xs text-ink-light-subtle dark:text-ink-dark-subtle">
          {subtext}
        </div>
      )}
    </div>
  );
};
