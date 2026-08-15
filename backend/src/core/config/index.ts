import dotenv from 'dotenv';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const backendRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const nodeEnv = process.env.NODE_ENV || 'development';
const envFiles = [
  path.join(backendRoot, '.env'),
  path.join(backendRoot, `.env.${nodeEnv}`),
];
if (nodeEnv !== 'production') {
  envFiles.push(path.join(backendRoot, '.env.development'));
}

for (const envFile of envFiles) {
  if (fs.existsSync(envFile)) {
    dotenv.config({ path: envFile, override: false });
  }
}

const firstCorsOrigin = (process.env.CORS_ORIGINS || 'http://localhost:3000')
  .split(',')
  .map(origin => origin.trim())
  .filter(Boolean)[0] || 'http://localhost:3000';

export const config = {
  app: {
    env: process.env.NODE_ENV || 'development',
    host: process.env.HOST || (process.env.NODE_ENV === 'production' ? '127.0.0.1' : '0.0.0.0'),
    port: parseInt(process.env.PORT || '5000', 10),
    jwtSecret: process.env.JWT_SECRET || 'dev_jwt_access_secret_key_brosai_2026',
    jwtRefreshSecret: process.env.JWT_REFRESH_SECRET || 'dev_jwt_refresh_secret_key_brosai_2026',
    jwtAccessExpiration: process.env.JWT_ACCESS_EXPIRATION || '15m',
    jwtRefreshExpiration: process.env.JWT_REFRESH_EXPIRATION || '7d',
    defaultUserRole: (process.env.DEFAULT_USER_ROLE as 'admin' | 'user') || 'user',
    frontendUrl: process.env.FRONTEND_URL || firstCorsOrigin,
    tokenEncryptionKey: process.env.TOKEN_ENCRYPTION_KEY || '',
  },

  db: {
    uri: process.env.DB_URI || `mongodb://127.0.0.1:27017/${process.env.DB_NAME || 'brosai'}`,
    host: process.env.DB_HOST || 'localhost',
    port: parseInt(process.env.DB_PORT || '27017', 10),
    name: process.env.DB_NAME || 'brosai',
  },
  cors: {
    origins: (process.env.CORS_ORIGINS || 'http://localhost:3000,http://localhost:5173')
      .split(',')
      .map(origin => origin.trim()),
  },
  firebase: {
    projectId: process.env.FIREBASE_PROJECT_ID || 'brosai-dev-project',
    clientEmail: process.env.FIREBASE_CLIENT_EMAIL || 'dev@brosai.iam.gserviceaccount.com',
    privateKey: (process.env.FIREBASE_PRIVATE_KEY || '').replace(/\\n/g, '\n'),
  },
  ai: {
    apiKey: process.env.AI_API_KEY || '',
    openaiApiKey: process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'gpt-4o',
    fineTunedModel: process.env.OPENAI_FINE_TUNED_MODEL || '',
    embeddingModel: process.env.EMBEDDING_MODEL || 'text-embedding-3-small',
    firecrawlApiKey: process.env.FIRECRAWL_API_KEY || '',
  },
  social: {
    redirectUri: process.env.SOCIAL_OAUTH_REDIRECT_URI || `${firstCorsOrigin}/api/social/callback`,
    twitter: {
      clientId: process.env.TWITTER_CLIENT_ID || '',
      clientSecret: process.env.TWITTER_CLIENT_SECRET || '',
      redirectUri: process.env.TWITTER_REDIRECT_URI || '',
    },
    linkedin: {
      clientId: process.env.LINKEDIN_CLIENT_ID || '',
      clientSecret: process.env.LINKEDIN_CLIENT_SECRET || '',
      redirectUri: process.env.LINKEDIN_REDIRECT_URI || '',
    },
    instagram: {
      appId: process.env.INSTAGRAM_APP_ID || '',
      appSecret: process.env.INSTAGRAM_APP_SECRET || '',
      clientId: process.env.INSTAGRAM_CLIENT_ID || '',
      clientSecret: process.env.INSTAGRAM_CLIENT_SECRET || '',
      redirectUri: process.env.INSTAGRAM_REDIRECT_URI || '',
      oauthMode: (process.env.INSTAGRAM_OAUTH_MODE || 'instagram').toLowerCase(),
    },
    facebook: {
      appId: process.env.FACEBOOK_APP_ID || '',
      appSecret: process.env.FACEBOOK_APP_SECRET || '',
      redirectUri: process.env.FACEBOOK_REDIRECT_URI || '',
    },
    threads: {
      appId: process.env.THREADS_APP_ID || process.env.INSTAGRAM_APP_ID || '',
      appSecret: process.env.THREADS_APP_SECRET || process.env.INSTAGRAM_APP_SECRET || '',
      redirectUri: process.env.THREADS_REDIRECT_URI || '',
    },
    tiktok: {
      clientKey: process.env.TIKTOK_CLIENT_KEY || '',
      clientSecret: process.env.TIKTOK_CLIENT_SECRET || '',
      redirectUri: process.env.TIKTOK_REDIRECT_URI || '',
    },
    youtube: {
      clientId: process.env.YOUTUBE_CLIENT_ID || '',
      clientSecret: process.env.YOUTUBE_CLIENT_SECRET || '',
      redirectUri: process.env.YOUTUBE_REDIRECT_URI || '',
    }
  }
} as const;

export type Config = typeof config;
