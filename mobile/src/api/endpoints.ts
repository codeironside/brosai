import { apiFetch, saveSession, type ApiUser } from './client';

type GoogleLoginRes = {
  success: boolean;
  data: {
    user: ApiUser;
    accessToken: string;
    refreshToken: string;
  };
};

export async function loginWithGoogleProfile(input: {
  email: string;
  name?: string;
  avatarUrl?: string;
}) {
  let lastError = 'Could not reach the server';
  for (let attempt = 0; attempt < 4; attempt++) {
    try {
      const json = await apiFetch<GoogleLoginRes>(
        '/api/auth/google',
        {
          method: 'POST',
          body: JSON.stringify({
            email: input.email,
            name: input.name || 'Vamvamvam User',
            avatarUrl: input.avatarUrl || '',
          }),
        },
        { auth: false },
      );
      if (json?.data?.user && json.data.accessToken) {
        await saveSession(json.data.user, {
          accessToken: json.data.accessToken,
          refreshToken: json.data.refreshToken,
        });
        return json.data.user;
      }
      lastError = 'Sign-in failed';
    } catch (err: any) {
      lastError = err?.message || lastError;
      const starting = /starting|closing|closed|not connected|503/i.test(lastError);
      if (starting && attempt < 3) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      if (attempt < 3 && /reach|network|Failed to fetch/i.test(lastError)) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)));
        continue;
      }
      break;
    }
  }
  throw new Error(lastError);
}

export async function fetchMe() {
  const json = await apiFetch<{ success: boolean; data: { user: ApiUser & Record<string, unknown> } }>(
    '/api/auth/me',
  );
  return json.data.user;
}

export async function fetchDashboardStats() {
  const json = await apiFetch<{ success: boolean; data: any }>('/api/auth/dashboard-stats');
  return json.data;
}

export async function fetchKnowledgeBase() {
  const json = await apiFetch<{ success: boolean; data: any[] }>('/api/auth/knowledge-base');
  return Array.isArray(json.data) ? json.data : [];
}

export async function searchKnowledge(query: string) {
  const json = await apiFetch<{ success: boolean; data: any[] }>('/api/auth/knowledge-base/search', {
    method: 'POST',
    body: JSON.stringify({ query }),
  });
  return Array.isArray(json.data) ? json.data : [];
}

export async function fetchAiChat(channel = 'hireAi', threadId?: string | null) {
  const qs = new URLSearchParams({ channel });
  if (threadId) qs.set('threadId', threadId);
  const json = await apiFetch<{
    success: boolean;
    data: {
      channel: string;
      threads: Array<{ id: string; title: string; preview?: string; updatedAt?: string }>;
      threadId: string | null;
      messages: Array<{ id: string; role: string; content: string; createdAt?: string }>;
    };
  }>(`/api/auth/ai-chat?${qs.toString()}`);
  return json.data;
}

export async function createAiChatThread(channel = 'hireAi') {
  const json = await apiFetch<{
    success: boolean;
    data: {
      threadId: string | null;
      threads: Array<{ id: string; title: string; preview?: string; updatedAt?: string }>;
      messages: Array<{ id: string; role: string; content: string; createdAt?: string }>;
    };
  }>('/api/auth/ai-chat', {
    method: 'POST',
    body: JSON.stringify({ channel }),
  });
  return json.data;
}

export async function updateProfile(input: {
  name?: string;
  organizationName?: string;
  category?: string;
  avatarUrl?: string;
}) {
  const json = await apiFetch<{
    success: boolean;
    data: {
      id: string;
      name: string;
      email: string;
      avatarUrl?: string;
      category?: string;
      organizationName?: string;
      role?: string;
    };
  }>('/api/auth/profile', {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
  return json.data;
}

export async function askAi(message: string, opts: { channel?: string; threadId?: string | null } = {}) {
  const json = await apiFetch<{
    success: boolean;
    reply: string;
    threadId: string;
    messages: Array<{ id: string; role: string; content: string }>;
  }>('/api/auth/ask-ai', {
    method: 'POST',
    body: JSON.stringify({
      message,
      channel: opts.channel || 'hireAi',
      threadId: opts.threadId || undefined,
    }),
  });
  return json;
}

export async function registerPushToken(token: string, platform: string) {
  await apiFetch('/api/auth/push-token', {
    method: 'POST',
    body: JSON.stringify({ token, platform }),
  });
}

export async function unregisterPushToken(token: string) {
  await apiFetch('/api/auth/push-token', {
    method: 'DELETE',
    body: JSON.stringify({ token }),
  });
}

export async function fetchCronStatus() {
  const json = await apiFetch<{ success: boolean; data: any }>('/api/auth/ai-cron');
  return json.data;
}

export async function startCron(managerId?: string) {
  const json = await apiFetch<{ success: boolean; data: any; message?: string }>('/api/auth/ai-cron/start', {
    method: 'POST',
    body: JSON.stringify(managerId ? { managerId } : {}),
  });
  return json.data;
}

export async function stopCron() {
  const json = await apiFetch<{ success: boolean; data: any }>('/api/auth/ai-cron/stop', {
    method: 'POST',
    body: JSON.stringify({}),
  });
  return json.data;
}

export async function fetchBrandBrains() {
  const json = await apiFetch<{ success: boolean; data: { items: any[]; activeId: string | null } }>(
    '/api/auth/brand-brain',
  );
  return json.data;
}

export async function fetchManagers() {
  const json = await apiFetch<{ success: boolean; data: any }>('/api/auth/ai-manager');
  return json.data;
}

export async function saveManager(input: {
  name: string;
  role?: string;
  personality?: string;
  goal?: string;
  workingHours?: string;
  postingFrequency?: string;
  autopilotMode?: 'assisted' | 'approval' | 'autonomous';
  brandId?: string;
  postTo?: string[];
}) {
  const json = await apiFetch<{ success: boolean; data: any; message?: string }>('/api/auth/ai-manager', {
    method: 'POST',
    body: JSON.stringify({
      name: input.name,
      role: input.role || 'AI Social Manager',
      personality: input.personality || 'Professional & Authoritative',
      goal: input.goal || 'Generate Leads & Build Brand Presence',
      workingHours: input.workingHours || '24/7 Autopilot',
      postingFrequency: input.postingFrequency || '3 posts / day',
      autopilotMode: input.autopilotMode || 'assisted',
      brandId: input.brandId || '',
      postTo: input.postTo || [],
    }),
  });
  return json.data;
}

export async function saveBrandBrain(input: {
  brandName: string;
  industry?: string;
  description?: string;
  website?: string;
}) {
  const json = await apiFetch<{ success: boolean; data: any }>('/api/auth/brand-brain', {
    method: 'PUT',
    body: JSON.stringify({
      brandName: input.brandName,
      industry: input.industry || '',
      description: input.description || '',
      website: input.website || '',
      productsServices: '',
      targetAudience: '',
      voiceTone: '',
      differentiator: '',
      customNotes: '',
      goals: [],
      topics: [],
      contentPillars: [],
      restrictions: [],
    }),
  });
  return json.data;
}
