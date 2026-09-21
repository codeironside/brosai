import crypto from 'crypto';
import { UserModel } from '../../auth/models/userModel.js';
import { ReferralEarningModel } from '../models/referralEarningModel.js';
import { getAppSettings } from './settingsService.js';
import { logger } from '../../../core/logger/index.js';

export function generateReferralCode(seed?: string) {
  const base = (seed || crypto.randomBytes(4).toString('hex')).replace(/[^a-zA-Z0-9]/g, '').slice(0, 6);
  return `VV${base.toUpperCase()}${crypto.randomBytes(2).toString('hex').toUpperCase()}`;
}

export async function ensureReferralCode(user: any): Promise<string> {
  if (user.referralCode) return String(user.referralCode);
  let code = generateReferralCode(user.email || user._id?.toString());
  for (let i = 0; i < 5; i++) {
    const clash = await UserModel.findOne({ referralCode: code }).select('_id').lean();
    if (!clash) break;
    code = generateReferralCode();
  }
  user.referralCode = code;
  await user.save();
  return code;
}

export async function resolveReferredBy(refCode?: string): Promise<string | null> {
  const code = String(refCode || '').trim().toUpperCase();
  if (!code) return null;
  const referrer = await UserModel.findOne({ referralCode: code }).select('_id').lean() as { _id?: unknown } | null;
  return referrer?._id ? String(referrer._id) : null;
}

export async function recordSubscriptionPayment(input: {
  userId: string;
  amount: number;
  currency: string;
  txRef: string;
  tierSlug: string;
}) {
  const user = await UserModel.findById(input.userId);
  if (!user) return null;

  const referredBy = user.referredBy ? String(user.referredBy) : '';
  if (!referredBy || referredBy === String(user._id)) return null;

  const existing = await ReferralEarningModel.findOne({ paymentTxRef: input.txRef }).lean();
  if (existing) return existing;

  const settings = await getAppSettings();
  const percent = Number(settings.referralCommissionPercent || 0);
  if (percent <= 0 || input.amount <= 0) return null;

  const commissionAmount = Math.round((input.amount * percent) / 100 * 100) / 100;

  try {
    const earning = await ReferralEarningModel.create({
      referrerUserId: referredBy,
      referredUserId: String(user._id),
      paymentTxRef: input.txRef,
      paymentAmount: input.amount,
      currency: input.currency || 'NGN',
      commissionPercent: percent,
      commissionAmount,
      tierSlug: input.tierSlug,
      status: 'credited',
      createdAt: new Date(),
    });
    logger.info(
      `[Referrals] Credited ${commissionAmount} ${input.currency} to ${referredBy} from ${input.userId} (${percent}%)`,
    );
    return earning;
  } catch (err: any) {
    if (/duplicate|E11000/i.test(err.message || '')) {
      return ReferralEarningModel.findOne({ paymentTxRef: input.txRef });
    }
    throw err;
  }
}

export async function getReferralSummary(userId: string) {
  const earnings = await ReferralEarningModel.find({ referrerUserId: userId })
    .sort({ createdAt: -1 })
    .limit(100)
    .lean();
  const referredCount = await UserModel.countDocuments({ referredBy: userId });
  const totalCommission = earnings.reduce((sum, row) => sum + Number(row.commissionAmount || 0), 0);
  return {
    referredCount,
    totalCommission,
    currency: earnings[0]?.currency || 'NGN',
    earnings,
  };
}
