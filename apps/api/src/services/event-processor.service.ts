import {
  PRState,
  ReviewStatus,
  ITimelineEvent,
  IPullRequest,
} from '@reviewrelay/shared';
import { MetricsService } from './metrics.service';

export interface PrStateData {
  githubPrId: number;
  repositoryId?: string;
  number: number;
  title: string;
  url: string;
  author: {
    githubUsername: string;
    avatarUrl?: string;
  };
  state: PRState;
  draft: boolean;
  openedAt: Date;
  updatedAt: Date;
  firstReviewAt?: Date | null;
  closedAt?: Date | null;
  mergedAt?: Date | null;
  reviewers: string[];
  reviewStatus: ReviewStatus;
  isStale: boolean;
  timeToFirstReviewMinutes?: number | null;
  timeline: ITimelineEvent[];
  latestReviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | null;
}

export class EventProcessorService {
  /**
   * Pure state transition function.
   * Given current PR state and a webhook event, computes the new PR state.
   */
  public static applyEvent(
    prState: PrStateData,
    eventType: string,
    action: string | undefined,
    payload: any,
    staleThresholdHours: number = 48
  ): PrStateData {
    // Clone to preserve immutability
    const state: PrStateData = {
      ...prState,
      reviewers: [...prState.reviewers],
      timeline: [...prState.timeline],
      updatedAt: new Date(),
    };

    if (eventType === 'pull_request') {
      switch (action) {
        case 'opened':
          return this.applyPullRequestOpened(state, payload, staleThresholdHours);
        case 'reopened':
          return this.applyPullRequestReopened(state, payload, staleThresholdHours);
        case 'closed':
          return this.applyPullRequestClosed(state, payload);
        case 'synchronize':
          return this.applyPullRequestSynchronize(state, payload);
        case 'converted_to_draft':
          return this.applyPullRequestDraftChange(state, true, payload);
        case 'ready_for_review':
          return this.applyPullRequestDraftChange(state, false, payload, staleThresholdHours);
        case 'review_requested':
          return this.applyReviewRequested(state, payload);
        case 'review_request_removed':
          return this.applyReviewRequestRemoved(state, payload);
        default:
          return state;
      }
    }

    if (eventType === 'pull_request_review') {
      if (action === 'submitted') {
        return this.applyReviewSubmitted(state, payload);
      }
    }

    return state;
  }

  public static applyPullRequestOpened(
    state: PrStateData,
    payload: any,
    staleThresholdHours: number
  ): PrStateData {
    const pr = payload.pull_request;
    const openedAt = pr?.created_at ? new Date(pr.created_at) : new Date();
    const isDraft = Boolean(pr?.draft);

    state.title = pr?.title || state.title;
    state.url = pr?.html_url || state.url;
    state.state = PRState.OPEN;
    state.draft = isDraft;
    state.openedAt = openedAt;
    state.closedAt = null;
    state.mergedAt = null;
    state.firstReviewAt = null;
    state.timeToFirstReviewMinutes = null;
    state.reviewStatus = isDraft ? ReviewStatus.HEALTHY : ReviewStatus.WAITING;

    state.isStale = MetricsService.calculateIsStale({
      state: state.state,
      draft: state.draft,
      openedAt: state.openedAt,
      firstReviewAt: state.firstReviewAt,
      staleThresholdHours,
    });

    state.timeline.push({
      eventType: 'opened',
      timestamp: openedAt.toISOString(),
      actor: {
        githubUsername: pr?.user?.login || 'unknown',
        avatarUrl: pr?.user?.avatar_url,
      },
      details: { draft: isDraft },
    });

    return state;
  }

  public static applyPullRequestClosed(state: PrStateData, payload: any): PrStateData {
    const pr = payload.pull_request;
    const isMerged = Boolean(pr?.merged || pr?.merged_at);
    const closedAt = pr?.closed_at ? new Date(pr.closed_at) : new Date();

    state.state = isMerged ? PRState.MERGED : PRState.CLOSED;
    state.closedAt = closedAt;
    state.mergedAt = isMerged ? (pr?.merged_at ? new Date(pr.merged_at) : closedAt) : null;
    state.reviewStatus = isMerged ? ReviewStatus.MERGED : ReviewStatus.CLOSED;
    state.isStale = false; // Closed or merged PRs are never stale

    state.timeline.push({
      eventType: isMerged ? 'merged' : 'closed',
      timestamp: closedAt.toISOString(),
      actor: {
        githubUsername: payload.sender?.login || pr?.user?.login || 'unknown',
        avatarUrl: payload.sender?.avatar_url,
      },
      details: { merged: isMerged },
    });

    return state;
  }

