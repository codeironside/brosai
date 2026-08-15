export type UserRole = 'owner' | 'admin' | 'user' | 'manager' | 'editor' | 'viewer';

export type AccountCategory = 'personal' | 'creator' | 'business' | 'church' | 'organization' | 'school' | 'agency';
export type PlatformId = 'facebook' | 'instagram' | 'linkedin' | 'twitter' | 'youtube' | 'tiktok' | 'threads';

export interface PlatformCapability {
  platform: PlatformId;
  name: string;
  connected: boolean;
  handle?: string;
  profileName?: string;
  avatarUrl?: string;
  lastSync?: string;
  capabilities: {
    publishText: boolean;
    publishMedia: boolean;
    publishVideo: boolean;
    readComments: boolean;
    replyComments: boolean;
    readDirectMessages: boolean;
    replyDirectMessages: boolean;
    analytics: boolean;
  };
  notes?: string;
}

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  avatarUrl: string;
  category: AccountCategory;
  organizationName: string;
  role: UserRole;
  authProvider: 'google' | 'email';
}

export interface BrandBrain {
  brandName: string;
  industry: string;
  description: string;
  targetAudience: string;
  goals: string[];
  voiceTone: string;
  forbiddenRules: string[];
  contentPillars: string[];
  websiteUrl: string;
  brandColors: string[];
  uploadedDocs: { name: string; size: string; type: string; date: string }[];
  assets: { id: string; name: string; url: string; category: string }[];
}

export type AutopilotMode = 'approval' | 'assisted' | 'autonomous';

export interface AutopilotConfig {
  mode: AutopilotMode;
  isPaused: boolean;
  rules: {
    neverDiscussPolitics: boolean;
    neverUseProfanity: boolean;
    alwaysIncludeWebsite: boolean;
    noSundayPosts: boolean;
    requireApprovalForPromotions: boolean;
    requireApprovalForReplies: boolean;
  };
}

export type PostStatus = 'draft' | 'awaiting_approval' | 'scheduled' | 'publishing' | 'published' | 'failed';

export interface PostVariant {
  platform: PlatformId;
  text: string;
  hashtags: string[];
  mediaUrl?: string;
  mediaType?: 'image' | 'video';
  characterCount: number;
}

export interface PostItem {
  id: string;
  title: string;
  coreConcept: string;
  category: 'educational' | 'promotional' | 'behind_the_scenes' | 'community' | 'thought_leadership';
  status: PostStatus;
  scheduledTime: string;
  variants: PostVariant[];
  createdAt: string;
  publishedAt?: string;
  engagementStats?: {
    likes: number;
    shares: number;
    comments: number;
    clicks: number;
  };
  repurposedFrom?: string;
}

export type InboxClassification = 'inquiry' | 'lead' | 'complaint' | 'positive' | 'spam' | 'sensitive';

export interface InboxMessage {
  id: string;
  platform: PlatformId;
  type: 'comment' | 'direct_message' | 'mention';
  senderName: string;
  senderAvatar: string;
  content: string;
  timestamp: string;
  classification: InboxClassification;
  isLead: boolean;
  suggestedReply: string;
  replyStatus: 'unhandled' | 'ai_draft' | 'approved' | 'replied';
  humanActionRequired: boolean;
}

export interface TrendTopic {
  id: string;
  topic: string;
  relevanceScore: number;
  whyItMatters: string;
  suggestedAngle: string;
  category: string;
}

export interface NotificationSettings {
  inApp: boolean;
  email: boolean;
  emailAddress: string;
  whatsapp: boolean;
  whatsappNumber: string;
  frequency: 'realtime' | 'daily' | 'weekly';
  alertTypes: {
    postPublished: boolean;
    postFailed: boolean;
    newLeads: boolean;
    approvalRequired: boolean;
    weeklyReport: boolean;
  };
}

export interface AuditLog {
  id: string;
  timestamp: string;
  actor: 'AI Social Manager' | 'User (Jeremiah)' | 'System Engine';
  action: string;
  details: string;
  status: 'success' | 'warning' | 'info' | 'error';
}

export interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
  actionCard?: {
    type: 'create_calendar' | 'approve_post' | 'repurpose_video' | 'run_report';
    data?: any;
  };
}

export interface AgencyWorkspace {
  id: string;
  name: string;
  category: AccountCategory;
  activeAccounts: number;
  healthScore: number;
}
