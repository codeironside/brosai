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

export function extractComposerPost(raw: string, limit = 3000): string {
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

  let post = picked
    .join('\n\n')
    .replace(/^\*\*([^*]+)\*\*$/gm, '$1')
    .replace(/\*\*([^*]+)\*\*/g, '$1')
    .replace(/^#{1,3}\s+/gm, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();

  if (limit && post.length > limit) {
    post = `${post.slice(0, Math.max(0, limit - 1)).trim()}…`;
  }
  return post;
}
