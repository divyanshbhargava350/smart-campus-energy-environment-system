import { Request } from 'express';

/**
 * Validates password complexity against modern security standards:
 * - At least 8 characters
 * - At least 1 uppercase letter
 * - At least 1 lowercase letter
 * - At least 1 digit
 * - At least 1 special character
 */
export function validatePasswordStrength(password: string): { valid: boolean; reason?: string } {
  if (!password || typeof password !== 'string') {
    return { valid: false, reason: 'Password is required.' };
  }
  if (password.length < 8) {
    return { valid: false, reason: 'Password must be at least 8 characters in length.' };
  }
  if (!/[A-Z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one uppercase letter (A-Z).' };
  }
  if (!/[a-z]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one lowercase letter (a-z).' };
  }
  if (!/[0-9]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one numerical digit (0-9).' };
  }
  if (!/[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]/.test(password)) {
    return { valid: false, reason: 'Password must include at least one special character (!@#$%^&*...).' };
  }
  return { valid: true };
}

/**
 * Strips dangerous HTML tags, javascript pseudo-protocols, and inline event handlers
 * to neutralize Stored & Reflected XSS injection attempts.
 */
export function sanitizeInputText(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
    .replace(/<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi, '')
    .replace(/<object\b[^<]*(?:(?!<\/object>)<[^<]*)*<\/object>/gi, '')
    .replace(/<embed\b[^<]*(?:(?!<\/embed>)<[^<]*)*<\/embed>/gi, '')
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
    .replace(/javascript:[^\s"'>]*/gi, '')
    .replace(/on\w+\s*=\s*["'][^"']*["']/gi, '')
    .replace(/on\w+\s*=\s*[^\s>]+/gi, '')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

/**
 * Defends against Object Prototype Pollution by checking for forbidden prototype injection keys.
 */
export function hasPrototypePollutionKeys(obj: any): boolean {
  if (!obj || typeof obj !== 'object') return false;
  const forbidden = ['__proto__', 'constructor', 'prototype'];
  for (const key of Object.keys(obj)) {
    if (forbidden.includes(key)) return true;
  }
  return false;
}

/**
 * Whitelists object keys to protect against Mass Assignment attacks.
 */
export function safeWhitelist<T extends Record<string, any>>(updates: Partial<T>, allowedKeys: (keyof T)[]): Partial<T> {
  const safe: Partial<T> = {};
  if (!updates || typeof updates !== 'object') return safe;

  for (const key of allowedKeys) {
    const keyStr = String(key);
    if (keyStr === '__proto__' || keyStr === 'constructor' || keyStr === 'prototype') continue;
    if (Object.prototype.hasOwnProperty.call(updates, key) && updates[key] !== undefined) {
      safe[key] = updates[key];
    }
  }
  return safe;
}

/**
 * Validates IoT device credentials for edge telemetry ingestion.
 * Supports environment variable IOT_DEVICE_KEY or standard authorized hardware key.
 */
const AUTHORIZED_IOT_KEY = process.env.IOT_DEVICE_KEY || 'MITS_IOT_GATEWAY_KEY_2024';

export function validateIoTDeviceAuthentication(req: Request): boolean {
  const deviceKey = req.headers['x-device-key'] || req.query.deviceKey || req.body?.deviceKey;
  if (typeof deviceKey === 'string' && deviceKey.trim() === AUTHORIZED_IOT_KEY) {
    return true;
  }
  return false;
}
