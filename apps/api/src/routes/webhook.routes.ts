import { Router } from 'express';
import { WebhookController } from '../controllers/webhook.controller';
import { webhookRawBodyParser } from '../middleware/raw-body.middleware';

const router = Router();

// Raw body parser applied exclusively to GitHub Webhooks for precise HMAC validation
router.post(
  '/github',
  webhookRawBodyParser,
  WebhookController.handleGitHubWebhook
);

export const webhookRouter = router;
