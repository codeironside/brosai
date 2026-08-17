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
    tickCount: { type: Number, default: 0 }
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
    whatsapp: { type: Boolean, default: false },
    whatsappNumber: { type: String, default: '' },
    frequency: { type: String, default: 'daily' }
  },

  createdAt: { type: Date, default: Date.now }
});

export const UserModel = mongoose.models.User || mongoose.model('User', UserSchema);
