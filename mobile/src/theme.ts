import { Easing } from 'react-native';

export const ACCENT = '#7dd3fc';
export const BG = '#000000';
export const CARD = '#1c1c1e';
export const BAR = '#141414';
export const MUTED = '#8e8e93';
export const SITE = 'https://vamvamvamai.com';

export const HERO_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260620_185230_f7f71ef4-6655-469f-b9c6-efbdc1f7684a.mp4';

export const HOME_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260402_054547_9875cfc5-155a-4229-8ec8-b7ba7125cbf8.mp4';

export const CHAT_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260808_112712_da9d53df-6d27-4b12-bdf6-aa9dc2622bdf.mp4';

export const JOBS_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260508_215831_c6a8989c-d716-4d8d-8745-e972a2eec711.mp4';

export const BRAND_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_065045_c44942da-53c6-4804-b734-f9e07fc22e08.mp4';

export const CRON_VIDEO =
  'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260328_115001_bcdaa3b4-03de-47e7-ad63-ae3e392c32d4.mp4';

export const SEARCH_VIDEO =
  'https://storage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4';

export const expoOut = Easing.bezier(0.16, 1, 0.3, 1);

export type TabId =
  | 'home'
  | 'brand'
  | 'brandCreate'
  | 'agents'
  | 'agentCreate'
  | 'jobs'
  | 'chat'
  | 'profile'
  | 'jobStart'
  | 'search';

export const AGENTS_VIDEO = SEARCH_VIDEO;

export const SUPPORT_EMAIL = 'fury25423@gmail.com';
export const SUPPORT_URL = 'mailto:fury25423@gmail.com?subject=Vamvamvam%20AI%20Support';

export const POSTING_FREQUENCIES = [
  '1 post / day',
  '2 posts / day',
  '3 posts / day',
  '5 posts / day',
  'Every 6 hours',
  'Hourly',
] as const;
