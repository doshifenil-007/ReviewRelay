import axios from 'axios';
import crypto from 'crypto';
import { Types } from 'mongoose';
import { Repository } from '../models/Repository';
import { PullRequest } from '../models/PullRequest';
import { Organization } from '../models/Organization';
import { PRState, ReviewStatus } from '@reviewrelay/shared';
import { MetricsService } from './metrics.service';

interface GitHubRepo {
  id: number;
  name: string;
  full_name: string;
  owner: {
    login: string;
  };
}

interface GitHubPullRequest {
  id: number;
  number: number;
  title: string;
  html_url: string;
  state: 'open' | 'closed';
  draft: boolean;
  created_at: string;
  updated_at: string;
  closed_at?: string | null;
  merged_at?: string | null;
  user?: {
    login: string;
    avatar_url?: string;
  };
  requested_reviewers?: Array<{
    login: string;
  }>;
}

export class GitHubService {
  private static readonly perPage = 100;

  private static authHeaders(accessToken: string) {
    return {
      Authorization: `Bearer ${accessToken}`,
      Accept: 'application/vnd.github+json',
      'X-GitHub-Api-Version': '2022-11-28',
      'User-Agent': 'ReviewRelay-App',
    };
  }

  private static async fetchPaginated<T>(
    accessToken: string,
    url: string,
    params: Record<string, string | number> = {}
  ): Promise<T[]> {
    const results: T[] = [];
    let page = 1;

    while (true) {
      const response = await axios.get<T[]>(url, {
        headers: this.authHeaders(accessToken),
        params: {
          ...params,
          per_page: this.perPage,
          page,
        },
      });

      const data = response.data || [];
      results.push(...data);

      if (data.length < this.perPage) {
        break;
      }

      page += 1;
    }

    return results;
  }

  public static async fetchAccessibleRepositories(accessToken: string): Promise<GitHubRepo[]> {
    return this.fetchPaginated<GitHubRepo>(accessToken, 'https://api.github.com/user/repos', {
      affiliation: 'owner,collaborator,organization_member',
      sort: 'updated',
      direction: 'desc',
    });
  }

  public static async fetchPullRequests(
    accessToken: string,
    fullName: string,
    state: 'open' | 'closed' | 'all' = 'all'
  ): Promise<GitHubPullRequest[]> {
    return this.fetchPaginated<GitHubPullRequest>(
      accessToken,
      `https://api.github.com/repos/${fullName}/pulls`,
      { state, sort: 'updated', direction: 'desc' }
    );
  }

  public static async syncAccessibleRepositoriesAndPullRequests(params: {
    accessToken: string;
    organizationId: string;
  }): Promise<{
    repositoriesSynced: number;
    pullRequestsSynced: number;
  }> {
    const organization = await Organization.findById(params.organizationId);
    if (!organization) {
      throw new Error('Organization not found');
    }

    const staleThreshold = organization.staleThresholdHours ?? 48;
    const repos = await this.fetchAccessibleRepositories(params.accessToken);
    let pullRequestsSynced = 0;

    for (const ghRepo of repos) {
      const repo = await Repository.findOneAndUpdate(
        {
          organizationId: new Types.ObjectId(params.organizationId),
          githubRepositoryId: ghRepo.id,
        },
        {
          $set: {
            name: ghRepo.name,
            fullName: ghRepo.full_name,
            owner: ghRepo.owner.login,
          },
          $setOnInsert: {
            webhookConfigured: false,
            webhookSecret: crypto.randomBytes(24).toString('hex'),
          },
        },
        { upsert: true, new: true, setDefaultsOnInsert: true }
      );

      const pullRequests = await this.fetchPullRequests(params.accessToken, ghRepo.full_name, 'all');

      for (const ghPr of pullRequests) {
        const prState = ghPr.merged_at
          ? PRState.MERGED
          : ghPr.state === 'closed'
          ? PRState.CLOSED
          : PRState.OPEN;
        const openedAt = new Date(ghPr.created_at);
        const firstReviewAt = null;
        const isStale = MetricsService.calculateIsStale({
          state: prState,
          draft: Boolean(ghPr.draft),
          openedAt,
          firstReviewAt,
          staleThresholdHours: staleThreshold,
        });

        await PullRequest.findOneAndUpdate(
          {
            repositoryId: repo._id,
            number: ghPr.number,
          },
          {
            $set: {
              githubPrId: ghPr.id,
              repositoryId: repo._id,
              number: ghPr.number,
              title: ghPr.title,
              url: ghPr.html_url,
              author: {
                githubUsername: ghPr.user?.login || 'unknown',
                avatarUrl: ghPr.user?.avatar_url,
              },
              state: prState,
              draft: Boolean(ghPr.draft),
              openedAt,
              updatedAt: ghPr.updated_at ? new Date(ghPr.updated_at) : new Date(),
              closedAt: ghPr.closed_at ? new Date(ghPr.closed_at) : null,
              mergedAt: ghPr.merged_at ? new Date(ghPr.merged_at) : null,
              reviewers: (ghPr.requested_reviewers || []).map((reviewer) => reviewer.login),
              reviewStatus:
                prState === PRState.MERGED
                  ? ReviewStatus.MERGED
                  : prState === PRState.CLOSED
                  ? ReviewStatus.CLOSED
                  : isStale
                  ? ReviewStatus.STALE
                  : ghPr.draft
                  ? ReviewStatus.HEALTHY
                  : ReviewStatus.WAITING,
              isStale,
            },
            $setOnInsert: {
              firstReviewAt: null,
              timeToFirstReviewMinutes: null,
              timeline: [
                {
                  eventType: 'github_sync',
                  timestamp: new Date().toISOString(),
                  actor: {
                    githubUsername: ghPr.user?.login || 'unknown',
                    avatarUrl: ghPr.user?.avatar_url,
                  },
                },
              ],
              latestReviewState: null,
            },
          },
          { upsert: true, new: true, setDefaultsOnInsert: true }
        );

        pullRequestsSynced += 1;
      }
    }

    return {
      repositoriesSynced: repos.length,
      pullRequestsSynced,
    };
  }
}
