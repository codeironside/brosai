import mongoose from 'mongoose';

const CreditPackSchema = new mongoose.Schema({
  slug: { type: String, required: true, unique: true, lowercase: true, trim: true },
  name: { type: String, required: true },
  description: { type: String, default: '' },
  price: { type: Number, required: true },
  currency: { type: String, default: 'NGN' },
  credits: { type: Number, required: true },
  active: { type: Boolean, default: true },
  sortOrder: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

export const CreditPackModel =
  mongoose.models.CreditPack || mongoose.model('CreditPack', CreditPackSchema);
