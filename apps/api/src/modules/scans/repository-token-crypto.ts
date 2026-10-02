import { createCipheriv, createHash, randomBytes } from 'crypto';

export function encryptSensitiveToken(token: string) {
  const secret = process.env.SENSITIVE_TOKEN_ENCRYPTION_KEY ?? process.env.REPOSITORY_TOKEN_ENCRYPTION_KEY ?? process.env.JWT_SECRET;
  if (!secret) throw new Error('SENSITIVE_TOKEN_ENCRYPTION_KEY, REPOSITORY_TOKEN_ENCRYPTION_KEY, or JWT_SECRET is required to queue token-backed scans.');

  const key = createHash('sha256').update(secret).digest();
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', key, iv);
  const ciphertext = Buffer.concat([cipher.update(token, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `v1:${iv.toString('base64url')}:${tag.toString('base64url')}:${ciphertext.toString('base64url')}`;
}

export const encryptRepositoryToken = encryptSensitiveToken;
