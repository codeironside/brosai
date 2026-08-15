import { Request, Response } from 'express';
import { logger } from '../../../../core/logger/index.js';

const ALLOWED_HOSTS = [
  'pbs.twimg.com',
  'abs.twimg.com',
  'media.licdn.com',
  'scontent-los4-1.xx.fbcdn.net',
  'scontent.xx.fbcdn.net',
  'scontent-los4-1.cdninstagram.com',
  'scontent.cdninstagram.com'
];

function hostAllowed(hostname: string): boolean {
  const host = hostname.toLowerCase();
  if (ALLOWED_HOSTS.includes(host)) return true;
  return (
    host.endsWith('.twimg.com') ||
    host.endsWith('.fbcdn.net') ||
    host.endsWith('.cdninstagram.com') ||
    host.endsWith('.licdn.com')
  );
}

export const avatarProxyController = async (req: Request, res: Response): Promise<void> => {
  try {
    const raw = String(req.query.url || '');
    const parsed = new URL(raw);
    if (parsed.protocol !== 'https:') {
      res.status(400).end();
      return;
    }
    if (!hostAllowed(parsed.hostname)) {
      res.status(400).end();
      return;
    }
    const upstream = await fetch(parsed.toString(), {
      headers: {
        'User-Agent': 'vamvamvam-ai/1.0',
        Accept: 'image/*'
      }
    });
    if (!upstream.ok) {
      res.status(404).end();
      return;
    }
    const contentType = upstream.headers.get('content-type') || 'image/jpeg';
    const buf = Buffer.from(await upstream.arrayBuffer());
    res.setHeader('Content-Type', contentType);
    res.setHeader('Cache-Control', 'public, max-age=86400');
    res.send(buf);
  } catch (err: any) {
    logger.warn(`Avatar proxy failed: ${err.message}`);
    res.status(404).end();
  }
};
