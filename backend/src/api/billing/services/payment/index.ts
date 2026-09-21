import type { PaymentProviderAdapter, PaymentProviderId } from './types.js';
import { monnifyAdapter } from './monnifyAdapter.js';
import { paystackAdapter } from './paystackAdapter.js';

const adapters: Record<PaymentProviderId, PaymentProviderAdapter> = {
  monnify: monnifyAdapter,
  paystack: paystackAdapter,
};

export function getPaymentAdapter(provider: PaymentProviderId | string): PaymentProviderAdapter {
  const id = (provider === 'paystack' ? 'paystack' : 'monnify') as PaymentProviderId;
  return adapters[id];
}

export function listPaymentAdapters() {
  return (Object.keys(adapters) as PaymentProviderId[]).map((id) => ({
    id,
    configured: adapters[id].isConfigured(),
  }));
}
