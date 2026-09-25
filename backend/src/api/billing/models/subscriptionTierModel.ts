import mongoose from 'mongoose';

const TierLimitsSchema = new mongoose.Schema(
  {
    maxBrands: { type: Number, default: 1 },
    maxAgents: { type: Number, default: 1 },
    maxSocialAccounts: { type: Number, default: 2 },
    maxJobsPerDay: { type: Number, default: 5 },
    /** @deprecated Prefer monthly AI caps + credits. Kept for legacy call sites. */
    maxAiMessagesPerDay: { type: Number, default: 50 },
    cronEnabled: { type: Boolean, default: true },
    imagesEnabled: { type: Boolean, default: true },
    videosEnabled: { type: Boolean, default: true },
    /** Monthly marketing / hard caps */
    maxAiPostsPerMonth: { type: Number, default: 30 },
    maxAiVideosPerMonth: { type: Number, default: 2 },
    maxAiRepliesPerMonth: { type: Number, default: 50 },
    schedulingDays: { type: Number, default: 30 },
    /** Monthly AI credit allowance (resets each billing month) */
    monthlyCredits: { type: Number, default: 300 },
    /** Team seats (Business+) */
    maxTeamMembers: { type: Number, default: 1 },
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
  /** e.g. "MOST POPULAR" */
  badge: { type: String, default: '' },
  /** Show "Talk to sales" instead of Checkout */
  contactSales: { type: Boolean, default: false },
  /** Marketing feature bullets for pricing cards */
  features: { type: [String], default: [] },
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
  videosEnabled: boolean;
  maxAiPostsPerMonth: number;
  maxAiVideosPerMonth: number;
  maxAiRepliesPerMonth: number;
  schedulingDays: number;
  monthlyCredits: number;
  maxTeamMembers: number;
};
