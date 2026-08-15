import React, { createContext, useContext, useState, useCallback } from 'react';
import {
  UserProfile,
  BrandBrain,
  AutopilotConfig,
  PlatformCapability,
  PostItem,
  InboxMessage,
  TrendTopic,
  NotificationSettings,
  AuditLog,
  ChatMessage,
  AgencyWorkspace,
} from '../types';

interface AppContextType {
  user: UserProfile;
  setUser: React.Dispatch<React.SetStateAction<UserProfile>>;
  accessToken: string;
  refreshToken: string;
  isAuthenticated: boolean;
  login: (userData: Partial<UserProfile>, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  authenticatedFetch: (url: string, init?: RequestInit) => Promise<Response>;
  brandBrain: BrandBrain;
  setBrandBrain: React.Dispatch<React.SetStateAction<BrandBrain>>;
  autopilot: AutopilotConfig;
  setAutopilot: React.Dispatch<React.SetStateAction<AutopilotConfig>>;
  platforms: PlatformCapability[];
  setPlatforms: React.Dispatch<React.SetStateAction<PlatformCapability[]>>;
  posts: PostItem[];
  setPosts: React.Dispatch<React.SetStateAction<PostItem[]>>;
  inbox: InboxMessage[];
  setInbox: React.Dispatch<React.SetStateAction<InboxMessage[]>>;
  trends: TrendTopic[];
  notifications: NotificationSettings;
  setNotifications: React.Dispatch<React.SetStateAction<NotificationSettings>>;
  logs: AuditLog[];
  addLog: (actor: AuditLog['actor'], action: string, details: string, status?: AuditLog['status']) => void;
  chatMessages: ChatMessage[];
  sendChatMessage: (text: string) => void;
  workspaces: AgencyWorkspace[];
  currentWorkspace: AgencyWorkspace;
  setCurrentWorkspace: (ws: AgencyWorkspace) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  togglePauseAI: () => void;
  approvePost: (postId: string) => void;
  approveReply: (inboxId: string) => void;
  createPostFromTrend: (trend: TrendTopic) => void;
  repurposeVideo: (videoTitle: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('brosai_access_token') || '');
  const [refreshToken, setRefreshToken] = useState<string>(() => localStorage.getItem('brosai_refresh_token') || '');

  const [user, setUser] = useState<UserProfile>(() => {
    const savedUser = localStorage.getItem('brosai_user_data');
    if (savedUser) {
      try {
        return JSON.parse(savedUser);
      } catch (e) {}
    }
    return {
      id: '',
      name: '',
      email: '',
      avatarUrl: '',
      category: 'business',
      organizationName: '',
      role: 'user',
      authProvider: 'google',
    };
  });

  const isAuthenticated = Boolean(accessToken);

  const login = (userData: Partial<UserProfile>, newAccessToken: string, newRefreshToken: string) => {
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    localStorage.setItem('brosai_access_token', newAccessToken);
    localStorage.setItem('brosai_refresh_token', newRefreshToken);

    setUser((prev) => {
      const updated = {
        ...prev,
        ...userData,
        role: userData.role || 'user',
      };
      localStorage.setItem('brosai_user_data', JSON.stringify(updated));
      return updated;
    });
  };

  const logout = useCallback(() => {
    setAccessToken('');
    setRefreshToken('');
    localStorage.removeItem('brosai_access_token');
    localStorage.removeItem('brosai_refresh_token');
    localStorage.removeItem('brosai_user_data');
    setUser({
      id: '',
      name: '',
      email: '',
      avatarUrl: '',
      category: 'business',
      organizationName: '',
      role: 'user',
      authProvider: 'google',
    });
  }, []);

  /**
   * Automatic Refresh-Token Protected Fetch API Wrapper
   */
  const authenticatedFetch = useCallback(async (url: string, init?: RequestInit): Promise<Response> => {
    let currentAccess = localStorage.getItem('brosai_access_token') || accessToken;
    let currentRefresh = localStorage.getItem('brosai_refresh_token') || refreshToken;

    const headers = new Headers(init?.headers || {});
    if (currentAccess) {
      headers.set('Authorization', `Bearer ${currentAccess}`);
    }

    let response = await fetch(url, { ...init, headers });

    // Handle 401 Unauthorized or expired access token by attempting silent refresh
    if (response.status === 401 && currentRefresh) {
      try {
        const refreshRes = await fetch('/api/auth/refresh', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ refreshToken: currentRefresh })
        });

        if (refreshRes.ok) {
          const refreshJson = await refreshRes.json();
          if (refreshJson.success && refreshJson.data?.accessToken) {
            const newAccess = refreshJson.data.accessToken;
            const newRefresh = refreshJson.data.refreshToken || currentRefresh;

            setAccessToken(newAccess);
            setRefreshToken(newRefresh);
            localStorage.setItem('brosai_access_token', newAccess);
            localStorage.setItem('brosai_refresh_token', newRefresh);

            // Retry original request with newly refreshed Access Token
            headers.set('Authorization', `Bearer ${newAccess}`);
            response = await fetch(url, { ...init, headers });
          }
        } else {
          // Token refresh failed, log out user
          logout();
        }
      } catch (e) {
        console.warn('Silent token refresh failed:', e);
        logout();
      }
    }

