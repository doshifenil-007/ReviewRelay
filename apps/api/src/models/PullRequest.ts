import mongoose, { Schema, Document, Types } from 'mongoose';
import { PRState, ReviewStatus, ITimelineEvent } from '@reviewrelay/shared';

export interface IPullRequestDocument extends Document {
  githubPrId: number;
  repositoryId: Types.ObjectId;
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
  createdAt: Date;
}

const TimelineEventSchema = new Schema(
  {
    eventType: { type: String, required: true },
    timestamp: { type: String, required: true },
    actor: {
      githubUsername: { type: String, required: true },
      avatarUrl: { type: String },
    },
    details: { type: Schema.Types.Mixed },
  },
  { _id: false }
);

const PullRequestSchema = new Schema<IPullRequestDocument>(
  {
    githubPrId: { type: Number, required: true, index: true },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', required: true, index: true },
    number: { type: Number, required: true, index: true },
    title: { type: String, required: true, trim: true },
    url: { type: String, required: true },
    author: {
      githubUsername: { type: String, required: true },
      avatarUrl: { type: String },
    },
    state: { type: String, enum: Object.values(PRState), default: PRState.OPEN, required: true },
    draft: { type: Boolean, default: false },
    openedAt: { type: Date, required: true },
    updatedAt: { type: Date, required: true },
    firstReviewAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
    mergedAt: { type: Date, default: null },
    reviewers: [{ type: String }],
    reviewStatus: {
      type: String,
      enum: Object.values(ReviewStatus),
      default: ReviewStatus.WAITING,
      required: true,
    },
    isStale: { type: Boolean, default: false, index: true },
    timeToFirstReviewMinutes: { type: Number, default: null },
    timeline: [TimelineEventSchema],
    latestReviewState: {
      type: String,
      enum: ['APPROVED', 'CHANGES_REQUESTED', 'COMMENTED', null],
      default: null,
    },
  },
  { timestamps: true }
);

PullRequestSchema.index({ repositoryId: 1, number: 1 }, { unique: true });
PullRequestSchema.index({ repositoryId: 1, state: 1, isStale: 1 });

export const PullRequest = mongoose.model<IPullRequestDocument>('PullRequest', PullRequestSchema);
