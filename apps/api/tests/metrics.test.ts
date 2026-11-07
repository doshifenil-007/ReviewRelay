import { describe, it, expect } from 'vitest';
import { MetricsService } from '../src/services/metrics.service';
import { PRState } from '@reviewrelay/shared';

describe('MetricsService', () => {
  it('correctly calculates stale PR condition using dynamic threshold', () => {
    const openedAt = new Date('2026-10-01T10:00:00Z');
    const currentTime = new Date('2026-10-03T11:00:00Z'); // 49 hours later

    // 48 hour threshold -> should be stale
    const isStale48 = MetricsService.calculateIsStale({
      state: PRState.OPEN,
      draft: false,
      openedAt,
      firstReviewAt: null,
      staleThresholdHours: 48,
      currentTime,
    });
    expect(isStale48).toBe(true);

    // 72 hour threshold -> should NOT be stale
    const isStale72 = MetricsService.calculateIsStale({
      state: PRState.OPEN,
      draft: false,
      openedAt,
      firstReviewAt: null,
      staleThresholdHours: 72,
      currentTime,
    });
    expect(isStale72).toBe(false);
  });

  it('calculates average, median, and P90 review speed accurately', () => {
    // Dataset of review times in hours: [2, 4, 6, 8, 10]
    // sum = 30, avg = 6.0, median = 6.0, p90 = 10.0
    const values = [2, 4, 6, 8, 10];
    const metrics = MetricsService.calculateSpeedAggregates(values);

    expect(metrics.avg).toBe(6);
    expect(metrics.median).toBe(6);
    expect(metrics.p90).toBe(10);
  });

  it('handles empty review datasets gracefully without division by zero', () => {
    const emptyMetrics = MetricsService.calculateSpeedAggregates([]);
    expect(emptyMetrics.avg).toBe(0);
    expect(emptyMetrics.median).toBe(0);
    expect(emptyMetrics.p90).toBe(0);
  });
});
