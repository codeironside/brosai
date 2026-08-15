import crypto from 'crypto';

export function newProfileId(prefix: string): string {
  return `${prefix}_${crypto.randomUUID()}`;
}

function hasHiredAt(manager: any): boolean {
  return Boolean(manager && manager.hiredAt);
}

function hasBrandContent(brain: any): boolean {
  if (!brain) return false;
  return Boolean(
    brain.id ||
    brain.brandName ||
    brain.industry ||
    brain.description ||
    brain.productsServices ||
    brain.targetAudience ||
    brain.voiceTone ||
    brain.website ||
    brain.customNotes ||
    (Array.isArray(brain.goals) && brain.goals.length) ||
    (Array.isArray(brain.topics) && brain.topics.length) ||
    (Array.isArray(brain.contentPillars) && brain.contentPillars.length) ||
    (Array.isArray(brain.restrictions) && brain.restrictions.length)
  );
}

export function listManagers(user: any): any[] {
  const list = Array.isArray(user?.aiManagers) ? user.aiManagers.filter((item: any) => item?.id || hasHiredAt(item)) : [];
  if (list.length) return list;
  if (hasHiredAt(user?.aiManager)) {
    return [{
      id: user.aiManager.id || newProfileId('mgr'),
      name: user.aiManager.name,
      role: user.aiManager.role,
      personality: user.aiManager.personality,
      goal: user.aiManager.goal,
      workingHours: user.aiManager.workingHours,
      postingFrequency: user.aiManager.postingFrequency,
      autopilotMode: user.aiManager.autopilotMode || 'assisted',
      hiredAt: user.aiManager.hiredAt,
      isActive: true,
      brandId: user.aiManager.brandId || '',
      brandName: user.aiManager.brandName || '',
      postTo: Array.isArray(user.aiManager.postTo) ? user.aiManager.postTo : []
    }];
  }
  return [];
}

export function listBrandBrains(user: any): any[] {
  const list = Array.isArray(user?.brandBrains) ? user.brandBrains.filter((item: any) => item?.id || hasBrandContent(item)) : [];
  if (list.length) return list;
  if (hasBrandContent(user?.brandBrain)) {
    return [{
      id: user.brandBrain.id || newProfileId('brand'),
      brandName: user.brandBrain.brandName || '',
      industry: user.brandBrain.industry || '',
      description: user.brandBrain.description || '',
      productsServices: user.brandBrain.productsServices || '',
      targetAudience: user.brandBrain.targetAudience || '',
      goals: user.brandBrain.goals || [],
      topics: user.brandBrain.topics || [],
      voiceTone: user.brandBrain.voiceTone || '',
      differentiator: user.brandBrain.differentiator || '',
      contentPillars: user.brandBrain.contentPillars || [],
      restrictions: user.brandBrain.restrictions || [],
      website: user.brandBrain.website || '',
      customNotes: user.brandBrain.customNotes || '',
      isActive: true,
      createdAt: user.brandBrain.createdAt || new Date(),
      updatedAt: user.brandBrain.updatedAt || new Date()
    }];
  }
  return [];
}

export function activeManager(list: any[]): any | null {
  return list.find((item) => item.isActive) || list[0] || null;
}

export function activeBrandBrain(list: any[]): any | null {
  return list.find((item) => item.isActive) || list[0] || null;
}

export function setActiveInList(list: any[], id: string): any[] {
  return list.map((item) => ({
    ...plain(item),
    isActive: item.id === id
  }));
}

export function plain(doc: any): any {
  if (!doc) return doc;
  if (typeof doc.toObject === 'function') return doc.toObject();
  return { ...doc };
}

export function connectedPlatforms(user: any): string[] {
  return (user?.socialAccounts || [])
    .filter((acc: any) => acc?.connected && acc?.platform)
    .map((acc: any) => String(acc.platform));
}

export function assertReadyToRun(user: any, manager: any): void {
  const brands = listBrandBrains(user);
  if (!brands.length) {
    throw new Error('Save at least one Brand Brain before starting an AI run.');
  }
  const brandId = manager?.brandId;
  if (!brandId || !brands.some((item: any) => item.id === brandId)) {
    throw new Error('Link this AI to a Brand Brain in Hire Your AI before it can run.');
  }
  const linked = connectedPlatforms(user);
  if (!linked.length) {
    throw new Error('Connect at least one social media account before starting an AI run.');
  }
  const postTo = Array.isArray(manager?.postTo) ? manager.postTo.filter(Boolean) : [];
  if (!postTo.length) {
    throw new Error('Choose where this AI should post in Hire Your AI.');
  }
  const allowed = postTo.filter((platform: string) => linked.includes(platform));
  if (!allowed.length) {
    throw new Error('The posting destinations for this AI are not connected. Connect those accounts, then try again.');
  }
}

export function syncManagers(user: any, list: any[]): any[] {
  const normalized = list.map((item) => ({
    id: item.id || newProfileId('mgr'),
    name: item.name,
    role: item.role,
    personality: item.personality,
    goal: item.goal,
    workingHours: item.workingHours,
    postingFrequency: item.postingFrequency,
    autopilotMode: item.autopilotMode || 'assisted',
    hiredAt: item.hiredAt,
    isActive: Boolean(item.isActive),
    brandId: item.brandId || '',
    brandName: item.brandName || '',
    postTo: Array.isArray(item.postTo) ? item.postTo.filter(Boolean) : []
  }));
  const active = activeManager(normalized);
  if (active) {
    normalized.forEach((item) => {
      item.isActive = item.id === active.id;
    });
    user.aiManagers = normalized;
    user.aiManager = { ...active, isActive: true };
    user.autopilotMode = active.autopilotMode || 'assisted';
  } else {
    user.aiManagers = [];
    user.aiManager = undefined;
    user.autopilotMode = 'assisted';
  }
  user.markModified('aiManagers');
  user.markModified('aiManager');
  return normalized;
}

export function syncBrandBrains(user: any, list: any[]): any[] {
  const normalized = list.map((item) => ({
    id: item.id || newProfileId('brand'),
    brandName: item.brandName || '',
    industry: item.industry || '',
    description: item.description || '',
    productsServices: item.productsServices || '',
    targetAudience: item.targetAudience || '',
    goals: Array.isArray(item.goals) ? item.goals : [],
    topics: Array.isArray(item.topics) ? item.topics : [],
    voiceTone: item.voiceTone || '',
    differentiator: item.differentiator || '',
    contentPillars: Array.isArray(item.contentPillars) ? item.contentPillars : [],
    restrictions: Array.isArray(item.restrictions) ? item.restrictions : [],
    website: item.website || '',
    customNotes: item.customNotes || '',
    isActive: Boolean(item.isActive),
    createdAt: item.createdAt || new Date(),
    updatedAt: item.updatedAt || new Date()
  }));
  const active = activeBrandBrain(normalized);
  if (active) {
    normalized.forEach((item) => {
      item.isActive = item.id === active.id;
    });
    user.brandBrains = normalized;
    user.brandBrain = { ...active, isActive: true };
  } else {
    user.brandBrains = [];
    user.brandBrain = undefined;
  }
  user.markModified('brandBrains');
  user.markModified('brandBrain');
  return normalized;
}
