import mongoose from 'mongoose';

/** Per-action AI credit costs — editable in Super Admin */
export const DEFAULT_CREDIT_COSTS: Record<string, number> = {
  caption: 1,
  hashtag: 1,
  rewrite: 1,
  reply: 1,
  short_post: 2,
  long_post: 3,
  repurpose: 3,
  image: 5,
  campaign: 10,
  video: 50,
};

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  referralCommissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  /** Active checkout provider — switchable from Super Admin */
  paymentProvider: { type: String, enum: ['monnify', 'paystack'], default: 'monnify' },
  /** Bump to re-seed plan catalog from code */
  plansCatalogVersion: { type: Number, default: 0 },
  creditCosts: {
    type: Map,
    of: Number,
    default: () => ({ ...DEFAULT_CREDIT_COSTS }),
  },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: '' },
});

export const AppSettingsModel =
  mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);
