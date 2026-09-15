import { Platform } from 'react-native';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { registerPushToken, unregisterPushToken } from './endpoints';

let cachedToken = '';
let Notifications: typeof import('expo-notifications') | null = null;

/** Expo Go (SDK 53+) cannot use remote push on Android — it throws at runtime. */
export function isExpoGo() {
  return Constants.appOwnership === 'expo' || Constants.executionEnvironment === 'storeClient';
}

export function pushSupported() {
  return !isExpoGo() && Device.isDevice;
}

async function notifications() {
  if (isExpoGo()) return null;
  if (!Notifications) {
    Notifications = await import('expo-notifications');
    Notifications.setNotificationHandler({
      handleNotification: async () => ({
        shouldShowAlert: true,
        shouldPlaySound: true,
        shouldSetBadge: true,
        shouldShowBanner: true,
        shouldShowList: true,
      }),
    });
  }
  return Notifications;
}

function projectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ||
    Constants.easConfig?.projectId ||
    process.env.EXPO_PUBLIC_EAS_PROJECT_ID ||
    undefined
  );
}

export async function ensurePushPermissions(): Promise<boolean> {
  const NotificationsMod = await notifications();
  if (!NotificationsMod || !Device.isDevice) return false;
  const current = await NotificationsMod.getPermissionsAsync();
  if (current.status === 'granted') return true;
  const asked = await NotificationsMod.requestPermissionsAsync();
  return asked.status === 'granted';
}

export async function getExpoPushToken(): Promise<string | null> {
  if (!pushSupported()) return null;
  const NotificationsMod = await notifications();
  if (!NotificationsMod) return null;

  const granted = await ensurePushPermissions();
  if (!granted) return null;

  if (Platform.OS === 'android') {
    await NotificationsMod.setNotificationChannelAsync('default', {
      name: 'default',
      importance: NotificationsMod.AndroidImportance.MAX,
    });
  }

  try {
    const id = projectId();
    const token = id
      ? await NotificationsMod.getExpoPushTokenAsync({ projectId: id })
      : await NotificationsMod.getExpoPushTokenAsync();
    cachedToken = token.data;
    return cachedToken;
  } catch {
    return null;
  }
}

export async function syncPushTokenWithBackend() {
  if (!pushSupported()) return null;
  const token = await getExpoPushToken();
  if (!token) return null;
  await registerPushToken(token, Platform.OS);
  return token;
}

export async function clearPushTokenFromBackend() {
  if (!cachedToken) return;
  try {
    await unregisterPushToken(cachedToken);
  } catch {
    /* ignore logout push errors */
  }
  cachedToken = '';
}

export function getCachedPushToken() {
  return cachedToken;
}

export async function addNotificationResponseListener(
  listener: (response: import('expo-notifications').NotificationResponse) => void,
) {
  const NotificationsMod = await notifications();
  if (!NotificationsMod) return { remove: () => {} };
  return NotificationsMod.addNotificationResponseReceivedListener(listener);
}