  public static applyPullRequestReopened(
    state: PrStateData,
    payload: any,
    staleThresholdHours: number
  ): PrStateData {
    const timestamp = new Date();
    state.state = PRState.OPEN;
    state.closedAt = null;
    state.mergedAt = null;
    state.reviewStatus = state.firstReviewAt ? ReviewStatus.REVIEWED : ReviewStatus.WAITING;

    state.isStale = MetricsService.calculateIsStale({
      state: state.state,
      draft: state.draft,
      openedAt: state.openedAt,
      firstReviewAt: state.firstReviewAt,
      staleThresholdHours,
    });

    state.timeline.push({
      eventType: 'reopened',
      timestamp: timestamp.toISOString(),
      actor: {
        githubUsername: payload.sender?.login || 'unknown',
        avatarUrl: payload.sender?.avatar_url,
      },
    });

    return state;
  }

  public static applyPullRequestSynchronize(state: PrStateData, payload: any): PrStateData {
    const timestamp = new Date();
    state.timeline.push({
      eventType: 'synchronize',
      timestamp: timestamp.toISOString(),
      actor: {
        githubUsername: payload.sender?.login || 'unknown',
        avatarUrl: payload.sender?.avatar_url,
      },
      details: { before: payload.before, after: payload.after },
    });

    return state;
  }

  public static applyPullRequestDraftChange(
    state: PrStateData,
    isDraft: boolean,
    payload: any,
    staleThresholdHours: number = 48
  ): PrStateData {
    state.draft = isDraft;
    const timestamp = new Date();

    if (isDraft) {
      state.isStale = false; // Drafts are never stale
      state.reviewStatus = ReviewStatus.HEALTHY;
    } else {
      state.isStale = MetricsService.calculateIsStale({
        state: state.state,
        draft: false,
        openedAt: state.openedAt,
        firstReviewAt: state.firstReviewAt,
        staleThresholdHours,
      });
      state.reviewStatus = state.firstReviewAt ? ReviewStatus.REVIEWED : ReviewStatus.WAITING;
    }

    state.timeline.push({
      eventType: isDraft ? 'converted_to_draft' : 'ready_for_review',
      timestamp: timestamp.toISOString(),
      actor: {
        githubUsername: payload.sender?.login || 'unknown',
        avatarUrl: payload.sender?.avatar_url,
      },
    });

    return state;
  }

  public static applyReviewRequested(state: PrStateData, payload: any): PrStateData {
    const reviewer = payload.requested_reviewer?.login;
    if (reviewer && !state.reviewers.includes(reviewer)) {
      state.reviewers.push(reviewer);
    }

    state.timeline.push({
      eventType: 'reviewer_requested',
      timestamp: new Date().toISOString(),
      actor: {
        githubUsername: payload.sender?.login || 'unknown',
        avatarUrl: payload.sender?.avatar_url,
      },
      details: { requested_reviewer: reviewer },
    });

    return state;
  }

  public static applyReviewRequestRemoved(state: PrStateData, payload: any): PrStateData {
    const reviewer = payload.requested_reviewer?.login;
    if (reviewer) {
      state.reviewers = state.reviewers.filter((r) => r !== reviewer);
    }
    return state;
  }

  public static applyReviewSubmitted(state: PrStateData, payload: any): PrStateData {
    const review = payload.review;
    const reviewSubmittedAt = review?.submitted_at ? new Date(review.submitted_at) : new Date();
    const reviewerLogin = review?.user?.login;
    const reviewState = (review?.state || '').toUpperCase(); // 'APPROVED', 'CHANGES_REQUESTED', 'COMMENTED'

    if (reviewerLogin && !state.reviewers.includes(reviewerLogin)) {
      state.reviewers.push(reviewerLogin);
    }

    // Set firstReviewAt ONLY once! Do not overwrite subsequent reviews
    if (!state.firstReviewAt) {
      state.firstReviewAt = reviewSubmittedAt;
      const { minutes } = MetricsService.calculateTimeToFirstReview(
        state.openedAt,
        reviewSubmittedAt
      );
      state.timeToFirstReviewMinutes = minutes;
    }

    // Once reviewed, a PR is never stale
    state.isStale = false;

    // Update status based on review outcome
    if (reviewState === 'APPROVED') {
      state.reviewStatus = ReviewStatus.APPROVED;
      state.latestReviewState = 'APPROVED';
    } else if (reviewState === 'CHANGES_REQUESTED') {
      state.reviewStatus = ReviewStatus.CHANGES_REQUESTED;
      state.latestReviewState = 'CHANGES_REQUESTED';
    } else {
      if (state.reviewStatus !== ReviewStatus.APPROVED && state.reviewStatus !== ReviewStatus.CHANGES_REQUESTED) {
        state.reviewStatus = ReviewStatus.REVIEWED;
      }
      state.latestReviewState = 'COMMENTED';
    }

    state.timeline.push({
      eventType:
        reviewState === 'APPROVED'
          ? 'approved'
          : reviewState === 'CHANGES_REQUESTED'
          ? 'changes_requested'
          : 'review_submitted',
      timestamp: reviewSubmittedAt.toISOString(),
      actor: {
        githubUsername: reviewerLogin || 'unknown',
        avatarUrl: review?.user?.avatar_url,
      },
      details: {
        state: reviewState,
        reviewId: review?.id,
      },
    });

    return state;
  }
}
