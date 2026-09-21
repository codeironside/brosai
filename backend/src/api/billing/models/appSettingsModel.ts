import mongoose from 'mongoose';

const AppSettingsSchema = new mongoose.Schema({
  key: { type: String, default: 'default', unique: true },
  referralCommissionPercent: { type: Number, default: 0, min: 0, max: 100 },
  /** Active checkout provider — switchable from Super Admin */
  paymentProvider: { type: String, enum: ['monnify', 'paystack'], default: 'monnify' },
  updatedAt: { type: Date, default: Date.now },
  updatedBy: { type: String, default: '' },
});

export const AppSettingsModel =
  mongoose.models.AppSettings || mongoose.model('AppSettings', AppSettingsSchema);
