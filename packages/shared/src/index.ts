import { z } from 'zod';

// ==========================================
// Roles & Enums
// ==========================================
export const OrgRole = {
  OWNER: 'OWNER',
  MEMBER: 'MEMBER',
} as const;
export type OrgRole = (typeof OrgRole)[keyof typeof OrgRole];

export const PRState = {
  OPEN: 'open',
  CLOSED: 'closed',
  MERGED: 'merged',
} as const;
export type PRState = (typeof PRState)[keyof typeof PRState];

export const ReviewStatus = {
  HEALTHY: 'healthy',
  WAITING: 'waiting',
  STALE: 'stale',
  REVIEWED: 'reviewed',
  CHANGES_REQUESTED: 'changes_requested',
  APPROVED: 'approved',
  MERGED: 'merged',
  CLOSED: 'closed',
} as const;
export type ReviewStatus = (typeof ReviewStatus)[keyof typeof ReviewStatus];

export const WebhookProcessingStatus = {
  PENDING: 'pending',
  PROCESSED: 'processed',
  DUPLICATE: 'duplicate',
  IGNORED: 'ignored',
  FAILED: 'failed',
} as const;
export type WebhookProcessingStatus = (typeof WebhookProcessingStatus)[keyof typeof WebhookProcessingStatus];

// ==========================================
// Domain Entity Interfaces
// ==========================================
export interface IUser {
  id: string;
  githubId: number;
  githubUsername: string;
  displayName?: string;
  avatarUrl?: string;
  email?: string;
  createdAt: string;
  updatedAt: string;
}

export interface IOrganization {
  id: string;
  name: string;
  ownerId: string;
  staleThresholdHours: number;
  createdAt: string;
  updatedAt: string;
}

export interface IMembership {
  id: string;
  userId: string;
  organizationId: string;
  role: OrgRole;
  user?: IUser;
  createdAt: string;
  updatedAt: string;
}

export interface IRepository {
  id: string;
  githubRepositoryId: number;
  organizationId: string;
  name: string;
  fullName: string;
  owner: string;
  webhookConfigured: boolean;
  webhookSecret?: string;
  createdAt: string;
  updatedAt: string;
}

export interface ITimelineEvent {
  eventType: string; // 'opened' | 'reviewer_requested' | 'review_submitted' | 'changes_requested' | 'approved' | 'closed' | 'merged'
  timestamp: string;
  actor: {
    githubUsername: string;
    avatarUrl?: string;
  };
  details?: Record<string, unknown>;
}

export interface IPullRequest {
  id: string;
  githubPrId: number;
  repositoryId: string;
  repository?: {
    id: string;
    name: string;
    fullName: string;
  };
  number: number;
  title: string;
  url: string;
  author: {
    githubUsername: string;
    avatarUrl?: string;
  };
  state: PRState;
  draft: boolean;
  openedAt: string;
  updatedAt: string;
  firstReviewAt?: string | null;
  closedAt?: string | null;
  mergedAt?: string | null;
  reviewers: string[];
  reviewStatus: ReviewStatus;
  isStale: boolean;
  timeToFirstReviewMinutes?: number | null;
  timeline?: ITimelineEvent[];
  latestReviewState?: 'APPROVED' | 'CHANGES_REQUESTED' | 'COMMENTED' | null;
}

export interface IWebhookEvent {
  id: string;
  deliveryId: string;
  eventType: string;
  action?: string;
  repositoryId?: string;
  githubRepositoryId?: number;
  receivedAt: string;
  payload: Record<string, unknown>;
  processedAt?: string;
  processingStatus: WebhookProcessingStatus;
  errorMessage?: string;
}

// ==========================================
// Dashboard KPIs & Metrics
// ==========================================
export interface IDashboardKpi {
  openPrs: number;
  stalePrs: number;
  avgFirstReviewHours: number;
  medianFirstReviewHours: number;
  prsReviewedInPeriod: number;
  stalePercentage: number;
}

export interface IReviewSpeedMetrics {
  avgFirstReviewHours: number;
  medianFirstReviewHours: number;
  p90FirstReviewHours: number;
  totalPrsEvaluated: number;
}

export interface IPrHealthMetrics {
  totalPrs: number;
  openPrs: number;
  stalePrs: number;
  mergedPrs: number;
  closedPrs: number;
}

export interface IReviewerWorkload {
  reviewer: string;
  avatarUrl?: string;
  reviewsCompleted: number;
  pendingReviews: number;
  avgReviewTimeHours: number;
  oldestPendingHours: number | null;
  percentageOfTeamReviews: number;
}

export interface ITimeSeriesDataPoint {
  date: string;
  avgFirstReviewHours: number;
  openedCount: number;
  mergedCount: number;
  staleCount: number;
}

// ==========================================
// Zod Schemas for Validation
// ==========================================
export const CreateOrgSchema = z.object({
  name: z.string().min(2).max(100),
  staleThresholdHours: z.number().int().min(1).max(720).optional().default(48),
});

export const UpdateOrgSettingsSchema = z.object({
  staleThresholdHours: z.number().int().min(1).max(720),
  name: z.string().min(2).max(100).optional(),
});

export const ConnectRepositorySchema = z.object({
  organizationId: z.string().min(1),
  githubRepositoryId: z.number().int().positive(),
  name: z.string().min(1),
  fullName: z.string().min(1),
  owner: z.string().min(1),
  webhookSecret: z.string().min(8).max(128).optional(),
});

export const DateRangeQuerySchema = z.object({
  days: z.coerce.number().int().min(1).max(365).optional().default(30),
  startDate: z.string().datetime().optional(),
  endDate: z.string().datetime().optional(),
  repositoryId: z.string().optional(),
});

export const PrQuerySchema = z.object({
  repositoryId: z.string().optional(),
  state: z.enum(['open', 'closed', 'merged', 'all']).optional().default('open'),
  isStale: z.enum(['true', 'false']).optional(),
  page: z.coerce.number().int().min(1).optional().default(1),
  limit: z.coerce.number().int().min(1).max(100).optional().default(25),
  search: z.string().optional(),
});
