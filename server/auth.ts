import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';
import { UserRole } from '../shared/types.js';

const JWT_SECRET = process.env.JWT_SECRET || 'mits-gwalior-energy-2024-secret-key';
const JWT_EXPIRES_IN = '24h';
const SALT_ROUNDS = 10;

// Rate limiting state for authentication attempts (IP/Email -> { count, lockUntil })
const loginAttemptsMap = new Map<string, { count: number; lockUntil: number }>();
const MAX_FAILED_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 15 * 60 * 1000; // 15 minutes

export function checkLoginRateLimit(key: string): { allowed: boolean; waitSeconds?: number } {
  const now = Date.now();
  const record = loginAttemptsMap.get(key);
  if (!record) return { allowed: true };

  if (record.lockUntil > now) {
    const waitSeconds = Math.ceil((record.lockUntil - now) / 1000);
    return { allowed: false, waitSeconds };
  }

  // Lockout expired
  if (record.lockUntil <= now && record.count >= MAX_FAILED_ATTEMPTS) {
    loginAttemptsMap.delete(key);
    return { allowed: true };
  }

  return { allowed: true };
}

export function recordFailedLogin(key: string): void {
  const now = Date.now();
  const record = loginAttemptsMap.get(key) || { count: 0, lockUntil: 0 };
  record.count += 1;
  if (record.count >= MAX_FAILED_ATTEMPTS) {
    record.lockUntil = now + LOCKOUT_DURATION_MS;
  }
  loginAttemptsMap.set(key, record);
}

export function resetLoginAttempts(key: string): void {
  loginAttemptsMap.delete(key);
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, SALT_ROUNDS);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

// Token revocation store (token string -> expiration timestamp ms)
const revokedTokensMap = new Map<string, number>();

// Clean up expired revoked tokens every 15 minutes
setInterval(() => {
  const now = Date.now();
  for (const [token, exp] of revokedTokensMap.entries()) {
    if (now > exp) {
      revokedTokensMap.delete(token);
    }
  }
}, 15 * 60 * 1000);

export function revokeToken(token: string): void {
  try {
    const decoded: any = jwt.decode(token);
    const expMs = decoded && decoded.exp ? decoded.exp * 1000 : Date.now() + 24 * 3600 * 1000;
    revokedTokensMap.set(token, expMs);
  } catch {
    revokedTokensMap.set(token, Date.now() + 24 * 3600 * 1000);
  }
}

export function isTokenRevoked(token: string): boolean {
  const expMs = revokedTokensMap.get(token);
  if (!expMs) return false;
  if (Date.now() > expMs) {
    revokedTokensMap.delete(token);
    return false;
  }
  return true;
}

// Registration rate limiting (IP -> { count, resetAt })
const registerAttemptsMap = new Map<string, { count: number; resetAt: number }>();
const MAX_REGISTRATIONS_PER_WINDOW = 10;
const REGISTRATION_WINDOW_MS = 60 * 60 * 1000; // 1 hour

export function checkRegisterRateLimit(ip: string): boolean {
  const now = Date.now();
  const record = registerAttemptsMap.get(ip);
  if (!record || now > record.resetAt) {
    registerAttemptsMap.set(ip, { count: 1, resetAt: now + REGISTRATION_WINDOW_MS });
    return true;
  }
  if (record.count >= MAX_REGISTRATIONS_PER_WINDOW) {
    return false;
  }
  record.count += 1;
  return true;
}

export function generateToken(payload: { id: string; email: string; role: UserRole; name?: string; departmentId?: string }): string {
  return jwt.sign({ ...payload, jti: uuidv4() }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

export function verifyToken(token: string): any {
  if (isTokenRevoked(token)) {
    return null;
  }
  try {
    return jwt.verify(token, JWT_SECRET);
  } catch {
    return null;
  }
}

export function authMiddleware(req: Request, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authentication required. Please sign in.' });
  }
  const token = authHeader.split(' ')[1];
  const decoded = verifyToken(token);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid or expired session. Please sign in again.' });
  }
  (req as any).user = decoded;
  next();
}

export function optionalAuthMiddleware(req: Request, _res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    const decoded = verifyToken(token);
    if (decoded) {
      (req as any).user = decoded;
    }
  }
  next();
}

// Super Admin Only
export function superAdminMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || user.role !== 'super_admin') {
    return res.status(403).json({ success: false, message: 'Super Administrator privileges required.' });
  }
  next();
}

// Facility Manager or Super Admin
export function facilityManagerMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user || (user.role !== 'super_admin' && user.role !== 'facility_manager')) {
    return res.status(403).json({ success: false, message: 'Facility Manager authorization required.' });
  }
  next();
}

// Department HOD Data Isolation Middleware
export function departmentIsolationMiddleware(req: Request, res: Response, next: NextFunction) {
  const user = (req as any).user;
  if (!user) {
    return res.status(401).json({ success: false, message: 'Authentication required.' });
  }

  // If department HOD, enforce department scope
  if (user.role === 'department_hod') {
    if (!user.departmentId) {
      return res.status(403).json({ success: false, message: 'No department assigned to HOD account.' });
    }
    // Explicitly enforce departmentId in query and body
    req.query.departmentId = user.departmentId;
    (req as any).enforcedDepartmentId = user.departmentId;
  }

  next();
}

/**
 * Validates whether the authenticated user has rights to operate on the given department ID.
 * Returns true if user is super_admin or facility_manager, or if user is department_hod for that department.
 */
export function hasDepartmentAccess(user: any, targetDepartmentId?: string): boolean {
  if (!user) return false;
  if (user.role === 'super_admin' || user.role === 'facility_manager') return true;
  if (user.role === 'department_hod') {
    if (!targetDepartmentId) return true;
    return user.departmentId === targetDepartmentId;
  }
  return false;
}

