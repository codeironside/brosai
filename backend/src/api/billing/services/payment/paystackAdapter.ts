import crypto from 'crypto';
import { config } from '../../../../core/config/index.js';
import { logger } from '../../../../core/logger/index.js';
import type {
  CheckoutInput,
  CheckoutResult,
  NormalizedPaymentEvent,
  PaymentProviderAdapter,
} from './types.js';

const PAYSTACK_BASE = 'https://api.paystack.co';

export const paystackAdapter: PaymentProviderAdapter = {
  id: 'paystack',

  isConfigured() {
    return Boolean(config.billing.paystackSecretKey);
  },

  async createCheckout(input: CheckoutInput): Promise<CheckoutResult> {
    if (!this.isConfigured()) {
      throw new Error('Paystack is not configured (missing PAYSTACK_SECRET_KEY)');
    }

    // Paystack amounts are in kobo for NGN
    const currency = (input.currency || 'NGN').toUpperCase();
    const amountMinor =
      currency === 'NGN' ? Math.round(Number(input.amount) * 100) : Math.round(Number(input.amount) * 100);

    const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${config.billing.paystackSecretKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        email: input.email,
        amount: amountMinor,
        currency,
        reference: input.txRef,
        callback_url: input.redirectUrl,
        metadata: {
          ...(input.meta || {}),
          custom_fields: [
            { display_name: 'Name', variable_name: 'name', value: input.name },
          ],
        },
      }),
    });

    const json = (await res.json().catch(() => ({}))) as any;
    if (!res.ok || !json.status || !json?.data?.authorization_url) {
      logger.error(`[Paystack] initialize failed: ${JSON.stringify(json)}`);
      throw new Error(json?.message || 'Could not create Paystack checkout');
    }

    return {
      link: String(json.data.authorization_url),
      txRef: String(json.data.reference || input.txRef),
      provider: 'paystack',
      providerReference: String(json.data.access_code || ''),
    };
  },

  async verifyWebhook(headers, body): Promise<NormalizedPaymentEvent> {
    const signature = String(headers['x-paystack-signature'] || '');
    const secret = config.billing.paystackSecretKey;
    if (!secret) {
      return { success: false, ignored: true, txRef: '', amount: 0, currency: 'NGN' };
    }

    const raw = typeof body === 'string' ? body : JSON.stringify(body);
    const hash = crypto.createHmac('sha512', secret).update(raw).digest('hex');
    if (signature && hash !== signature) {
      logger.warn('[Paystack] webhook signature mismatch');
      return { success: false, ignored: true, txRef: '', amount: 0, currency: 'NGN' };
    }

    const payload = (typeof body === 'string' ? JSON.parse(body) : body) as any;
    const event = String(payload?.event || '');
    const data = payload?.data || {};
    const success = event === 'charge.success' && String(data.status).toLowerCase() === 'success';

    if (!success) {
      return {
        success: false,
        ignored: true,
        txRef: String(data.reference || ''),
        amount: Number(data.amount || 0) / 100,
        currency: String(data.currency || 'NGN'),
        raw: payload,
      };
    }

    const meta = data.metadata || {};
    return {
      success: true,
      txRef: String(data.reference || ''),
      amount: Number(data.amount || 0) / 100,
      currency: String(data.currency || 'NGN'),
      userId: meta.userId ? String(meta.userId) : undefined,
      tierSlug: meta.tierSlug ? String(meta.tierSlug).toLowerCase() : undefined,
      customerId: data.customer?.customer_code ? String(data.customer.customer_code) : undefined,
      raw: payload,
    };
  },
};
