import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import { config } from '../config/index.js';
import { logger } from '../logger/index.js';

const uploadsRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../../uploads/composer');

export type ComposerImage = { id: string; mimeType: string };

export type ComposerImageResult = {
  image?: ComposerImage;
  error?: string;
};

function friendlyImageError(status: number, body: string) {
  const text = String(body || '');
  if (status === 429 || /quota|rate.?limit/i.test(text)) {
    return 'Images are paused for a bit — today\'s picture limit was reached. Your caption is ready to copy. Try the image again later.';
  }
  if (status === 403 || /permission|not (enabled|available)/i.test(text)) {
    return 'Images are not available on this plan right now. Your caption is ready to copy.';
  }
  return 'The image could not be created this time. Your caption is ready to copy.';
}

function safeId(value: string) {
  return String(value || '').replace(/[^a-zA-Z0-9_-]/g, '');
}

function extFor(mimeType: string) {
  if (mimeType.includes('jpeg') || mimeType.includes('jpg')) return 'jpg';
  if (mimeType.includes('webp')) return 'webp';
  return 'png';
}

function mimeForExt(ext: string) {
  if (ext === '.jpg' || ext === '.jpeg') return 'image/jpeg';
  if (ext === '.webp') return 'image/webp';
  return 'image/png';
}

export function aspectForPlatforms(platforms: string[] = []) {
  const keys = platforms.map((item) => String(item).toLowerCase() === 'x' ? 'twitter' : String(item).toLowerCase());
  if (keys.length !== 1) return '1:1';
  if (keys[0] === 'twitter' || keys[0] === 'linkedin') return '16:9';
  if (keys[0] === 'threads' || keys[0] === 'facebook') return '4:5';
  return '1:1';
}

export function shouldMakeImage(message: string, flag?: boolean) {
  const mentioned = /\b(image|images|graphic|visual|photo|picture|illustration|banner|poster|artwork|flyer|thumbnail|cover)\b/i.test(message);
  if (flag === false) return mentioned;
  if (flag === true) return true;
  return mentioned;
}

async function saveImage(userId: string, mimeType: string, buffer: Buffer): Promise<ComposerImage> {
  const id = `img_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const owner = safeId(userId);
  if (!owner) throw new Error('Missing user for image save');
  const dir = path.join(uploadsRoot, owner);
  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(path.join(dir, `${id}.${extFor(mimeType)}`), buffer);
  return { id, mimeType };
}

export async function readComposerImage(userId: string, imageId: string) {
  const owner = safeId(userId);
  const id = safeId(imageId);
  if (!owner || !id) return null;
  const dir = path.join(uploadsRoot, owner);
  let files: string[] = [];
  try {
    files = await fs.readdir(dir);
  } catch {
    return null;
  }
  const match = files.find((file) => file.startsWith(`${id}.`));
  if (!match) return null;
  const buffer = await fs.readFile(path.join(dir, match));
  return { buffer, mimeType: mimeForExt(path.extname(match).toLowerCase()) };
}

export async function generateComposerImage(input: {
  userId: string;
  userMessage: string;
  caption: string;
  brandName?: string;
  platforms?: string[];
}): Promise<ComposerImageResult> {
  const apiKey = config.ai.gemmaApiKey;
  if (!apiKey) return { error: 'Images are not set up yet. Your caption is ready to copy.' };

  const base = String(config.ai.gemmaApiBase || 'https://generativelanguage.googleapis.com/v1beta').replace(/\/$/, '');
  const model = String(config.ai.gemmaImageModel || 'gemini-3.1-flash-image').replace(/^models\//, '');
  const aspectRatio = aspectForPlatforms(input.platforms);
  const caption = String(input.caption || '').slice(0, 800);
  const prompt = [
    `Create one social-ready image for ${input.brandName || 'this brand'}.`,
    `Platform aspect ratio: ${aspectRatio}.`,
    `User request: ${input.userMessage}`,
    caption ? `The caption it will sit with:\n${caption}` : '',
    'Photoreal or clean editorial photography. No watermarks, no fake logos, no celebrity likeness.',
    'If any words appear on the image, use at most 6 large readable words. Do not paste the full caption onto the image.',
    'Make it look like a post someone would actually publish, not a stock collage.'
  ].filter(Boolean).join('\n');

  const res = await fetch(
    `${base}/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: prompt }] }],
        generationConfig: {
          responseModalities: ['TEXT', 'IMAGE'],
          imageConfig: { aspectRatio }
        }
      })
    }
  );

  if (!res.ok) {
    const errorText = await res.text();
    logger.error(`Composer image error (${res.status}): ${errorText.slice(0, 400)}`);
    return { error: friendlyImageError(res.status, errorText) };
  }

  const json = (await res.json()) as any;
  const parts = json?.candidates?.[0]?.content?.parts || [];
  const inline = parts.find((part: any) => part?.inlineData?.data || part?.inline_data?.data);
  const payload = inline?.inlineData || inline?.inline_data;
  const data = payload?.data;
  const mimeType = String(payload?.mimeType || payload?.mime_type || 'image/png');
  if (!data) {
    logger.warn('Composer image returned no inline data');
    return { error: 'The image could not be created this time. Your caption is ready to copy.' };
  }
  return { image: await saveImage(input.userId, mimeType, Buffer.from(data, 'base64')) };
}
