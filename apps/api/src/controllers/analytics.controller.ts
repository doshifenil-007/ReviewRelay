import { Request, Response, NextFunction } from 'express';
import { PullRequest } from '../models/PullRequest';
import { Repository } from '../models/Repository';
import { Organization } from '../models/Organization';
import { MetricsService } from '../services/metrics.service';
import { PRState, DateRangeQuerySchema } from '@reviewrelay/shared';
import { Types } from 'mongoose';

export class AnalyticsController {
  /**
   * Main dashboard analytics overview (KPIs + Health + Time series)
   */
  public static async getOverview(
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

      const days = parseInt(req.query.days?.toString() || '30', 10);
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      // Fetch repos for this org
      const repos = await Repository.find({ organizationId: org._id });
      const repoIds = repos.map((r) => r._id);

      // Fetch all PRs relevant to this org
      const allPrs = await PullRequest.find({
        repositoryId: { $in: repoIds },
      }).lean();

      // Open PRs
      const openPrs = allPrs.filter((pr) => pr.state === PRState.OPEN);
      const stalePrs = openPrs.filter((pr) =>
        MetricsService.calculateIsStale({
          state: pr.state,
          draft: pr.draft,
          openedAt: pr.openedAt,
          firstReviewAt: pr.firstReviewAt,
          staleThresholdHours: org.staleThresholdHours,
        })
      );

      // PRs reviewed in selected period
      const reviewedPrsInPeriod = allPrs.filter(
        (pr) => pr.firstReviewAt && new Date(pr.firstReviewAt) >= sinceDate
      );

      const reviewTimesHours = reviewedPrsInPeriod
        .filter((pr) => pr.timeToFirstReviewMinutes != null)
        .map((pr) => Number((pr.timeToFirstReviewMinutes! / 60).toFixed(2)));

      const aggregates = MetricsService.calculateSpeedAggregates(reviewTimesHours);

      // PR Health Breakdown
      const mergedPrs = allPrs.filter((pr) => pr.state === PRState.MERGED);
      const closedPrs = allPrs.filter((pr) => pr.state === PRState.CLOSED);

      const kpis = {
        openPrs: openPrs.length,
        stalePrs: stalePrs.length,
        avgFirstReviewHours: aggregates.avg,
        medianFirstReviewHours: aggregates.median,
        p90FirstReviewHours: aggregates.p90,
        prsReviewedInPeriod: reviewedPrsInPeriod.length,
        stalePercentage:
          openPrs.length > 0 ? Number(((stalePrs.length / openPrs.length) * 100).toFixed(1)) : 0,
      };

      const prHealth = {
        totalPrs: allPrs.length,
        openPrs: openPrs.length,
        stalePrs: stalePrs.length,
        mergedPrs: mergedPrs.length,
        closedPrs: closedPrs.length,
      };

      // Generate daily time series for charts
      const timeSeriesMap = new Map<
        string,
        { date: string; openedCount: number; mergedCount: number; reviewTimes: number[] }
      >();

      for (let i = days - 1; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dateKey = d.toISOString().split('T')[0];
        timeSeriesMap.set(dateKey, {
          date: dateKey,
          openedCount: 0,
          mergedCount: 0,
          reviewTimes: [],
        });
      }

      allPrs.forEach((pr) => {
        const openKey = new Date(pr.openedAt).toISOString().split('T')[0];
        if (timeSeriesMap.has(openKey)) {
          timeSeriesMap.get(openKey)!.openedCount++;
        }

        if (pr.mergedAt) {
          const mergeKey = new Date(pr.mergedAt).toISOString().split('T')[0];
          if (timeSeriesMap.has(mergeKey)) {
            timeSeriesMap.get(mergeKey)!.mergedCount++;
          }
        }

        if (pr.firstReviewAt && pr.timeToFirstReviewMinutes != null) {
          const reviewKey = new Date(pr.firstReviewAt).toISOString().split('T')[0];
          if (timeSeriesMap.has(reviewKey)) {
            timeSeriesMap.get(reviewKey)!.reviewTimes.push(pr.timeToFirstReviewMinutes / 60);
          }
        }
      });

      const timeSeries = Array.from(timeSeriesMap.values()).map((item) => {
        const avg =
          item.reviewTimes.length > 0
            ? Number(
                (
                  item.reviewTimes.reduce((acc, v) => acc + v, 0) / item.reviewTimes.length
                ).toFixed(1)
              )
            : 0;

        return {
          date: item.date,
          openedCount: item.openedCount,
          mergedCount: item.mergedCount,
          avgFirstReviewHours: avg,
        };
      });

      res.json({
        kpis,
        prHealth,
        timeSeries,
        staleThresholdHours: org.staleThresholdHours,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Detailed review speed metrics (Avg, Median, P90)
   */
  public static async getReviewSpeed(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId?.toString() || req.organizationId;
      const days = parseInt(req.query.days?.toString() || '30', 10);
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const repos = await Repository.find({ organizationId: new Types.ObjectId(organizationId) });
      const repoIds = repos.map((r) => r._id);

      const prs = await PullRequest.find({
        repositoryId: { $in: repoIds },
        firstReviewAt: { $ne: null, $gte: sinceDate },
      }).lean();

      const hoursList = prs
        .filter((pr) => pr.timeToFirstReviewMinutes != null)
        .map((pr) => pr.timeToFirstReviewMinutes! / 60);

      const { avg, median, p90 } = MetricsService.calculateSpeedAggregates(hoursList);

      res.json({
        avgFirstReviewHours: avg,
        medianFirstReviewHours: median,
        p90FirstReviewHours: p90,
        totalPrsEvaluated: hoursList.length,
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Reviewer workload distribution
   */
  public static async getReviewerWorkload(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const organizationId = req.query.organizationId?.toString() || req.organizationId;
      const days = parseInt(req.query.days?.toString() || '30', 10);
      const sinceDate = new Date();
      sinceDate.setDate(sinceDate.getDate() - days);

      const repos = await Repository.find({ organizationId: new Types.ObjectId(organizationId) });
      const repoIds = repos.map((r) => r._id);

      const allPrs = await PullRequest.find({
        repositoryId: { $in: repoIds },
      }).lean();

      // Aggregate reviews by actor from PR timelines and reviewers field
      const reviewersMap = new Map<
        string,
        {
          reviewer: string;
          avatarUrl?: string;
          reviewsCompleted: number;
          pendingReviews: number;
          reviewTimes: number[];
          oldestPendingHours: number | null;
        }
      >();

      const now = Date.now();

      allPrs.forEach((pr) => {
        // Track completed reviews from timeline
        if (pr.timeline) {
          pr.timeline.forEach((event) => {
            if (
              (event.eventType === 'review_submitted' ||
                event.eventType === 'approved' ||
                event.eventType === 'changes_requested') &&
              new Date(event.timestamp) >= sinceDate
            ) {
              const username = event.actor.githubUsername;
              if (username && username !== 'unknown') {
                if (!reviewersMap.has(username)) {
                  reviewersMap.set(username, {
                    reviewer: username,
                    avatarUrl: event.actor.avatarUrl,
                    reviewsCompleted: 0,
                    pendingReviews: 0,
                    reviewTimes: [],
                    oldestPendingHours: null,
                  });
                }
                const record = reviewersMap.get(username)!;
                record.reviewsCompleted++;
                if (pr.timeToFirstReviewMinutes) {
                  record.reviewTimes.push(pr.timeToFirstReviewMinutes / 60);
                }
              }
            }
          });
        }

        // Track pending reviews on OPEN PRs
        if (pr.state === PRState.OPEN && pr.reviewers && pr.reviewers.length > 0) {
          const prOpenTime = new Date(pr.openedAt).getTime();
          const waitingHours = Number(((now - prOpenTime) / (1000 * 60 * 60)).toFixed(1));

          pr.reviewers.forEach((reviewer) => {
            if (!reviewersMap.has(reviewer)) {
              reviewersMap.set(reviewer, {
                reviewer,
                reviewsCompleted: 0,
                pendingReviews: 0,
                reviewTimes: [],
                oldestPendingHours: null,
              });
            }
            const record = reviewersMap.get(reviewer)!;
            // If PR has not been reviewed yet by this reviewer
            record.pendingReviews++;
            if (
              record.oldestPendingHours === null ||
              waitingHours > record.oldestPendingHours
            ) {
              record.oldestPendingHours = waitingHours;
            }
          });
        }
      });

      const totalCompletedReviews = Array.from(reviewersMap.values()).reduce(
        (acc, r) => acc + r.reviewsCompleted,
        0
      );

      const workloadList = Array.from(reviewersMap.values())
        .map((r) => {
          const avgReviewTimeHours =
            r.reviewTimes.length > 0
              ? Number(
                  (
                    r.reviewTimes.reduce((acc, v) => acc + v, 0) / r.reviewTimes.length
                  ).toFixed(1)
                )
              : 0;

          const percentageOfTeamReviews =
            totalCompletedReviews > 0
              ? Number(((r.reviewsCompleted / totalCompletedReviews) * 100).toFixed(1))
              : 0;

          return {
            reviewer: r.reviewer,
            avatarUrl: r.avatarUrl,
            reviewsCompleted: r.reviewsCompleted,
            pendingReviews: r.pendingReviews,
            avgReviewTimeHours,
            oldestPendingHours: r.oldestPendingHours,
            percentageOfTeamReviews,
          };
        })
        .sort((a, b) => b.reviewsCompleted - a.reviewsCompleted);

      res.json(workloadList);
    } catch (err) {
      next(err);
    }
  }
}
