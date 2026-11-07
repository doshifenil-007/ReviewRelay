import { Request, Response, NextFunction } from 'express';
import { PullRequest } from '../models/PullRequest';
import { Repository } from '../models/Repository';
import { Organization } from '../models/Organization';
import { Membership } from '../models/Membership';
import { MetricsService } from '../services/metrics.service';
import { PRState, ReviewStatus, PrQuerySchema } from '@reviewrelay/shared';
import { Types } from 'mongoose';

export class PullRequestController {
  /**
   * Lists pull requests for a repository with filtering and pagination
   */
  public static async listRepositoryPrs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const repositoryId = req.params.repositoryId || req.params.id;
      const query = PrQuerySchema.parse(req.query);

      const repo = await Repository.findById(repositoryId);
      if (!repo) {
        res.status(404).json({ error: 'Repository not found' });
        return;
      }

      const org = await Organization.findById(repo.organizationId);
      const staleThreshold = org?.staleThresholdHours ?? 48;

      const filter: any = { repositoryId: repo._id };

      if (query.state && query.state !== 'all') {
        filter.state = query.state;
      }

      if (query.isStale === 'true') {
        filter.isStale = true;
      } else if (query.isStale === 'false') {
        filter.isStale = false;
      }

      if (query.search) {
        filter.$or = [
          { title: { $regex: query.search, $options: 'i' } },
          { 'author.githubUsername': { $regex: query.search, $options: 'i' } },
        ];
      }

      const page = query.page || 1;
      const limit = query.limit || 25;
      const skip = (page - 1) * limit;

      const [prs, total] = await Promise.all([
        PullRequest.find(filter)
          .sort({ isStale: -1, updatedAt: -1 })
          .skip(skip)
          .limit(limit)
          .lean(),
        PullRequest.countDocuments(filter),
      ]);

      // Dynamically calculate stale status against the current clock
      const mappedPrs = prs.map((pr: any) => {
        const isStale = MetricsService.calculateIsStale({
          state: pr.state,
          draft: pr.draft,
          openedAt: pr.openedAt,
          firstReviewAt: pr.firstReviewAt,
          staleThresholdHours: staleThreshold,
        });

        // Compute review status display
        let displayStatus = pr.reviewStatus;
        if (isStale) {
          displayStatus = ReviewStatus.STALE;
        }

        return {
          id: pr._id.toString(),
          githubPrId: pr.githubPrId,
          repositoryId: pr.repositoryId.toString(),
          repository: {
            id: repo._id.toString(),
            name: repo.name,
            fullName: repo.fullName,
          },
          number: pr.number,
          title: pr.title,
          url: pr.url,
          author: pr.author,
          state: pr.state,
          draft: pr.draft,
          openedAt: pr.openedAt.toISOString(),
          updatedAt: pr.updatedAt.toISOString(),
          firstReviewAt: pr.firstReviewAt ? pr.firstReviewAt.toISOString() : null,
          closedAt: pr.closedAt ? pr.closedAt.toISOString() : null,
          mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
          reviewers: pr.reviewers,
          reviewStatus: displayStatus,
          isStale,
          timeToFirstReviewMinutes: pr.timeToFirstReviewMinutes,
          latestReviewState: pr.latestReviewState,
        };
      });

