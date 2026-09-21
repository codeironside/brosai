import mongoose from 'mongoose';

const TierLimitsSchema = new mongoose.Schema(
  {
    maxBrands: { type: Number, default: 1 },
    maxAgents: { type: Number, default: 1 },
    maxSocialAccounts: { type: Number, default: 3 },
    maxJobsPerDay: { type: Number, default: 3 },
    maxAiMessagesPerDay: { type: Number, default: 50 },
    cronEnabled: { type: Boolean, default: true },
    imagesEnabled: { type: Boolean, default: true },
  },
  { _id: false },
);

const SubscriptionTierSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, default: 0 },
  currency: { type: String, default: 'NGN' },
  interval: { type: String, enum: ['monthly', 'yearly'], default: 'monthly' },
  /** Optional provider-side plan/product code (Paystack/Monnify). One-time checkout does not require it. */
  providerPlanId: { type: String, default: '' },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  limits: { type: TierLimitsSchema, default: () => ({}) },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const SubscriptionTierModel =
  mongoose.models.SubscriptionTier || mongoose.model('SubscriptionTier', SubscriptionTierSchema);

export type TierLimits = {
  maxBrands: number;
  maxAgents: number;
  maxSocialAccounts: number;
  maxJobsPerDay: number;
  maxAiMessagesPerDay: number;
  cronEnabled: boolean;
  imagesEnabled: boolean;
};
