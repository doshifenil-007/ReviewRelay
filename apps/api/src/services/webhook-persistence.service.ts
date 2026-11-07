import { WebhookEvent, IWebhookEventDocument } from '../models/WebhookEvent';
import { WebhookProcessingStatus } from '@reviewrelay/shared';
import { Types } from 'mongoose';

export class WebhookPersistenceService {
  /**
   * Persists incoming raw webhook event prior to business processing.
   */
  public static async recordRawEvent(params: {
    deliveryId: string;
    eventType: string;
    action?: string;
    repositoryId?: Types.ObjectId;
    githubRepositoryId?: number;
    payload: Record<string, unknown>;
  }): Promise<IWebhookEventDocument> {
    try {
      const event = await WebhookEvent.create({
        deliveryId: params.deliveryId,
        eventType: params.eventType,
        action: params.action,
        repositoryId: params.repositoryId,
        githubRepositoryId: params.githubRepositoryId,
        receivedAt: new Date(),
        payload: params.payload,
        processingStatus: WebhookProcessingStatus.PENDING,
      });
      return event;
    } catch (err: any) {
      // If deliveryId unique constraint hit, find existing
      if (err.code === 11000) {
        const existing = await WebhookEvent.findOne({ deliveryId: params.deliveryId });
        if (existing) return existing;
      }
      throw err;
    }
  }

  /**
   * Updates the processing status and error metadata of a webhook event.
   */
  public static async updateProcessingStatus(
    deliveryId: string,
    status: WebhookProcessingStatus,
    errorMessage?: string
  ): Promise<void> {
    await WebhookEvent.updateOne(
      { deliveryId },
      {
        $set: {
          processingStatus: status,
          processedAt: new Date(),
          errorMessage: errorMessage || null,
        },
      }
    ).exec();
  }
}
