import dotenv from 'dotenv';
import path from 'path';

// Load from root .env or local
dotenv.config({ path: path.resolve(__dirname, '../../../../.env') });
dotenv.config();

// APP_ENV lets serverless hosts enforce production security checks for preview
// and production deployments without changing Node's build/runtime NODE_ENV.
const env = process.env.APP_ENV || process.env.NODE_ENV || 'development';
const configuredMongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/reviewrelay';
const configuredRedisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
const corsOrigin = process.env.CORS_ORIGIN || 'http://localhost:5173';
const githubCallbackUrl = process.env.GITHUB_CALLBACK_URL || 'http://localhost:4000/api/auth/github/callback';

if (env === 'production') {
  let mongoUrl: URL;
  let redisUrl: URL;
  let corsUrl: URL;
  let callbackUrl: URL;

  try {
    mongoUrl = new URL(configuredMongoUri);
    redisUrl = new URL(configuredRedisUrl);
    corsUrl = new URL(corsOrigin);
    callbackUrl = new URL(githubCallbackUrl);
  } catch {
    throw new Error('Production database, cache, CORS, and callback URLs must be valid URLs');
  }

  if (!['mongodb:', 'mongodb+srv:'].includes(mongoUrl.protocol) || !mongoUrl.username || !mongoUrl.password) {
    throw new Error('Production MONGODB_URI must point to an authenticated MongoDB database you control');
  }
  if (mongoUrl.protocol === 'mongodb:' && mongoUrl.searchParams.get('tls') !== 'true' && mongoUrl.searchParams.get('ssl') !== 'true') {
    throw new Error('Production MongoDB connections must enable TLS (use mongodb+srv or add tls=true)');
  }
  if (mongoUrl.searchParams.get('tls') === 'false' || mongoUrl.searchParams.get('ssl') === 'false') {
    throw new Error('TLS cannot be disabled for the production MongoDB connection');
  }
  if (redisUrl.protocol !== 'rediss:' || !redisUrl.password) {
    throw new Error('Production REDIS_URL must use TLS (rediss://) and a password');
  }
  if (corsUrl.protocol !== 'https:' || callbackUrl.protocol !== 'https:') {
    throw new Error('Production CORS_ORIGIN and GITHUB_CALLBACK_URL must use HTTPS');
  }
}

const requiredProductionSecret = (name: string): string => {
  const value = process.env[name];
  if (env === 'production' && (!value || value.length < 32)) {
    throw new Error(`${name} must be set to a secret of at least 32 characters in production`);
  }
  return value || '';
};

const jwtAccessSecret = requiredProductionSecret('JWT_ACCESS_SECRET');
const jwtRefreshSecret = requiredProductionSecret('JWT_REFRESH_SECRET');
const webhookSecret = requiredProductionSecret('GITHUB_WEBHOOK_SECRET');
const githubTokenEncryptionKey = process.env.GITHUB_TOKEN_ENCRYPTION_KEY || '';

if (env === 'production' && (!process.env.GITHUB_CLIENT_ID || !process.env.GITHUB_CLIENT_SECRET)) {
  throw new Error('GITHUB_CLIENT_ID and GITHUB_CLIENT_SECRET must be set to your GitHub OAuth app credentials in production');
}

if (env === 'production' && githubTokenEncryptionKey.length < 32) {
  throw new Error('GITHUB_TOKEN_ENCRYPTION_KEY must be set to a secret of at least 32 characters in production');
}

export const config = {
  env,
  port: parseInt(process.env.PORT || '4000', 10),
  corsOrigin,

  mongodb: {
    uri: configuredMongoUri,
  },

  redis: {
    url: configuredRedisUrl,
  },

  jwt: {
    accessSecret: jwtAccessSecret || 'dev-access-secret-32-chars-long-reviewrelay-test',
    refreshSecret: jwtRefreshSecret || 'dev-refresh-secret-32-chars-long-reviewrelay-test',
    accessExpiresIn: process.env.JWT_ACCESS_EXPIRY || '15m',
    refreshExpiresInDays: parseInt(process.env.JWT_REFRESH_EXPIRY_DAYS || '7', 10),
  },

  github: {
    clientId: process.env.GITHUB_CLIENT_ID || '',
    clientSecret: process.env.GITHUB_CLIENT_SECRET || '',
    callbackUrl: githubCallbackUrl,
    webhookSecret: webhookSecret || 'reviewrelay-webhook-secret-token',
    tokenEncryptionKey:
      githubTokenEncryptionKey ||
      process.env.JWT_REFRESH_SECRET ||
      'dev-refresh-secret-32-chars-long-reviewrelay-test',
  },

  rateLimit: {
    maxRequests: parseInt(process.env.RATE_LIMIT_MAX_REQUESTS || '100', 10),
    windowSeconds: parseInt(process.env.RATE_LIMIT_WINDOW_SECONDS || '60', 10),
  },
};
