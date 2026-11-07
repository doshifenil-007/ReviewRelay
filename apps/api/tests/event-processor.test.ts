import { describe, it, expect } from 'vitest';
import { EventProcessorService, PrStateData } from '../src/services/event-processor.service';
import { PRState, ReviewStatus } from '@reviewrelay/shared';

describe('EventProcessorService (Pure State Transitions)', () => {
  const getInitialState = (): PrStateData => ({
    githubPrId: 9991,
    repositoryId: '66554433221100aabbccdd01',
    number: 42,
    title: 'Initial PR',
    url: 'https://github.com/org/repo/pull/42',
    author: { githubUsername: 'developer1' },
    state: PRState.OPEN,
    draft: false,
    openedAt: new Date(Date.now() - 50 * 3600 * 1000), // 50 hours ago
    updatedAt: new Date(),
    firstReviewAt: null,
    closedAt: null,
    mergedAt: null,
    reviewers: [],
    reviewStatus: ReviewStatus.WAITING,
    isStale: false,
    timeToFirstReviewMinutes: null,
    timeline: [],
    latestReviewState: null,
  });

  it('marks PR as stale if open, non-draft, no review, and age > staleThresholdHours (48h)', () => {
    const state = getInitialState();
    const updated = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'opened',
      {
        pull_request: {
          title: 'Implement Payment Retries',
          created_at: new Date(Date.now() - 50 * 3600 * 1000).toISOString(),
          draft: false,
          user: { login: 'developer1' },
        },
      },
      48 // 48 hours threshold
    );

    expect(updated.isStale).toBe(true);
    expect(updated.timeline.length).toBe(1);
    expect(updated.timeline[0].eventType).toBe('opened');
  });

  it('does NOT mark draft PR as stale even if age exceeds threshold', () => {
    const state = getInitialState();
    const updated = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'opened',
      {
        pull_request: {
          title: 'Draft Feature',
          created_at: new Date(Date.now() - 100 * 3600 * 1000).toISOString(),
          draft: true,
          user: { login: 'developer1' },
        },
      },
      48
    );

    expect(updated.isStale).toBe(false);
    expect(updated.draft).toBe(true);
  });

  it('records firstReviewAt on first submitted review and never overwrites it', () => {
    const state = getInitialState();
    const reviewTime1 = new Date(state.openedAt.getTime() + 4 * 3600 * 1000); // 4 hours after opening

    const stateAfterReview1 = EventProcessorService.applyEvent(
      state,
      'pull_request_review',
      'submitted',
      {
        review: {
          id: 101,
          state: 'CHANGES_REQUESTED',
          submitted_at: reviewTime1.toISOString(),
          user: { login: 'senior_reviewer' },
        },
      }
    );

    expect(stateAfterReview1.firstReviewAt).toEqual(reviewTime1);
    expect(stateAfterReview1.timeToFirstReviewMinutes).toBe(240); // 4h = 240m
    expect(stateAfterReview1.isStale).toBe(false); // Reviewed PR is not stale
    expect(stateAfterReview1.reviewStatus).toBe(ReviewStatus.CHANGES_REQUESTED);

    // Second review 2 hours later
    const reviewTime2 = new Date(state.openedAt.getTime() + 6 * 3600 * 1000);
    const stateAfterReview2 = EventProcessorService.applyEvent(
      stateAfterReview1,
      'pull_request_review',
      'submitted',
      {
        review: {
          id: 102,
          state: 'APPROVED',
          submitted_at: reviewTime2.toISOString(),
          user: { login: 'second_reviewer' },
        },
      }
    );

    // CRITICAL: firstReviewAt remains reviewTime1!
    expect(stateAfterReview2.firstReviewAt).toEqual(reviewTime1);
    expect(stateAfterReview2.timeToFirstReviewMinutes).toBe(240);
    expect(stateAfterReview2.reviewStatus).toBe(ReviewStatus.APPROVED);
    expect(stateAfterReview2.reviewers).toContain('senior_reviewer');
    expect(stateAfterReview2.reviewers).toContain('second_reviewer');
  });

  it('distinguishes merged from closed when PR is closed', () => {
    const state = getInitialState();
    const closeTime = new Date();

    // Closed with merge
    const mergedState = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'closed',
      {
        pull_request: {
          merged: true,
          merged_at: closeTime.toISOString(),
          closed_at: closeTime.toISOString(),
        },
      }
    );
    expect(mergedState.state).toBe(PRState.MERGED);
    expect(mergedState.reviewStatus).toBe(ReviewStatus.MERGED);
    expect(mergedState.isStale).toBe(false);

    // Closed without merge
    const unmergedClosedState = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'closed',
      {
        pull_request: {
          merged: false,
          closed_at: closeTime.toISOString(),
        },
      }
    );
    expect(unmergedClosedState.state).toBe(PRState.CLOSED);
    expect(unmergedClosedState.reviewStatus).toBe(ReviewStatus.CLOSED);
    expect(unmergedClosedState.isStale).toBe(false);
  });

  it('reopens closed PRs and recalculates waiting/stale status', () => {
    const state = {
      ...getInitialState(),
      state: PRState.CLOSED,
      closedAt: new Date(),
      reviewStatus: ReviewStatus.CLOSED,
      isStale: false,
    };

    const reopened = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'reopened',
      {
        sender: { login: 'developer1' },
      },
      48
    );

    expect(reopened.state).toBe(PRState.OPEN);
    expect(reopened.closedAt).toBeNull();
    expect(reopened.mergedAt).toBeNull();
    expect(reopened.reviewStatus).toBe(ReviewStatus.WAITING);
    expect(reopened.isStale).toBe(true);
    expect(reopened.timeline.at(-1)?.eventType).toBe('reopened');
  });

  it('records synchronize events without closing or merging the PR', () => {
    const state = getInitialState();

    const synchronized = EventProcessorService.applyEvent(
      state,
      'pull_request',
      'synchronize',
      {
        before: 'abc123',
        after: 'def456',
        sender: { login: 'developer1' },
      }
    );

    expect(synchronized.state).toBe(PRState.OPEN);
    expect(synchronized.timeline.at(-1)?.eventType).toBe('synchronize');
    expect(synchronized.timeline.at(-1)?.details).toEqual({
      before: 'abc123',
      after: 'def456',
    });
  });
});
