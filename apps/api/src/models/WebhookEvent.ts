import mongoose, { Schema, Document, Types } from 'mongoose';
import { WebhookProcessingStatus } from '@reviewrelay/shared';

export interface IWebhookEventDocument extends Document {
  deliveryId: string;
  eventType: string;
  action?: string;
  repositoryId?: Types.ObjectId;
  githubRepositoryId?: number;
  receivedAt: Date;
  payload: Record<string, unknown>;
  processedAt?: Date;
  processingStatus: WebhookProcessingStatus;
  errorMessage?: string;
}

const WebhookEventSchema = new Schema<IWebhookEventDocument>(
  {
    deliveryId: { type: String, required: true, unique: true, index: true },
    eventType: { type: String, required: true, index: true },
    action: { type: String },
    repositoryId: { type: Schema.Types.ObjectId, ref: 'Repository', index: true },
    githubRepositoryId: { type: Number, index: true },
    receivedAt: { type: Date, default: Date.now },
    payload: { type: Schema.Types.Mixed, required: true },
    processedAt: { type: Date },
    processingStatus: {
      type: String,
      enum: Object.values(WebhookProcessingStatus),
      default: WebhookProcessingStatus.PENDING,
      required: true,
      index: true,
    },
    errorMessage: { type: String },
  },
  { timestamps: true }
);

export const WebhookEvent = mongoose.model<IWebhookEventDocument>('WebhookEvent', WebhookEventSchema);
