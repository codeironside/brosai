import { createCipheriv, createDecipheriv, createHash, randomBytes } from 'crypto';
import { config } from '../config/index.js';

const ALGO = 'aes-256-gcm';

function encryptionKey(): Buffer {
  const raw = config.app.tokenEncryptionKey || config.app.jwtSecret;
  if (/^[0-9a-fA-F]{64}$/.test(raw)) {
    return Buffer.from(raw, 'hex');
  }
  return createHash('sha256').update(raw).digest();
}

export function encryptSecret(plain: string): string {
  if (!plain) return '';
  const iv = randomBytes(12);
  const cipher = createCipheriv(ALGO, encryptionKey(), iv);
  const encrypted = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `v1:${iv.toString('base64')}:${tag.toString('base64')}:${encrypted.toString('base64')}`;
}

export function decryptSecret(payload: string): string {
  if (!payload) return '';
  const [version, ivB64, tagB64, dataB64] = payload.split(':');
  if (version !== 'v1' || !ivB64 || !tagB64 || !dataB64) {
    throw new Error('Unrecognized encrypted token format');
  }
  const decipher = createDecipheriv(ALGO, encryptionKey(), Buffer.from(ivB64, 'base64'));
  decipher.setAuthTag(Buffer.from(tagB64, 'base64'));
  const decrypted = Buffer.concat([
    decipher.update(Buffer.from(dataB64, 'base64')),
    decipher.final()
  ]);
  return decrypted.toString('utf8');
}
