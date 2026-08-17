function isHashtagLine(line: string) {
  return /^(#\w+)(\s+#\w+)*$/.test(line.trim());
}

function isMetaLine(line: string) {
  const text = line.trim();
  if (!text) return false;
  if (/^(\*|-|•)\s/.test(text)) return true;
  if (/^\d+\.\s/.test(text)) return true;
  if (/^(copy desk|one \w+ post only|char(?:acter)? count|total:|recounting|plain text|constraints|platform:|voice:|hook:|paragraph|para\s*\d|hashtags:|brand:|core value|user'?s request|output format|new total|wait,|note:|customs angle|national traceability)/i.test(text)) return true;
  if (/^(x|twitter|linkedin|facebook|threads|instagram)\s*·/i.test(text)) return true;
  if (/^\\n/.test(text)) return true;
  if (/\btotal:\s*\d/i.test(text)) return true;
  if (/chars? in utf/i.test(text)) return true;
  if (/too close|dangerous|under 280|max 2 hashtags/i.test(text)) return true;
  if (/\(\d+\)\s*$/.test(text) && text.length < 90) return true;
  if (/^[A-Za-z][^\n]{0,40}:\s/.test(text) && /brand|value|request|platform|voice|constraint|hook|hashtag/i.test(text)) return true;
  return false;
}

function isMetaBlock(block: string) {
  const lines = block.split('\n').map((item) => item.trim()).filter(Boolean);
  if (!lines.length) return true;
  if (isHashtagLine(block) && lines.length === 1) return false;
  const metaHits = lines.filter((line) => isMetaLine(line)).length;
  return metaHits >= Math.ceil(lines.length * 0.6);
}

export const PLATFORM_LIMITS: Record<string, number> = {
  twitter: 280,
  linkedin: 3000,
  facebook: 5000,
  threads: 500
};

export function platformLimit(platform?: string) {
  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  return PLATFORM_LIMITS[key] || PLATFORM_LIMITS.twitter;
}

/** Weighted length: X/Threads count many emoji and non-Latin glyphs as 2. */
export function platformCharCount(text: string, platform?: string) {
  const key = String(platform || '').toLowerCase() === 'x' ? 'twitter' : String(platform || '').toLowerCase();
  const weighted = key === 'twitter' || key === 'threads';
  let n = 0;
  for (const ch of String(text || '')) {
    const cp = ch.codePointAt(0) || 0;
    n += weighted && cp > 0x10ff ? 2 : 1;
  }
  return n;
}

function clipToCount(text: string, budget: number, platform?: string) {
  const points = Array.from(String(text || ''));
  if (platformCharCount(points.join(''), platform) <= budget) return points.join('').trimEnd();
  let lo = 0;
  let hi = points.length;
  while (lo < hi) {
    const mid = Math.ceil((lo + hi) / 2);
    if (platformCharCount(points.slice(0, mid).join(''), platform) <= budget) lo = mid;
    else hi = mid - 1;
  }
  let cut = points.slice(0, lo).join('').trimEnd();
  const space = cut.lastIndexOf(' ');
  const newline = cut.lastIndexOf('\n');
  const breakAt = Math.max(space, newline);
  if (breakAt > cut.length * 0.5) cut = cut.slice(0, breakAt).trimEnd();
  while (cut && platformCharCount(cut, platform) > budget) {
    const next = Array.from(cut);
    next.pop();
    cut = next.join('').trimEnd();
  }
  return cut;
}

export function fitToLimit(text: string, limit: number, platform?: string) {
  const clean = String(text || '').replace(/\r\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim();
  if (!clean || !limit) return clean;
  if (platformCharCount(clean, platform) <= limit) return clean;

  const lines = clean.split('\n');
  let tags = '';
  if (isHashtagLine(lines[lines.length - 1] || '')) {
    tags = (lines.pop() || '').trim();
    while (lines.length && !lines[lines.length - 1].trim()) lines.pop();
  }
  const body = lines.join('\n').trim();
  const suffix = tags ? `\n\n${tags}` : '';
  const suffixCount = platformCharCount(suffix, platform);
  if (suffix && suffixCount < limit) {
    const fitted = `${clipToCount(body, limit - suffixCount, platform)}${suffix}`.trim();
    if (platformCharCount(fitted, platform) <= limit) return fitted;
  }
  return clipToCount(body || clean, limit, platform);
}

export function extractComposerPost(raw: string, limit = 3000, platform?: string): string {
  let text = String(raw || '').replace(/\r\n/g, '\n').trim();
  const fences = [...text.matchAll(/```(?:[\w-]*)\n([\s\S]*?)```/g)].map((match) => match[1].trim());
  if (fences.length) text = fences[fences.length - 1];

  const blocks = text
    .split(/\n\s*\n/)
    .map((item) => item.trim())
    .filter(Boolean)
    .filter((block) => !isMetaBlock(block));

  let picked: string[] = [];
  const hashIndex = [...blocks].reverse().findIndex((block) => isHashtagLine(block.split('\n').pop() || ''));
  if (hashIndex >= 0) {
    const end = blocks.length - 1 - hashIndex;
    const start = Math.max(0, end - 3);
    picked = blocks.slice(start, end + 1);
  } else {
    picked = blocks.slice(-3);
  }

  const post = picked
    .join('\n\n')
    .replace(/^\*\*([^*]+)\*\*$/gm, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  return fitToLimit(post || text, limit, platform);
}