    return response;
  }, [accessToken, refreshToken, logout]);

  const [workspaces] = useState<AgencyWorkspace[]>([
    { id: 'ws_1', name: 'BrandBuilder SaaS (Primary)', category: 'business', activeAccounts: 4, healthScore: 88 },
    { id: 'ws_2', name: 'Grace Community Ministry', category: 'church', activeAccounts: 3, healthScore: 92 },
    { id: 'ws_3', name: 'Apex Fitness Agency Client', category: 'agency', activeAccounts: 5, healthScore: 84 },
  ]);

  const [currentWorkspace, setCurrentWorkspace] = useState<AgencyWorkspace>(workspaces[0]);

  const [brandBrain, setBrandBrain] = useState<BrandBrain>({
    brandName: 'BrandBuilder SaaS',
    industry: 'B2B Software & AI Automation',
    description: 'We empower small business owners and entrepreneurs to automate their daily operations, saving 20+ hours a week through intelligent AI solutions.',
    targetAudience: 'Small business owners, solo founders, marketing directors, and non-technical entrepreneurs (ages 28-55).',
    goals: ['Educate founders on AI efficiency', 'Drive inbound software trials', 'Build trust through transparent case studies'],
    voiceTone: 'Professional yet conversational, insightful, authoritative, zero hype or buzzwords.',
    forbiddenRules: ['Never make guaranteed sales claims', 'Never discuss political opinions', 'Avoid excessive emojis or clickbait titles', 'Never publish unverified claims'],
    contentPillars: ['Operations Automation', 'AI Productivity', 'Founder Stories', 'Customer Case Studies'],
    websiteUrl: 'https://brandbuilder.io',
    brandColors: ['#2563EB', '#0F172A', '#0284C7'],
    uploadedDocs: [
      { name: 'Brand_Identity_Guidelines_2026.pdf', size: '2.4 MB', type: 'PDF', date: '2026-08-01' },
      { name: 'Product_Features_Master_Catalog.docx', size: '1.1 MB', type: 'DOCX', date: '2026-08-05' },
    ],
    assets: [
      { id: 'ast_1', name: 'Primary Logo Dark Theme', url: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=250&q=80', category: 'Logo' },
      { id: 'ast_2', name: 'Product Dashboard Banner', url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=500&q=80', category: 'Product Screenshot' },
    ]
  });

  const [autopilot, setAutopilot] = useState<AutopilotConfig>({
    mode: 'assisted',
    isPaused: false,
    rules: {
      neverDiscussPolitics: true,
      neverUseProfanity: true,
      alwaysIncludeWebsite: true,
      noSundayPosts: true,
      requireApprovalForPromotions: true,
      requireApprovalForReplies: false,
    }
  });

  const [platforms, setPlatforms] = useState<PlatformCapability[]>([
    {
      platform: 'linkedin',
      name: 'LinkedIn Organization Page',
      connected: true,
      handle: '@brandbuilder-saas',
      profileName: 'BrandBuilder SaaS',
      avatarUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=150&q=80',
      lastSync: 'Just now',
      capabilities: { publishText: true, publishMedia: true, publishVideo: true, readComments: true, replyComments: true, readDirectMessages: true, replyDirectMessages: true, analytics: true }
    },
    {
      platform: 'instagram',
      name: 'Instagram Business',
      connected: true,
      handle: '@brandbuilder.official',
      profileName: 'BrandBuilder HQ',
      avatarUrl: 'https://images.unsplash.com/photo-1611162617474-5b21e879e113?auto=format&fit=crop&w=150&q=80',
      lastSync: '4 mins ago',
      capabilities: { publishText: true, publishMedia: true, publishVideo: true, readComments: true, replyComments: true, readDirectMessages: false, replyDirectMessages: false, analytics: true },
      notes: 'Instagram Graph API permits comments; DMs require verified Meta app review.'
    },
    {
      platform: 'twitter',
      name: 'X (Twitter) Professional',
      connected: true,
      handle: '@BrandBuilderAI',
      profileName: 'BrandBuilder AI',
      avatarUrl: 'https://images.unsplash.com/photo-1611605698335-8b1569810432?auto=format&fit=crop&w=150&q=80',
      lastSync: '12 mins ago',
      capabilities: { publishText: true, publishMedia: true, publishVideo: true, readComments: true, replyComments: true, readDirectMessages: true, replyDirectMessages: true, analytics: true }
    },
    {
      platform: 'facebook',
      name: 'Facebook Business Page',
      connected: true,
      handle: 'BrandBuilder Global Page',
      profileName: 'BrandBuilder Global',
      avatarUrl: 'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=150&q=80',
      lastSync: '22 mins ago',
      capabilities: { publishText: true, publishMedia: true, publishVideo: true, readComments: true, replyComments: true, readDirectMessages: true, replyDirectMessages: true, analytics: true }
    },
    {
      platform: 'youtube',
      name: 'YouTube Channel',
      connected: false,
      capabilities: { publishText: false, publishMedia: false, publishVideo: true, readComments: true, replyComments: true, readDirectMessages: false, replyDirectMessages: false, analytics: true }
    },
    {
      platform: 'tiktok',
      name: 'TikTok Business Account',
      connected: false,
      capabilities: { publishText: false, publishMedia: false, publishVideo: true, readComments: true, replyComments: false, readDirectMessages: false, replyDirectMessages: false, analytics: true }
    }
  ]);

  const [posts, setPosts] = useState<PostItem[]>([
    {
      id: 'post_101',
      title: '5 Steps to Automate Small Business Invoicing',
      coreConcept: 'Educational insight breaking down how founders waste 8 hours/week on manual billing.',
      category: 'educational',
      status: 'published',
      scheduledTime: 'Today at 09:00 AM',
      publishedAt: '2026-08-11T09:00:00Z',
      variants: [
        { platform: 'linkedin', text: 'Small business owners spend an average of 8 hours every week manually chasing invoice approvals. Here is how modern AI workflows automate billing end-to-end without zero code tools.', hashtags: ['#Operations', '#Automation', '#SmallBiz'], characterCount: 210 },
        { platform: 'twitter', text: 'Stop wasting 8 hours a week manual billing. Here are 3 steps to set your business invoicing on autopilot using smart AI tools 🧵', hashtags: ['#Productivity', '#Founders'], characterCount: 145 },
        { platform: 'facebook', text: 'Are you still manually managing invoices? Our latest guide breaks down how 500+ business owners automated their billing workflow this quarter.', hashtags: ['#BusinessGrowth'], characterCount: 175 }
      ],
      createdAt: '2026-08-10',
      engagementStats: { likes: 142, shares: 38, comments: 27, clicks: 184 }
    },
    {
      id: 'post_102',
      title: 'Introducing Bros AI Social Manager 2.0',
      coreConcept: 'Promotional announcement spotlighting the new autonomous social employee capability.',
      category: 'promotional',
      status: 'awaiting_approval',
      scheduledTime: 'Tomorrow at 11:30 AM',
      variants: [
        { platform: 'linkedin', text: 'Excited to unveil Bros AI 2.0 — your full-time AI Social Media Manager. Simply connect your social channels, set your brand voice, and let your AI employee plan, write, schedule, and optimize your social presence.', hashtags: ['#SaaS', '#AIAssistant', '#Growth'], characterCount: 235 },
        { platform: 'instagram', text: 'Meet your new AI Social Media Manager 🤖 Brand-aware, autonomous, and built for real ROI. Tap the link in bio for a 14-day free trial!', hashtags: ['#AISocial', '#ContentStrategy'], mediaUrl: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?auto=format&fit=crop&w=600&q=80', characterCount: 160 }
      ],
      createdAt: '2026-08-11'
    },
    {
      id: 'post_103',
      title: 'Behind The Scenes: How We Built Our Multi-Platform Capability Engine',
      coreConcept: 'Transparent founder storytelling building trust and engineering authority.',
      category: 'behind_the_scenes',
      status: 'scheduled',
      scheduledTime: 'Aug 13, 2026 at 02:00 PM',
      variants: [
        { platform: 'linkedin', text: 'Building multi-platform publishing is hard because APIs change. Here is how our engineering team built an adapter architecture that dynamically respects each social platform capabilities.', hashtags: ['#Engineering', '#SaaSBuilding'], characterCount: 220 },
        { platform: 'twitter', text: 'Why copy-pasting the exact same post to Twitter and LinkedIn kills engagement: A quick breakdown on platform adaptation 🧵', hashtags: ['#GrowthHacking'], characterCount: 130 }
      ],
      createdAt: '2026-08-11'
    }
  ]);

  const [inbox, setInbox] = useState<InboxMessage[]>([
    {
      id: 'msg_1',
      platform: 'linkedin',
      type: 'comment',
      senderName: 'Marcus Vance',
      senderAvatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=120&q=80',
      content: 'What is the pricing model for the business tier? Can we manage 5 client brands under one subscription?',
      timestamp: '18 mins ago',
      classification: 'lead',
      isLead: true,
      suggestedReply: 'Hi Marcus! Thanks for reaching out. Yes, our Business & Agency tiers include multi-workspace support for managing multiple client brands seamlessly. I can share our pricing specs or set up a quick 1-on-1 demo!',
      replyStatus: 'ai_draft',
      humanActionRequired: true
    },
    {
      id: 'msg_2',
      platform: 'instagram',
      type: 'comment',
      senderName: 'Elena Rostova',
      senderAvatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=120&q=80',
      content: 'This invoicing breakdown was super helpful! Saving this post for our finance team.',
      timestamp: '42 mins ago',
      classification: 'positive',
      isLead: false,
      suggestedReply: 'Thank you Elena! Glad it added value. Let us know if your finance team needs any template resources!',
      replyStatus: 'approved',
      humanActionRequired: false
    },
    {
      id: 'msg_3',
      platform: 'twitter',
      type: 'direct_message',
      senderName: 'David K. (Founder @ ScaleUp)',
      senderAvatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=120&q=80',
      content: 'Hey Jeremiah, looking to transition our 15-person marketing team to Bros AI. Do you support SSO and custom audit logs?',
      timestamp: '1 hour ago',
      classification: 'lead',
      isLead: true,
      suggestedReply: 'Hello David! Yes, enterprise SSO (SAML/Okta) and full SOC2 audit logs are natively supported on our Organization plan. Shall I connect you with our solutions engineer?',
      replyStatus: 'ai_draft',
      humanActionRequired: true
    }
  ]);

  const [trends] = useState<TrendTopic[]>([
    { id: 'tr_1', topic: 'AI Employees vs Traditional SaaS Tools', relevanceScore: 94, whyItMatters: 'Founders are seeking autonomous agents that complete work rather than passive software.', category: 'Industry Trend', suggestedAngle: 'Educational post contrasting passive schedulers vs autonomous AI social managers.' },
    { id: 'tr_2', topic: 'Platform-Specific Content Adaptation', relevanceScore: 89, whyItMatters: 'Algorithm updates now penalize identical cross-posted content.', category: 'Social Strategy', suggestedAngle: 'Carousel breaking down how to tailor one post for LinkedIn, X, and Instagram.' },
    { id: 'tr_3', topic: 'Short-Form Video Scripting for B2B', relevanceScore: 85, whyItMatters: 'LinkedIn and Instagram Reels are prioritizing short video clips.', category: 'Video Strategy', suggestedAngle: 'Share a 3-part script framework for converting long videos into high-converting reels.' }
  ]);

  const [notifications, setNotifications] = useState<NotificationSettings>({
    inApp: true,
    email: true,
    emailAddress: 'jeremiah@brandbuilder.io',
    whatsapp: true,
    whatsappNumber: '+1 (555) 234-5678',
    frequency: 'realtime',
    alertTypes: {
      postPublished: true,
      postFailed: true,
      newLeads: true,
      approvalRequired: true,
      weeklyReport: true
    }
  });

  const [logs, setLogs] = useState<AuditLog[]>([
    { id: 'l_1', timestamp: '17:05:12', actor: 'AI Social Manager', action: 'PUBLISH_POST', details: 'Published "5 Steps to Automate Small Business Invoicing" on LinkedIn & Twitter', status: 'success' },
    { id: 'l_2', timestamp: '16:45:00', actor: 'AI Social Manager', action: 'CLASSIFY_INBOX', details: 'Identified potential lead from Marcus Vance on LinkedIn', status: 'info' },
    { id: 'l_3', timestamp: '15:20:18', actor: 'User (Jeremiah)', action: 'UPDATE_BRAND_BRAIN', details: 'Updated negative guidelines: Added "Never publish unverified claims"', status: 'success' }
  ]);

  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([
    {
      id: 'c_1',
      sender: 'ai',
      text: "Good afternoon, Jeremiah. I am actively monitoring your brand accounts. Today I published 4 posts across LinkedIn & X, responded to 19 comments, and identified 2 qualified founder leads in your inbox. How can I assist you with your social strategy right now?",
      timestamp: '12:00 PM'
    }
  ]);

  const addLog = (actor: AuditLog['actor'], action: string, details: string, status: AuditLog['status'] = 'info') => {
    const newLog: AuditLog = {
      id: `l_${Date.now()}`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' }),
      actor,
      action,
      details,
      status
    };
    setLogs(prev => [newLog, ...prev]);
  };

  const togglePauseAI = () => {
    setAutopilot(prev => {
      const nextPaused = !prev.isPaused;
      addLog(
        'User (Jeremiah)',
        nextPaused ? 'PAUSE_AI_EMPLOYEE' : 'RESUME_AI_EMPLOYEE',
        nextPaused ? 'Emergency PAUSE activated. All background publishing and reply actions stopped.' : 'AI Social Manager resumed normal operations.',
        nextPaused ? 'warning' : 'success'
      );
      return { ...prev, isPaused: nextPaused };
    });
  };

  const sendChatMessage = async (text: string) => {
    const userMsg: ChatMessage = {
      id: `cm_${Date.now()}`,
      sender: 'user',
      text,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setChatMessages(prev => [...prev, userMsg]);

    try {
      const res = await authenticatedFetch('/api/auth/ask-ai', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: text })
      });
      const json = await res.json().catch(() => ({}));
      const aiText = json.success
        ? json.reply
        : (json.error || 'I could not read brand memory just now. Save your Brand Brain and try again.');

      const aiMsg: ChatMessage = {
        id: `cm_${Date.now() + 1}`,
        sender: 'ai',
        text: aiText,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setChatMessages(prev => [...prev, aiMsg]);
      addLog('AI Social Manager', 'CONVERSATIONAL_ACTION', `Processed user command with brand memory: "${text}"`, 'success');
    } catch (err) {
      setChatMessages(prev => [...prev, {
        id: `cm_${Date.now() + 2}`,
        sender: 'ai',
        text: 'I could not reach brand memory. Check that you are signed in and try again.',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    }
  };

  const approvePost = (postId: string) => {
    setPosts(prev => prev.map(p => p.id === postId ? { ...p, status: 'scheduled' } : p));
    addLog('User (Jeremiah)', 'APPROVE_POST', `Approved scheduled post #${postId}`, 'success');
  };

  const approveReply = (inboxId: string) => {
    setInbox(prev => prev.map(i => i.id === inboxId ? { ...i, replyStatus: 'replied' } : i));
    addLog('User (Jeremiah)', 'SEND_AI_REPLY', `Approved & sent AI response to conversation #${inboxId}`, 'success');
  };

  const createPostFromTrend = (trend: TrendTopic) => {
    const newPost: PostItem = {
      id: `post_trend_${Date.now()}`,
      title: trend.topic,
      coreConcept: trend.whyItMatters,
      category: 'educational',
      status: 'awaiting_approval',
      scheduledTime: 'Tomorrow at 10:00 AM',
      variants: [
        { platform: 'linkedin', text: `Trending Topic in our industry: ${trend.topic}.\n\nHere is why founders need to pay attention: ${trend.whyItMatters}\n\nOur take: ${trend.suggestedAngle}`, hashtags: ['#IndustryTrends', '#Productivity'], characterCount: 210 },
        { platform: 'twitter', text: `Breaking trend: ${trend.topic}.\n\nWhy it matters: ${trend.whyItMatters} 🧵`, hashtags: ['#TechTrends'], characterCount: 120 }
      ],
      createdAt: new Date().toISOString()
    };
    setPosts(prev => [newPost, ...prev]);
    setActiveTab('calendar');
    addLog('AI Social Manager', 'CREATE_TREND_POST', `Created post candidate from trending topic: "${trend.topic}"`, 'success');
  };

  const repurposeVideo = (videoTitle: string) => {
    const repurpost: PostItem = {
      id: `post_rep_${Date.now()}`,
      title: `Repurposed: ${videoTitle}`,
      coreConcept: `Multi-channel breakdown derived from "${videoTitle}"`,
      category: 'educational',
      status: 'awaiting_approval',
      scheduledTime: 'In 2 days at 11:00 AM',
      repurposedFrom: videoTitle,
      variants: [
        { platform: 'linkedin', text: `Key takeaways from our latest video "${videoTitle}":\n\n1. Eliminate manual workflows\n2. Maintain consistent brand voice\n3. Leverage automated AI oversight`, hashtags: ['#VideoKeynotes', '#Automation'], characterCount: 220 },
        { platform: 'twitter', text: `5 key insights extracted from "${videoTitle}" 🧵👇`, hashtags: ['#ContentRepurpose'], characterCount: 95 },
        { platform: 'instagram', text: `Swipe to see the top takeaways from our feature video: "${videoTitle}" 📸`, hashtags: ['#Infographic', '#Reels'], mediaUrl: 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=600&q=80', characterCount: 130 }
      ],
      createdAt: new Date().toISOString()
    };
    setPosts(prev => [repurpost, ...prev]);
    setActiveTab('calendar');
    addLog('AI Social Manager', 'REPURPOSE_CONTENT', `Repurposed video "${videoTitle}" into 3 platform variants`, 'success');
  };

  return (
    <AppContext.Provider
      value={{
        user,
        setUser,
        accessToken,
        refreshToken,
        isAuthenticated,
        login,
        logout,
        authenticatedFetch,
        brandBrain,
        setBrandBrain,
        autopilot,
        setAutopilot,
        platforms,
        setPlatforms,
        posts,
        setPosts,
        inbox,
        setInbox,
        trends,
        notifications,
        setNotifications,
        logs,
        addLog,
        chatMessages,
        sendChatMessage,
        workspaces,
        currentWorkspace,
        setCurrentWorkspace,
        activeTab,
        setActiveTab,
        togglePauseAI,
        approvePost,
        approveReply,
        createPostFromTrend,
        repurposeVideo,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
