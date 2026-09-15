import { Platform } from 'react-native';

const DEFAULT_PROD = 'https://api.vamvamvamai.com';

/** Absolute API root without trailing slash. Override with EXPO_PUBLIC_API_URL. */
export const API_URL = String(process.env.EXPO_PUBLIC_API_URL || DEFAULT_PROD).replace(/\/$/, '');

/** Google OAuth web client ID (same as the web app). Override with EXPO_PUBLIC_GOOGLE_CLIENT_ID. */
export const GOOGLE_WEB_CLIENT_ID = String(
  process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
    '107926694606-9obo130a9mhfcfv2psn3em3b9050a9cd.apps.googleusercontent.com',
).trim();

export const PLATFORM = Platform.OS;
