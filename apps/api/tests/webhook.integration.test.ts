import { describe, it, expect, beforeAll } from 'vitest';
import request from 'supertest';
import { createApp } from '../src/app';
import { SignatureService } from '../src/services/signature.service';
import { config } from '../src/config/env';
import crypto from 'crypto';

describe('Webhook API Endpoint (/api/webhooks/github)', () => {
  const app = createApp();
  const secret = config.github.webhookSecret;

  it('rejects requests with missing signature headers', async () => {
    const res = await request(app)
      .post('/api/webhooks/github')
      .set('X-GitHub-Delivery', crypto.randomUUID())
      .set('X-GitHub-Event', 'pull_request')
      .set('Content-Type', 'application/json')
      .send(JSON.stringify({ action: 'opened' }));

    expect(res.status).toBe(401);
    expect(res.body.error).toContain('signature');
  });

  it('rejects requests with forged/invalid HMAC signature', async () => {
    const payload = JSON.stringify({ action: 'opened', repository: { id: 88888 } });
    const forgedSignature = 'sha256=1111111111111111111111111111111111111111111111111111111111111111';

    const res = await request(app)
      .post('/api/webhooks/github')
      .set('X-GitHub-Delivery', crypto.randomUUID())
      .set('X-GitHub-Event', 'pull_request')
      .set('X-Hub-Signature-256', forgedSignature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(401);
  });

  it('accepts authentic webhook request and processes successfully', async () => {
    const deliveryId = crypto.randomUUID();
    const payload = JSON.stringify({
      action: 'opened',
      repository: { id: 99999, full_name: 'acme/test-repo' },
      pull_request: {
        id: 7771,
        number: 10,
        title: 'Integration Test PR',
        html_url: 'https://github.com/acme/test-repo/pull/10',
        user: { login: 'octocat' },
        created_at: new Date().toISOString(),
      },
    });

    const signature = SignatureService.signPayload(payload, secret);

    const res = await request(app)
      .post('/api/webhooks/github')
      .set('X-GitHub-Delivery', deliveryId)
      .set('X-GitHub-Event', 'pull_request')
      .set('X-Hub-Signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('ok');
    expect(res.body.deliveryId).toBe(deliveryId);

    // Second request with same delivery ID -> deduplicated!
    const duplicateRes = await request(app)
      .post('/api/webhooks/github')
      .set('X-GitHub-Delivery', deliveryId)
      .set('X-GitHub-Event', 'pull_request')
      .set('X-Hub-Signature-256', signature)
      .set('Content-Type', 'application/json')
      .send(payload);

    expect(duplicateRes.status).toBe(200);
    expect(duplicateRes.body.duplicate).toBe(true);
  });
});
