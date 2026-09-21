export type PaymentProviderId = 'monnify' | 'paystack';

export type CheckoutInput = {
  amount: number;
  currency: string;
  email: string;
  name: string;
  txRef: string;
  redirectUrl: string;
  meta?: Record<string, unknown>;
  description?: string;
};

export type CheckoutResult = {
  link: string;
  txRef: string;
  provider: PaymentProviderId;
  providerReference?: string;
};

export type NormalizedPaymentEvent = {
  success: boolean;
  ignored?: boolean;
  txRef: string;
  amount: number;
  currency: string;
  userId?: string;
  tierSlug?: string;
  customerId?: string;
  raw?: unknown;
};

export interface PaymentProviderAdapter {
  id: PaymentProviderId;
  createCheckout(input: CheckoutInput): Promise<CheckoutResult>;
  verifyWebhook(
    headers: Record<string, string | string[] | undefined>,
    body: unknown,
  ): Promise<NormalizedPaymentEvent>;
  isConfigured(): boolean;
}
