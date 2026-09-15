import { logger } from '../../core/logger/index.js';
import { UserModel } from '../../api/auth/models/userModel.js';

type PushPayload = {
  title: string;
  body: string;
  data?: Record<string, string>;
};

type LeanPushUser = {
  notificationSettings?: {
    inApp?: boolean;
    push?: boolean;
  };
  pushTokens?: Array<{ token?: string; platform?: string }>;
  name?: string;
};

type ExpoTicket = {
  status?: string;
  message?: string;
  details?: { error?: string };
};

function isExpoPushToken(token: string) {
  return /^Expo(nent)?PushToken\[.+\]$/.test(token);
}

export async function notifyUser(userId: string, payload: PushPayload): Promise<void> {
  try {
    const user = (await UserModel.findById(userId)
      .select('pushTokens notificationSettings name')
      .lean()) as LeanPushUser | null;
    if (!user) return;
    if (user.notificationSettings && user.notificationSettings.inApp === false) return;

    const tokens = Array.isArray(user.pushTokens)
      ? user.pushTokens.map((item) => String(item?.token || '').trim()).filter(Boolean)
      : [];
    if (!tokens.length) return;

    const expoTokens = tokens.filter(isExpoPushToken);
    if (!expoTokens.length) {
      logger.info(`[Push] No Expo tokens for user ${userId}`);
      return;
    }

    const messages = expoTokens.map((to: string) => ({
      to,
      sound: 'default' as const,
      title: payload.title,
      body: payload.body,
      data: payload.data || {},
    }));

    const res = await fetch('https://exp.host/--/api/v2/push/send', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Accept-Encoding': 'gzip, deflate',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(messages),
    });

    if (!res.ok) {
      const text = await res.text().catch(() => '');
      logger.warn(`[Push] Expo send failed ${res.status}: ${text.slice(0, 200)}`);
      return;
    }

    const json = (await res.json().catch(() => null)) as { data?: ExpoTicket[] } | null;
    const tickets: ExpoTicket[] = Array.isArray(json?.data) ? json.data : [];
    const bad = tickets
      .map((ticket: ExpoTicket, index: number) => ({ ticket, token: expoTokens[index] }))
      .filter(({ ticket }: { ticket: ExpoTicket }) => ticket?.status === 'error');

    if (bad.length) {
      const drop = bad
        .filter(({ ticket }: { ticket: ExpoTicket }) =>
          /DeviceNotRegistered|InvalidCredentials/i.test(String(ticket?.details?.error || ticket?.message || '')),
        )
        .map(({ token }: { token: string }) => token);
      if (drop.length) {
        await UserModel.updateOne(
          { _id: userId },
          { $pull: { pushTokens: { token: { $in: drop } } } },
        );
      }
      logger.warn(`[Push] ${bad.length} ticket error(s) for user ${userId}`);
    } else {
      logger.info(`[Push] Sent to ${expoTokens.length} device(s) for user ${userId}`);
    }
  } catch (err: any) {
    logger.warn(`[Push] notifyUser failed: ${err?.message || err}`);
  }
}
