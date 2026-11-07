import { Request, Response, NextFunction } from 'express';
import mongoose from 'mongoose';
import { SignatureService } from '../services/signature.service';
import { IdempotencyService } from '../services/idempotency.service';
import { WebhookPersistenceService } from '../services/webhook-persistence.service';
import { PrStateService } from '../services/pr-state.service';
import { Repository } from '../models/Repository';
import { config } from '../config/env';
import { WebhookProcessingStatus } from '@reviewrelay/shared';

export class WebhookController {
  public static async handleGitHubWebhook(
    req: Request,
    res: Response,
    next: NextFunction
  ): Promise<void> {
    try {
      const signature = req.headers['x-hub-signature-256'] as string | undefined;
      const deliveryId = req.headers['x-github-delivery'] as string | undefined;
      const eventType = req.headers['x-github-event'] as string | undefined;

      if (!deliveryId || !eventType) {
        res.status(400).json({ error: 'Missing required GitHub headers' });
        return;
      }

      // 1. Raw body verification
      const rawBody = req.rawBody;
      if (!rawBody) {
        res.status(400).json({ error: 'Raw payload missing for signature verification' });
        return;
      }

      // Parse payload to identify repository
      let payload: any;
      try {
        payload = JSON.parse(rawBody.toString('utf8'));
      } catch (err) {
        res.status(400).json({ error: 'Invalid JSON payload format' });
        return;
      }

      // 2. Resolve webhook secret
      // Check global config secret first
      let isValidSignature = SignatureService.verifySignature(
        rawBody,
        signature,
        config.github.webhookSecret
      );

      // If global secret doesn't match and DB is available, check repo-specific secret
      if (!isValidSignature && mongoose.connection.readyState === 1) {
        const repoGithubId = payload.repository?.id;
        const repoFullName = payload.repository?.full_name;

        if (repoGithubId || repoFullName) {
          try {
            const repoDoc = await Repository.findOne({
              $or: [
                { githubRepositoryId: repoGithubId },
                { fullName: repoFullName },
              ],
            });
            if (repoDoc?.webhookSecret) {
              isValidSignature = SignatureService.verifySignature(
                rawBody,
                signature,
                repoDoc.webhookSecret
              );
            }
          } catch (dbErr) {
            console.warn('[Webhook] Repository lookup skipped:', dbErr);
          }
        }
      }

      // 3. Reject invalid signatures
      if (!isValidSignature) {
        res.status(401).json({ error: 'Webhook signature verification failed' });
        return;
      }

      // 4. Redis Idempotency Check
      const isUniqueDelivery = await IdempotencyService.registerDelivery(deliveryId);
      if (!isUniqueDelivery) {
        console.log(`[Webhook] Duplicate delivery received and deduplicated: ${deliveryId}`);
        res.status(200).json({
          message: 'Delivery already processed',
          deliveryId,
          duplicate: true,
        });
        return;
      }

      // 5. Store raw webhook event for auditing (if database is connected)
      if (mongoose.connection.readyState === 1) {
        await WebhookPersistenceService.recordRawEvent({
          deliveryId,
          eventType,
          action: payload.action,
          githubRepositoryId: payload.repository?.id,
          payload,
        });
      }

      // 6. Process event
      try {
        let prUpdated = false;
        if (mongoose.connection.readyState === 1) {
          const result = await PrStateService.processWebhookEvent(
            eventType,
            payload.action,
            payload
          );
          prUpdated = Boolean(result.pr);

          await WebhookPersistenceService.updateProcessingStatus(
            deliveryId,
            WebhookProcessingStatus.PROCESSED
          );
        }

        res.status(200).json({
          status: 'ok',
          deliveryId,
          processed: true,
          prUpdated,
        });
      } catch (processingErr: any) {
        console.error(`[Webhook] Processing error for delivery ${deliveryId}:`, processingErr);
        if (mongoose.connection.readyState === 1) {
          await WebhookPersistenceService.updateProcessingStatus(
            deliveryId,
            WebhookProcessingStatus.FAILED,
            processingErr.message
          );
        }
        res.status(500).json({
          error: 'Event processing error, event saved for review',
          deliveryId,
        });
      }
    } catch (err) {
      next(err);
    }
  }
}
