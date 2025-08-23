import crypto from 'crypto';

const RAW = process.env.TOKEN_ENCRYPTION_KEY || 'dev_dev_dev_dev_dev_dev_dev_dev_32';

function keyFromEnv(): Buffer {
  const k = RAW || '';
  // Try base64/base64url first
  try {
    const norm = k.replace(/-/g,'+').replace(/_/g,'/');
    const b = Buffer.from(norm, 'base64');
    if (b.length >= 32) return b.subarray(0,32);
  } catch {}
  // Fallback: utf8 padded/truncated to 32
  const ascii = Buffer.from(k, 'utf8');
  const out = Buffer.alloc(32, 0);
  ascii.copy(out, 0, 0, Math.min(32, ascii.length));
  return out;
}

const ENC_KEY = keyFromEnv(); // 32 bytes

export function encrypt(plain: string){
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', ENC_KEY, iv);
  const enc = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, enc]).toString('base64url');
}

export function decrypt(payload: string){
  try {
    const raw = Buffer.from(payload, 'base64url');
    const iv = raw.subarray(0,12);
    const tag = raw.subarray(12,28);
    const data = raw.subarray(28);
    const decipher = crypto.createDecipheriv('aes-256-gcm', ENC_KEY, iv);
    decipher.setAuthTag(tag);
    const dec = Buffer.concat([decipher.update(data), decipher.final()]);
    return dec.toString('utf8');
  } catch {
    return '';
  }
}