      res.json({
        data: mappedPrs,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Retrieves single PR by ID with timeline and calculated metrics
   */
  public static async getPrDetails(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const prId = req.params.id;
      if (!Types.ObjectId.isValid(prId)) {
        res.status(400).json({ error: 'Invalid PR ID' });
        return;
      }

      const pr = await PullRequest.findById(prId).populate('repositoryId');
      if (!pr) {
        res.status(404).json({ error: 'Pull request not found' });
        return;
      }

      const repo: any = pr.repositoryId;
      const userId = req.user?.id;
      if (!userId) {
        res.status(401).json({ error: 'Authentication required' });
        return;
      }
      const membership = await Membership.findOne({
        userId: new Types.ObjectId(userId),
        organizationId: repo?.organizationId,
      });
      if (!membership) {
        res.status(403).json({ error: 'Access denied: You are not a member of this organization' });
        return;
      }

      const org = await Organization.findById(repo?.organizationId);
      const staleThreshold = org?.staleThresholdHours ?? 48;

      const isStale = MetricsService.calculateIsStale({
        state: pr.state,
        draft: pr.draft,
        openedAt: pr.openedAt,
        firstReviewAt: pr.firstReviewAt,
        staleThresholdHours: staleThreshold,
      });

      // Calculate Lifetime and Waiting Time
      const now = Date.now();
      const openTime = new Date(pr.openedAt).getTime();
      const endTime = pr.mergedAt
        ? new Date(pr.mergedAt).getTime()
        : pr.closedAt
        ? new Date(pr.closedAt).getTime()
        : now;

      const lifetimeMinutes = Math.round((endTime - openTime) / (1000 * 60));
      const currentWaitingMinutes =
        pr.state === PRState.OPEN && !pr.firstReviewAt
          ? Math.round((now - openTime) / (1000 * 60))
          : 0;

      res.json({
        id: pr._id.toString(),
        githubPrId: pr.githubPrId,
        repositoryId: repo._id.toString(),
        repository: {
          id: repo._id.toString(),
          name: repo.name,
          fullName: repo.fullName,
        },
        number: pr.number,
        title: pr.title,
        url: pr.url,
        author: pr.author,
        state: pr.state,
        draft: pr.draft,
        openedAt: pr.openedAt.toISOString(),
        updatedAt: pr.updatedAt.toISOString(),
        firstReviewAt: pr.firstReviewAt ? pr.firstReviewAt.toISOString() : null,
        closedAt: pr.closedAt ? pr.closedAt.toISOString() : null,
        mergedAt: pr.mergedAt ? pr.mergedAt.toISOString() : null,
        reviewers: pr.reviewers,
        reviewStatus: isStale ? ReviewStatus.STALE : pr.reviewStatus,
        isStale,
        timeToFirstReviewMinutes: pr.timeToFirstReviewMinutes,
        latestReviewState: pr.latestReviewState,
        metrics: {
          lifetimeMinutes,
          currentWaitingMinutes,
          timeToFirstReviewMinutes: pr.timeToFirstReviewMinutes,
          staleThresholdHours: staleThreshold,
        },
        timeline: (pr.timeline || []).sort(
          (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
        ),
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Top-level open/stale PRs across all connected repositories in the organization
   */
  public static async listOrganizationPrs(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId?.toString() || req.organizationId;
      if (!organizationId) {
        res.status(400).json({ error: 'organizationId is required' });
        return;
      }

      const org = await Organization.findById(organizationId);
      if (!org) {
        res.status(404).json({ error: 'Organization not found' });
        return;
      }

      const repos = await Repository.find({ organizationId: org._id });
      const repoIds = repos.map((r) => r._id);
      const repoMap = new Map(repos.map((r) => [r._id.toString(), r]));

      const isStaleFilter = req.query.staleOnly === 'true';

      const prs = await PullRequest.find({
        repositoryId: { $in: repoIds },
        state: PRState.OPEN,
      })
        .sort({ openedAt: 1 })
        .limit(100)
        .lean();

      const evaluatedPrs = prs
        .map((pr: any) => {
          const repo = repoMap.get(pr.repositoryId.toString());
          const isStale = MetricsService.calculateIsStale({
            state: pr.state,
            draft: pr.draft,
            openedAt: pr.openedAt,
            firstReviewAt: pr.firstReviewAt,
            staleThresholdHours: org.staleThresholdHours,
          });

          return {
            id: pr._id.toString(),
            githubPrId: pr.githubPrId,
            repositoryId: pr.repositoryId.toString(),
            repository: {
              id: repo?._id.toString(),
              name: repo?.name || 'repo',
              fullName: repo?.fullName || 'org/repo',
            },
            number: pr.number,
            title: pr.title,
            url: pr.url,
            author: pr.author,
            state: pr.state,
            draft: pr.draft,
            openedAt: pr.openedAt.toISOString(),
            updatedAt: pr.updatedAt.toISOString(),
            firstReviewAt: pr.firstReviewAt ? pr.firstReviewAt.toISOString() : null,
            reviewers: pr.reviewers,
            reviewStatus: isStale ? ReviewStatus.STALE : pr.reviewStatus,
            isStale,
            timeToFirstReviewMinutes: pr.timeToFirstReviewMinutes,
          };
        })
        .filter((pr) => (!isStaleFilter ? true : pr.isStale));

      res.json(evaluatedPrs);
    } catch (err) {
      next(err);
    }
  }
}
