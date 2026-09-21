import { config } from '../../../../core/config/index.js';
import { logger } from '../../../../core/logger/index.js';
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedPaymentEvent,
  PaymentProviderAdapter,
} from './types.js';

type TokenCache = { token: string; expiresAt: number };
let tokenCache: TokenCache | null = null;

function monnifyBase() {
  return (config.billing.monnifyBaseUrl || 'https://sandbox.monnify.com').replace(/\/+$/, '');
}

async function getAccessToken(): Promise<string> {
  const apiKey = config.billing.monnifyApiKey;
  const secret = config.billing.monnifySecretKey;
  if (!apiKey || !secret) throw new Error('Monnify is not configured (missing API key/secret)');

  if (tokenCache && tokenCache.expiresAt > Date.now() + 30_000) {
    return tokenCache.token;
  }

  const basic = Buffer.from(`${apiKey}:${secret}`).toString('base64');
  const res = await fetch(`${monnifyBase()}/api/v1/auth/login`, {
    method: 'POST',
    headers: { Authorization: `Basic ${basic}` },
  });
  const json = (await res.json().catch(() => ({}))) as any;
  const token = json?.responseBody?.accessToken;
  const expiresIn = Number(json?.responseBody?.expiresIn || 3500);
  if (!res.ok || !token) {
    logger.error(`[Monnify] auth failed: ${JSON.stringify(json)}`);
    throw new Error(json?.responseMessage || 'Monnify authentication failed');
  }
  tokenCache = { token, expiresAt: Date.now() + expiresIn * 1000 };
  return token;
}

export const monnifyAdapter: PaymentProviderAdapter = {
  id: 'monnify',

  isConfigured() {
    return Boolean(
      config.billing.monnifyApiKey &&
        config.billing.monnifySecretKey &&
        config.billing.monnifyContractCode,
    );
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error('Monnify is not configured. Set MONNIFY_API_KEY, MONNIFY_SECRET_KEY, MONNIFY_CONTRACT_CODE.');
    }
    const token = await getAccessToken();
    const body = {
      amount: Number(input.amount),
      customerName: input.name,
      customerEmail: input.email,
      paymentReference: input.txRef,
      paymentDescription: input.description || 'Vamvamvam AI subscription',
      currencyCode: (input.currency || 'NGN').toUpperCase(),
      contractCode: config.billing.monnifyContractCode,
      redirectUrl: input.redirectUrl,
      metaData: input.meta || {},
    };

    const res = await fetch(`${monnifyBase()}/api/v1/merchant/transactions/init-transaction`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    const json = (await res.json().catch(() => ({}))) as any;
    const checkoutUrl = json?.responseBody?.checkoutUrl;
    if (!res.ok || !json?.requestSuccessful || !checkoutUrl) {
      logger.error(`[Monnify] init-transaction failed: ${JSON.stringify(json)}`);
      throw new Error(json?.responseMessage || 'Could not create Monnify checkout');
    }

    return {
      link: String(checkoutUrl),
      txRef: input.txRef,
      provider: 'monnify',
      providerReference: String(json.responseBody.transactionReference || ''),
    };
  },

  async verifyWebhook(headers, body): Promise<NormalizedPaymentEvent> {
    const payload = (body || {}) as any;
    const eventData = payload.eventData || payload.data || payload;
    const eventType = String(payload.eventType || payload.event || '').toUpperCase();

    // Optional hash: compute SHA-512 of (secret + paymentReference + amountPaid + paidOn + transactionReference) when configured
    const hashHeader = String(headers['monnify-signature'] || headers['Monnify-Signature'] || '');
    if (config.billing.monnifyWebhookSecret && hashHeader) {
      const crypto = await import('crypto');
      const computed = crypto
        .createHmac('sha512', config.billing.monnifyWebhookSecret)
        .update(JSON.stringify(payload))
        .digest('hex');
      if (computed !== hashHeader) {
        logger.warn('[Monnify] webhook signature mismatch');
        return { success: false, ignored: true, txRef: '', amount: 0, currency: 'NGN' };
      }
    }

    const status = String(eventData.paymentStatus || eventData.status || '').toUpperCase();
    const success =
      status === 'PAID' ||
      status === 'SUCCESS' ||
      status === 'SUCCESSFUL' ||
      eventType.includes('SUCCESSFUL');

    if (!success) {
      return {
        success: false,
        ignored: true,
        txRef: String(eventData.paymentReference || ''),
        amount: Number(eventData.amountPaid || eventData.amount || 0),
        currency: String(eventData.currencyCode || eventData.currency || 'NGN'),
        raw: payload,
      };
    }

    const meta = eventData.metaData || eventData.meta || {};
    return {
      success: true,
      txRef: String(eventData.paymentReference || eventData.transactionReference || ''),
      amount: Number(eventData.amountPaid || eventData.amount || 0),
      currency: String(eventData.currencyCode || eventData.currency || 'NGN'),
      userId: meta.userId ? String(meta.userId) : undefined,
      tierSlug: meta.tierSlug ? String(meta.tierSlug).toLowerCase() : undefined,
      customerId: eventData.customer?.email ? String(eventData.customer.email) : undefined,
      raw: payload,
    };
  },
};
