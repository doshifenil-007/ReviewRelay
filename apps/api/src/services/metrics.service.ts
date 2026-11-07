import { PRState } from '@reviewrelay/shared';

export class MetricsService {
  /**
   * Evaluates if a pull request is considered stale.
   *
   * A PR is stale if and only if:
   * 1. It is currently OPEN
   * 2. It is NOT a draft
   * 3. It has NOT yet received its first review (firstReviewAt is null/undefined)
   * 4. The elapsed time since openedAt exceeds the organization's stale threshold (default 48h)
   */
  public static calculateIsStale(params: {
    state: string;
    draft: boolean;
    openedAt: Date | string;
    firstReviewAt?: Date | string | null;
    staleThresholdHours: number;
    currentTime?: Date | string;
  }): boolean {
    const { state, draft, openedAt, firstReviewAt, staleThresholdHours } = params;

    // Rule 1 & 2: Closed, merged, or draft PRs are never stale
    if (state !== PRState.OPEN || draft) {
      return false;
    }

    // Rule 3: PRs that already received a review are never stale
    if (firstReviewAt != null) {
      return false;
    }

    // Rule 4: Elapsed hours check
    const openDate = new Date(openedAt).getTime();
    const now = params.currentTime ? new Date(params.currentTime).getTime() : Date.now();
    const elapsedHours = (now - openDate) / (1000 * 60 * 60);

    return elapsedHours > staleThresholdHours;
  }

  /**
   * Calculates time from PR opening to the first submitted review in minutes and hours.
   */
  public static calculateTimeToFirstReview(
    openedAt: Date | string,
    firstReviewAt: Date | string
  ): { minutes: number; hours: number } {
    const start = new Date(openedAt).getTime();
    const end = new Date(firstReviewAt).getTime();
    const diffMs = Math.max(0, end - start);
    const minutes = Math.round(diffMs / (1000 * 60));
    const hours = Number((diffMs / (1000 * 60 * 60)).toFixed(2));
    return { minutes, hours };
  }

  /**
   * Computes statistical aggregates: Average, Median, and 90th percentile (P90)
   */
  public static calculateSpeedAggregates(values: number[]): {
    avg: number;
    median: number;
    p90: number;
  } {
    if (values.length === 0) {
      return { avg: 0, median: 0, p90: 0 };
    }

    const sorted = [...values].sort((a, b) => a - b);
    const sum = sorted.reduce((acc, v) => acc + v, 0);
    const avg = Number((sum / sorted.length).toFixed(1));

    // Median
    const mid = Math.floor(sorted.length / 2);
    const median = Number(
      (sorted.length % 2 !== 0
        ? sorted[mid]
        : (sorted[mid - 1] + sorted[mid]) / 2
      ).toFixed(1)
    );

    // P90
    const p90Index = Math.ceil(0.9 * sorted.length) - 1;
    const p90 = Number((sorted[Math.min(Math.max(p90Index, 0), sorted.length - 1)]).toFixed(1));

    return { avg, median, p90 };
  }
}
