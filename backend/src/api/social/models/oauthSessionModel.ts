import mongoose from 'mongoose';

const OAuthSessionSchema = new mongoose.Schema({
  state: { type: String, required: true, unique: true, index: true },
  userId: { type: mongoose.Schema.Types.ObjectId, required: true, index: true },
  platform: { type: String, required: true },
  codeVerifier: { type: String, required: true },
  redirectUri: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  expiresAt: { type: Date, required: true, index: { expires: 0 } }
});

export const OAuthSessionModel =
  mongoose.models.OAuthSession || mongoose.model('OAuthSession', OAuthSessionSchema);
