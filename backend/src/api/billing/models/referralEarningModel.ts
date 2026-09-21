import mongoose from 'mongoose';

const ReferralEarningSchema = new mongoose.Schema({
  referrerUserId: { type: String, required: true, index: true },
  referredUserId: { type: String, required: true, index: true },
  paymentTxRef: { type: String, required: true, unique: true },
  paymentAmount: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  commissionPercent: { type: Number, required: true },
  commissionAmount: { type: Number, required: true },
  tierSlug: { type: String, default: '' },
  status: { type: String, enum: ['pending', 'credited', 'cancelled'], default: 'credited' },
  createdAt: { type: Date, default: Date.now },
});

export const ReferralEarningModel =
  mongoose.models.ReferralEarning || mongoose.model('ReferralEarning', ReferralEarningSchema);
