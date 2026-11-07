import { PullRequest, IPullRequestDocument } from '../models/PullRequest';
import { Repository } from '../models/Repository';
import { Organization } from '../models/Organization';
import { EventProcessorService, PrStateData } from './event-processor.service';
import { PRState, ReviewStatus } from '@reviewrelay/shared';

export class PrStateService {
  /**
   * Processes a verified webhook event and updates MongoDB PR state.
   */
  public static async processWebhookEvent(
    eventType: string,
    action: string | undefined,
    payload: any
  ): Promise<{ pr: IPullRequestDocument | null; repositoryFound: boolean }> {
    const githubRepoId = payload.repository?.id;
    const repoFullName = payload.repository?.full_name;

    if (!githubRepoId && !repoFullName) {
      return { pr: null, repositoryFound: false };
    }

    // Find repository in our database
    const repository = await Repository.findOne({
      $or: [
        { githubRepositoryId: githubRepoId },
        { fullName: repoFullName },
      ],
    });

    if (!repository) {
      return { pr: null, repositoryFound: false };
    }

    // Mark webhook as confirmed active
    if (!repository.webhookConfigured) {
      repository.webhookConfigured = true;
      await repository.save();
    }

    // Fetch org to get custom staleThresholdHours
    const organization = await Organization.findById(repository.organizationId);
    const staleThreshold = organization?.staleThresholdHours ?? 48;

    // Pull PR payload
    const prPayload = payload.pull_request;
    if (!prPayload && eventType !== 'pull_request_review') {
      return { pr: null, repositoryFound: true };
    }

    const prNumber = prPayload?.number;
    const githubPrId = prPayload?.id;

    if (!prNumber || !githubPrId) {
      return { pr: null, repositoryFound: true };
    }

    // Find existing PR or initialize empty state
    let prDoc = await PullRequest.findOne({
      repositoryId: repository._id,
      number: prNumber,
    });

    const initialOpenedAt = prPayload.created_at ? new Date(prPayload.created_at) : new Date();

    const currentState: PrStateData = prDoc
      ? {
          githubPrId: prDoc.githubPrId,
          repositoryId: prDoc.repositoryId.toString(),
          number: prDoc.number,
          title: prDoc.title,
          url: prDoc.url,
          author: prDoc.author,
          state: prDoc.state,
          draft: prDoc.draft,
          openedAt: prDoc.openedAt,
          updatedAt: prDoc.updatedAt,
          firstReviewAt: prDoc.firstReviewAt,
          closedAt: prDoc.closedAt,
          mergedAt: prDoc.mergedAt,
          reviewers: prDoc.reviewers,
          reviewStatus: prDoc.reviewStatus,
          isStale: prDoc.isStale,
          timeToFirstReviewMinutes: prDoc.timeToFirstReviewMinutes,
          timeline: prDoc.timeline || [],
          latestReviewState: prDoc.latestReviewState,
        }
      : {
          githubPrId,
          repositoryId: repository._id.toString(),
          number: prNumber,
          title: prPayload.title || `PR #${prNumber}`,
          url: prPayload.html_url || '',
          author: {
            githubUsername: prPayload.user?.login || 'unknown',
            avatarUrl: prPayload.user?.avatar_url,
          },
          state: PRState.OPEN,
          draft: Boolean(prPayload.draft),
          openedAt: initialOpenedAt,
          updatedAt: new Date(),
          firstReviewAt: null,
          closedAt: null,
          mergedAt: null,
          reviewers: [],
          reviewStatus: prPayload.draft ? ReviewStatus.HEALTHY : ReviewStatus.WAITING,
          isStale: false,
          timeToFirstReviewMinutes: null,
          timeline: [],
          latestReviewState: null,
        };

    // Apply the pure state transition
    const updatedState = EventProcessorService.applyEvent(
      currentState,
      eventType,
      action,
      payload,
      staleThreshold
    );

    if (!prDoc) {
      prDoc = new PullRequest({
        ...updatedState,
        repositoryId: repository._id,
      });
    } else {
      Object.assign(prDoc, {
        title: updatedState.title,
        url: updatedState.url,
        state: updatedState.state,
        draft: updatedState.draft,
        openedAt: updatedState.openedAt,
        updatedAt: updatedState.updatedAt,
        firstReviewAt: updatedState.firstReviewAt,
        closedAt: updatedState.closedAt,
        mergedAt: updatedState.mergedAt,
        reviewers: updatedState.reviewers,
        reviewStatus: updatedState.reviewStatus,
        isStale: updatedState.isStale,
        timeToFirstReviewMinutes: updatedState.timeToFirstReviewMinutes,
        timeline: updatedState.timeline,
        latestReviewState: updatedState.latestReviewState,
      });
    }

    await prDoc.save();
    return { pr: prDoc, repositoryFound: true };
  }
}
