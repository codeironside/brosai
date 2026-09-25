import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  avatarUrl: String,
  category: { type: String, default: 'business' },
  organizationName: String,
  role: { type: String, enum: ['admin', 'user'], default: 'user' },
  authProvider: { type: String, default: 'google' },
  refreshToken: String,
  autopilotMode: { type: String, enum: ['approval', 'assisted', 'autonomous'], default: 'assisted' },

  aiManager: {
    id: String,
    name: { type: String, default: 'Alex' },
    role: { type: String, default: 'AI Social Manager' },
    personality: { type: String, default: 'Professional & Authoritative' },
    goal: { type: String, default: 'Generate Leads & Build Brand Presence' },
    workingHours: { type: String, default: '24/7 Autopilot' },
    postingFrequency: { type: String, default: '3 posts / day' },
    autopilotMode: { type: String, default: 'assisted' },
    hiredAt: Date,
    isActive: Boolean,
    brandId: String,
    brandName: String,
    postTo: { type: [String], default: [] }
  },

  aiManagers: [{
    id: String,
    name: String,
    role: String,
    personality: String,
    goal: String,
    workingHours: String,
    postingFrequency: String,
    autopilotMode: String,
    hiredAt: Date,
    isActive: { type: Boolean, default: false },
    brandId: String,
    brandName: String,
    postTo: { type: [String], default: [] }
  }],

  brandBrain: {
    id: String,
    brandName: String,
    industry: String,
    description: String,
    productsServices: String,
    targetAudience: String,
    goals: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    voiceTone: String,
    differentiator: String,
    contentPillars: { type: [String], default: [] },
    restrictions: { type: [String], default: [] },
    website: String,
    customNotes: String,
    isActive: Boolean,
    createdAt: Date,
    updatedAt: Date
  },

  brandBrains: [{
    id: String,
    brandName: String,
    industry: String,
    description: String,
    productsServices: String,
    targetAudience: String,
    goals: { type: [String], default: [] },
    topics: { type: [String], default: [] },
    voiceTone: String,
    differentiator: String,
    contentPillars: { type: [String], default: [] },
    restrictions: { type: [String], default: [] },
    website: String,
    customNotes: String,
    isActive: { type: Boolean, default: false },
    createdAt: Date,
    updatedAt: Date
  }],

  socialAccounts: [
    {
      platform: { type: String, required: true },
      name: { type: String, required: true },
      connected: { type: Boolean, default: false },
      handle: String,
      avatarUrl: String,
      lastSync: String,
      accountId: String,
      accessTokenEnc: String,
      refreshTokenEnc: String,
      tokenExpiresAt: Date,
      tokenType: String,
      scopes: String,
      capabilities: mongoose.Schema.Types.Mixed
    }
  ],

  aiCron: {
    running: { type: Boolean, default: false },
    managerId: String,
    managerName: String,
    postingFrequency: String,
    intervalMs: Number,
    startedAt: Date,
    stoppedAt: Date,
    lastTickAt: Date,
    nextDueAt: Date,
    lastPhase: { type: String, default: 'idle' },
    lastRunId: String,
    shutdownAt: Date,
    tickCount: { type: Number, default: 0 },
    lastLlmProvider: String,
    contextSummarizedAt: Date,
    pendingQuestions: [String],
    awaitingClarification: { type: Boolean, default: false }
  },

  agentRuns: [
    {
      id: String,
      runId: String,
      agentName: String,
      status: { type: String, enum: ['awaiting', 'publishing', 'succeeded', 'failed'], default: 'awaiting' },
      toolsCount: Number,
      latencyPercent: Number,
      tokens: String,
      cost: String,
      started: String,
      approvalMode: { type: String, default: 'manual' },
      approved: Boolean,
      createdAt: { type: Date, default: Date.now },
      draft: String,
      platforms: [String],
      note: String,
      traces: [{ at: Date, label: String }],
      publishedPosts: [{
        platform: String,
        postId: String,
        url: String,
        label: String
      }],
      analytics: {
        impressions: { type: Number, default: 0 },
        likes: { type: Number, default: 0 },
        comments: { type: Number, default: 0 },
        shares: { type: Number, default: 0 }
      },
      analyticsByPlatform: mongoose.Schema.Types.Mixed,
      analyticsFetchedAt: Date
    }
  ],

  analyticsSync: {
    lastAt: Date,
    backoffUntil: Date
  },

  knowledgeBase: [
    {
      id: String,
      title: String,
      content: String,
      category: String,
      sourceType: { type: String, default: 'document' },
      parentId: String,
      embedding: [Number],
      createdAt: { type: Date, default: Date.now }
    }
  ],

  aiConversations: {
    type: mongoose.Schema.Types.Mixed,
    default: () => ({ hireAi: [], brandBrain: [], composer: [] })
  },

  notificationSettings: {
    inApp: { type: Boolean, default: true },
    email: { type: Boolean, default: true },
    push: { type: Boolean, default: true },
    whatsapp: { type: Boolean, default: false },
    whatsappNumber: { type: String, default: '' },
    frequency: { type: String, default: 'daily' }
  },

  pushTokens: [{
    token: { type: String, required: true },
    platform: { type: String, default: 'unknown' },
    updatedAt: { type: Date, default: Date.now }
  }],

  referralCode: { type: String, unique: true, sparse: true },
  referredBy: { type: String, default: null },

  /** Empty until first paid plan; Starter is the lowest public plan (no Free). */
  subscriptionTierSlug: { type: String, default: '' },
  subscriptionStatus: {
    type: String,
    enum: ['inactive', 'active', 'past_due', 'cancelled', 'bypassed'],
    default: 'inactive',
  },
  /** Super Admin: use product without an active paid subscription */
  subscriptionBypass: { type: Boolean, default: false },
  paymentCustomerId: { type: String, default: '' },
  lastPaymentProvider: { type: String, default: '' },
  lastCheckoutTxRef: { type: String, default: '' },
  currentPeriodEnd: Date,

  /** Purchased top-up credits (do not reset monthly) */
  aiCreditsPurchased: { type: Number, default: 0 },
  /** Last credit pack checkout slug (for webhook attribution) */
  lastCreditPackSlug: { type: String, default: '' },

  usageCounters: {
    aiMessagesDay: String,
    aiMessagesCount: { type: Number, default: 0 },
    /** YYYY-MM billing usage window */
    periodKey: { type: String, default: '' },
    aiCreditsUsed: { type: Number, default: 0 },
    aiPostsUsed: { type: Number, default: 0 },
    aiVideosUsed: { type: Number, default: 0 },
    aiRepliesUsed: { type: Number, default: 0 },
  },

  createdAt: { type: Date, default: Date.now }
});

/** Legacy `free` → `inactive` (Starter is now the lowest plan). */
UserSchema.pre('validate', function (next) {
  const status = String(this.subscriptionStatus || '');
  if (status === 'free') {
    this.subscriptionStatus = 'inactive';
  }
  const slug = String(this.subscriptionTierSlug || '');
  if (slug === 'free' || slug === 'basic') {
    this.subscriptionTierSlug = '';
  }
  next();
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
