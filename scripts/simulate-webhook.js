#!/usr/bin/env node
const crypto = require('crypto');
const http = require('http');

/**
 * ReviewRelay Webhook Simulator
 * Dispatches real GitHub webhook events signed with HMAC-SHA256 to the local server
 */
const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET || 'reviewrelay-webhook-secret-token';
const TARGET_PORT = process.env.PORT || 4000;

function sendEvent(eventType, payload) {
  const deliveryId = crypto.randomUUID();
  const rawBody = JSON.stringify(payload);
  const signature = 'sha256=' + crypto.createHmac('sha256', WEBHOOK_SECRET).update(rawBody).digest('hex');

  const options = {
    hostname: 'localhost',
    port: TARGET_PORT,
    path: '/api/webhooks/github',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(rawBody),
      'X-GitHub-Delivery': deliveryId,
      'X-GitHub-Event': eventType,
      'X-Hub-Signature-256': signature,
      'User-Agent': 'GitHub-Hookshot/test',
    },
  };

  const req = http.request(options, (res) => {
    let data = '';
    res.on('data', (chunk) => (data += chunk));
    res.on('end', () => {
      console.log(`[Simulator] ${eventType}.${payload.action || 'event'} -> Status: ${res.statusCode}`);
      console.log(`[Simulator] Response:`, data);
    });
  });

  req.on('error', (err) => {
    console.error(`[Simulator] Failed to send webhook:`, err.message);
  });

  req.write(rawBody);
  req.end();
}

const action = process.argv[2] || 'pr-opened';

console.log(`\n========================================`);
console.log(` ReviewRelay GitHub Webhook Simulator`);
console.log(` Action: ${action}`);
console.log(` Webhook Secret: configured (${WEBHOOK_SECRET.length} characters)`);
console.log(` Target: http://localhost:${TARGET_PORT}/api/webhooks/github`);
console.log(`========================================\n`);

switch (action) {
  case 'pr-opened':
    sendEvent('pull_request', {
      action: 'opened',
      repository: { id: 1001, full_name: 'acme/core-engine', name: 'core-engine' },
      pull_request: {
        id: 501,
        number: 142,
        title: 'Add payment retry logic with exponential backoff',
        html_url: 'https://github.com/acme/core-engine/pull/142',
        draft: false,
        created_at: new Date(Date.now() - 51 * 3600 * 1000).toISOString(), // 51h ago (Stale!)
        user: { login: 'rahul', avatar_url: 'https://avatars.githubusercontent.com/u/101?v=4' },
      },
      sender: { login: 'rahul', avatar_url: 'https://avatars.githubusercontent.com/u/101?v=4' },
    });
    break;

  case 'pr-stale-2':
    sendEvent('pull_request', {
      action: 'opened',
      repository: { id: 1001, full_name: 'acme/core-engine', name: 'core-engine' },
      pull_request: {
        id: 502,
        number: 137,
        title: 'Database migration for partitioned audit logs',
        html_url: 'https://github.com/acme/core-engine/pull/137',
        draft: false,
        created_at: new Date(Date.now() - 74 * 3600 * 1000).toISOString(), // 74h ago (Stale!)
        user: { login: 'amit', avatar_url: 'https://avatars.githubusercontent.com/u/102?v=4' },
      },
      sender: { login: 'amit', avatar_url: 'https://avatars.githubusercontent.com/u/102?v=4' },
    });
    break;

  case 'pr-fresh':
    sendEvent('pull_request', {
      action: 'opened',
      repository: { id: 1001, full_name: 'acme/core-engine', name: 'core-engine' },
      pull_request: {
        id: 503,
        number: 155,
        title: 'Optimize Redis connection pooling and timeout handling',
        html_url: 'https://github.com/acme/core-engine/pull/155',
        draft: false,
        created_at: new Date(Date.now() - 4 * 3600 * 1000).toISOString(), // 4h ago (Healthy)
        user: { login: 'neha', avatar_url: 'https://avatars.githubusercontent.com/u/103?v=4' },
      },
      sender: { login: 'neha', avatar_url: 'https://avatars.githubusercontent.com/u/103?v=4' },
    });
    break;

  case 'review-requested':
    sendEvent('pull_request', {
      action: 'review_requested',
      repository: { id: 1001, full_name: 'acme/core-engine', name: 'core-engine' },
      pull_request: {
        id: 501,
        number: 142,
        title: 'Add payment retry logic with exponential backoff',
        html_url: 'https://github.com/acme/core-engine/pull/142',
        draft: false,
        created_at: new Date(Date.now() - 51 * 3600 * 1000).toISOString(),
        user: { login: 'rahul', avatar_url: 'https://avatars.githubusercontent.com/u/101?v=4' },
      },
      requested_reviewer: { login: 'priya' },
      sender: { login: 'rahul' },
    });
    break;

  case 'review-submitted':
    sendEvent('pull_request_review', {
      action: 'submitted',
      repository: { id: 1001, full_name: 'acme/core-engine', name: 'core-engine' },
      pull_request: {
        id: 501,
        number: 142,
        title: 'Add payment retry logic with exponential backoff',
        html_url: 'https://github.com/acme/core-engine/pull/142',
        draft: false,
        created_at: new Date(Date.now() - 51 * 3600 * 1000).toISOString(),
        user: { login: 'rahul' },
      },
      review: {
        id: 9001,
        state: 'APPROVED',
        submitted_at: new Date().toISOString(),
        user: { login: 'priya', avatar_url: 'https://avatars.githubusercontent.com/u/104?v=4' },
      },
      sender: { login: 'priya' },
    });
    break;

  default:
    console.log(`Unknown action "${action}". Available actions:`);
    console.log(`  pr-opened, pr-stale-2, pr-fresh, review-requested, review-submitted`);
}
