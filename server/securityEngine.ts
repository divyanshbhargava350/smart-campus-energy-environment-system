import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export type SecuritySeverity = 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | 'INFO';

export type SecurityEventType =
  | 'AUTH_BRUTE_FORCE'
  | 'AUTH_FAILED_ATTEMPT'
  | 'AUTH_CREDENTIAL_STUFFING'
  | 'AUTH_SUCCESS'
  | 'AUTH_TOKEN_REVOKED'
  | 'PRIVILEGE_ESCALATION_ATTEMPT'
  | 'UNAUTHORIZED_API_ACCESS'
  | 'SQL_INJECTION_DETECTED'
  | 'XSS_ATTACK_DETECTED'
  | 'PATH_TRAVERSAL_DETECTED'
  | 'PROTOTYPE_POLLUTION_DETECTED'
  | 'ABNORMAL_REQUEST_FREQUENCY'
  | 'IOT_DEVICE_UNAUTHORIZED_ACCESS'
  | 'IOT_DEVICE_QUARANTINED'
  | 'IOT_TELEMETRY_TAMPERING'
  | 'IOT_TELEMETRY_FLOODING'
  | 'DATABASE_BACKUP_EXECUTED'
  | 'DATABASE_SECURITY_ANOMALY';

export type SecurityActionTaken = 'BLOCKED' | 'THROTTLED' | 'QUARANTINED' | 'FLAGGED' | 'AUDITED';

export interface SecurityEvent {
  id: string;
  eventType: SecurityEventType;
  severity: SecuritySeverity;
  timestamp: string; // ISO 8601 UTC
  affectedResource: string;
  identifier?: string;
  correlationId: string;
  detectionReason: string;
  actionTaken: SecurityActionTaken;
  verificationStatus: 'CONFIRMED' | 'SUSPECTED' | 'EVALUATED';
  ipAddress?: string;
  method?: string;
  path?: string;
  details?: Record<string, any>;
}

// In-Memory Ring Buffer for SIEM Security Logs (up to 5,000 events)
const MAX_SIEM_EVENTS = 5000;
const securityEventsLog: SecurityEvent[] = [];

// Automated Incident Response: Dynamic IP Blocklist
interface BlockedIpRecord {
  blockedUntil: number;
  reason: string;
  offenseCount: number;
  lastOffense: string;
}
const blockedIpsMap = new Map<string, BlockedIpRecord>();
const DEFAULT_IP_BLOCK_DURATION_MS = 15 * 60 * 1000; // 15 minutes

// Rate Limiting & Anomaly Tracker (IP -> sliding request timestamps)
const ipRequestHistory = new Map<string, number[]>();
const MAX_REQUESTS_PER_MINUTE = 240; // 4 requests per second baseline burst

// IoT Device Quarantine Registry
interface QuarantinedDeviceRecord {
  quarantinedUntil: number;
  reason: string;
  failureCount: number;
  lastIncident: string;
}
const quarantinedDevicesMap = new Map<string, QuarantinedDeviceRecord>();
const DEFAULT_DEVICE_QUARANTINE_MS = 30 * 60 * 1000; // 30 minutes

// IoT Ingestion Rate Tracker (deviceId -> timestamps)
const deviceIngestHistory = new Map<string, number[]>();
const MAX_DEVICE_INGEST_PER_SECOND = 15;

/**
 * Sanitizes log input strings to prevent CRLF log injection attacks.
 */
export function sanitizeLogInput(input: unknown): string {
  if (typeof input !== 'string') return '';
  return input.replace(/[\r\n\t]/g, ' ').slice(0, 500);
}

/**
 * Deep redaction utility to ensure credentials, tokens, and secrets are never logged.
 */
export function redactSensitiveData(data: any): any {
  if (!data || typeof data !== 'object') return data;
  if (Array.isArray(data)) {
    return data.map(item => redactSensitiveData(item));
  }
  const redacted: Record<string, any> = {};
  const sensitiveKeys = ['password', 'token', 'authorization', 'secret', 'key', 'cookie', 'hash', 'credential'];

  for (const [key, value] of Object.entries(data)) {
    const lowerKey = key.toLowerCase();
    if (sensitiveKeys.some(s => lowerKey.includes(s))) {
      redacted[key] = '[REDACTED]';
    } else if (value && typeof value === 'object') {
      redacted[key] = redactSensitiveData(value);
    } else {
      redacted[key] = value;
    }
  }
  return redacted;
}

/**
 * Centralized SIEM Event Dispatcher.
 * Appends immutable structured audit record and triggers automated alerts when required.
 */
export function recordSecurityEvent(event: Omit<SecurityEvent, 'id' | 'timestamp'> & { timestamp?: string }): SecurityEvent {
  const fullEvent: SecurityEvent = {
    id: `SEC_EVT_${Date.now()}_${uuidv4().slice(0, 8).toUpperCase()}`,
    timestamp: event.timestamp || new Date().toISOString(),
    eventType: event.eventType,
    severity: event.severity,
    affectedResource: sanitizeLogInput(event.affectedResource),
    identifier: event.identifier ? sanitizeLogInput(event.identifier) : undefined,
    correlationId: event.correlationId || uuidv4(),
    detectionReason: sanitizeLogInput(event.detectionReason),
    actionTaken: event.actionTaken,
    verificationStatus: event.verificationStatus,
    ipAddress: event.ipAddress ? sanitizeLogInput(event.ipAddress) : undefined,
    method: event.method,
    path: event.path ? sanitizeLogInput(event.path) : undefined,
    details: event.details ? redactSensitiveData(event.details) : undefined
  };

  // Append-only ring buffer
  securityEventsLog.unshift(fullEvent);
  if (securityEventsLog.length > MAX_SIEM_EVENTS) {
    securityEventsLog.pop();
  }

  // Console output formatted for structured log aggregators
  console.log(`[SIEM] [${fullEvent.severity}] [${fullEvent.eventType}] ${fullEvent.detectionReason} (IP: ${fullEvent.ipAddress || 'unknown'})`);

  return fullEvent;
}

/**
 * Checks whether an IP address is currently blocked by the incident response engine.
 */
export function isIpBlocked(ip: string): { blocked: boolean; remainingSeconds?: number; reason?: string } {
  const record = blockedIpsMap.get(ip);
  if (!record) return { blocked: false };

  const now = Date.now();
  if (now > record.blockedUntil) {
    blockedIpsMap.delete(ip); // Automatic expiration
    return { blocked: false };
  }

  const remainingSeconds = Math.ceil((record.blockedUntil - now) / 1000);
  return { blocked: true, remainingSeconds, reason: record.reason };
}

/**
 * Programmatically isolates an IP address following confirmed malicious behavior.
 */
export function blockIp(ip: string, reason: string, durationMs = DEFAULT_IP_BLOCK_DURATION_MS): void {
  const now = Date.now();
  const existing = blockedIpsMap.get(ip);
  const offenseCount = (existing?.offenseCount || 0) + 1;

  blockedIpsMap.set(ip, {
    blockedUntil: now + durationMs,
    reason: sanitizeLogInput(reason),
    offenseCount,
    lastOffense: new Date().toISOString()
  });

  recordSecurityEvent({
    eventType: 'ABNORMAL_REQUEST_FREQUENCY',
    severity: 'HIGH',
    affectedResource: 'IP_FIREWALL_FILTER',
    identifier: ip,
    correlationId: uuidv4(),
    detectionReason: `Automated Incident Response: Isolated IP ${ip}. Reason: ${reason}. Offense #${offenseCount}.`,
    actionTaken: 'BLOCKED',
    verificationStatus: 'CONFIRMED',
    ipAddress: ip
  });
}

/**
 * Administrator manual remediation: unblocks an IP.
 */
export function unblockIp(ip: string): boolean {
  return blockedIpsMap.delete(ip);
}

/**
 * Checks whether an IoT device is currently quarantined.
 */
export function isDeviceQuarantined(deviceId: string): { quarantined: boolean; remainingSeconds?: number; reason?: string } {
  const record = quarantinedDevicesMap.get(deviceId);
  if (!record) return { quarantined: false };

  const now = Date.now();
  if (now > record.quarantinedUntil) {
    quarantinedDevicesMap.delete(deviceId);
    return { quarantined: false };
  }

  const remainingSeconds = Math.ceil((record.quarantinedUntil - now) / 1000);
  return { quarantined: true, remainingSeconds, reason: record.reason };
}

/**
 * Quarantines an abusive or malfunctioning IoT device.
 */
export function quarantineDevice(deviceId: string, reason: string, durationMs = DEFAULT_DEVICE_QUARANTINE_MS): void {
  const now = Date.now();
  const existing = quarantinedDevicesMap.get(deviceId);
  const failureCount = (existing?.failureCount || 0) + 1;

  quarantinedDevicesMap.set(deviceId, {
    quarantinedUntil: now + durationMs,
    reason: sanitizeLogInput(reason),
    failureCount,
    lastIncident: new Date().toISOString()
  });

  recordSecurityEvent({
    eventType: 'IOT_DEVICE_QUARANTINED',
    severity: 'HIGH',
    affectedResource: `IoT_Device_${deviceId}`,
    identifier: deviceId,
    correlationId: uuidv4(),
    detectionReason: `Automated Incident Response: Device ${deviceId} placed into quarantine. Reason: ${reason}`,
    actionTaken: 'QUARANTINED',
    verificationStatus: 'CONFIRMED'
  });
}

/**
 * Administrator manual remediation: restores a quarantined device.
 */
export function restoreDevice(deviceId: string): boolean {
  return quarantinedDevicesMap.delete(deviceId);
}

/**
 * Validates edge IoT telemetry stream against flooding and tampering signatures.
 */
export function inspectIoTTelemetry(deviceId: string, reading: { powerKw?: number; voltage?: number; currentAmps?: number }): {
  allowed: boolean;
  statusCode?: number;
  reason?: string;
} {
  const quarantineCheck = isDeviceQuarantined(deviceId);
  if (quarantineCheck.quarantined) {
    return {
      allowed: false,
      statusCode: 403,
      reason: `Device is quarantined. ${quarantineCheck.reason}. Remaining lockout: ${quarantineCheck.remainingSeconds}s`
    };
  }

  // 1. Telemetry Flooding check
  const now = Date.now();
  const timestamps = deviceIngestHistory.get(deviceId) || [];
  const recent = timestamps.filter(t => now - t < 1000); // 1-second sliding window
  recent.push(now);
  deviceIngestHistory.set(deviceId, recent);

  if (recent.length > MAX_DEVICE_INGEST_PER_SECOND) {
    quarantineDevice(deviceId, `High-frequency telemetry flood: ${recent.length} packets/second detected.`);
    return {
      allowed: false,
      statusCode: 429,
      reason: 'Rate limit exceeded: Telemetry flood detected from device.'
    };
  }

  // 2. Physical Sensor Plausibility Bounds
  if (typeof reading.powerKw === 'number') {
    if (reading.powerKw < 0 || reading.powerKw > 2500 || isNaN(reading.powerKw)) {
      recordSecurityEvent({
        eventType: 'IOT_TELEMETRY_TAMPERING',
        severity: 'MEDIUM',
        affectedResource: `IoT_Device_${deviceId}`,
        identifier: deviceId,
        correlationId: uuidv4(),
        detectionReason: `Impossible electrical telemetry value: powerKw=${reading.powerKw}. Outside physical campus bounds (0-2500 kW).`,
        actionTaken: 'FLAGGED',
        verificationStatus: 'SUSPECTED'
      });
      return {
        allowed: false,
        statusCode: 422,
        reason: 'Sensor reading rejected: Value violates physical campus grid bounds.'
      };
    }
  }

  return { allowed: true };
}

// Intrusion Detection Pattern Definitions
const SQL_INJECTION_PATTERNS = [
  /(?:'|\%27)\s*(?:or|and)\s*.*?=.*/i,
  /\b(UNION\s+(?:ALL\s+)?SELECT|DROP\s+(?:TABLE|DATABASE)|UPDATE\s+.*?\s+SET|DELETE\s+FROM)\b/i,
  /(\b(SLEEP|BENCHMARK|WAITFOR\s+DELAY)\s*\()/i,
  /(--|;--|\/\*|\*\/)/
];

const XSS_PATTERNS = [
  /<script\b[^>]*>([\s\S]*?)<\/script>/i,
  /javascript\s*:\s*[^\s"'>]+/i,
  /(\bonerror\s*=\s*|\bonload\s*=\s*|\bonclick\s*=\s*|\bonmouseover\s*=\s*)/i,
  /<(?:iframe|embed|object|svg\s+onload)\b[^>]*>/i
];

const PATH_TRAVERSAL_PATTERNS = [
  /(\.\.[\/\\]|\/etc\/passwd|c:\\windows|\/winnt\/)/i
];

function scanPayloadForAttacks(str: string): { detected: boolean; attackType?: SecurityEventType; pattern?: string } {
  if (!str || typeof str !== 'string') return { detected: false };

  for (const regex of SQL_INJECTION_PATTERNS) {
    if (regex.test(str)) {
      return { detected: true, attackType: 'SQL_INJECTION_DETECTED', pattern: regex.source };
    }
  }
  for (const regex of XSS_PATTERNS) {
    if (regex.test(str)) {
      return { detected: true, attackType: 'XSS_ATTACK_DETECTED', pattern: regex.source };
    }
  }
  for (const regex of PATH_TRAVERSAL_PATTERNS) {
    if (regex.test(str)) {
      return { detected: true, attackType: 'PATH_TRAVERSAL_DETECTED', pattern: regex.source };
    }
  }
  return { detected: false };
}

/**
 * Express Middleware: Real-Time Intrusion Detection System (IDS)
 * Inspects all inbound HTTP requests for known attack vectors and enforces automated jailing.
 */
export function intrusionDetectionMiddleware(req: Request, res: Response, next: NextFunction) {
  // 1. Assign unique Correlation ID
  const correlationId = (req.headers['x-correlation-id'] as string) || uuidv4();
  (req as any).correlationId = correlationId;
  res.setHeader('X-Correlation-ID', correlationId);

  const ip = req.ip || req.socket.remoteAddress || '127.0.0.1';

  // 2. Check if IP is currently jailed
  const jailStatus = isIpBlocked(ip);
  if (jailStatus.blocked) {
    return res.status(403).json({
      success: false,
      message: `Access denied by Security Operations. IP is temporarily isolated. Reason: ${jailStatus.reason}. Retry in ${jailStatus.remainingSeconds}s.`,
      correlationId
    });
  }

  // 3. Sliding window abnormal request rate detection
  const now = Date.now();
  const reqHistory = ipRequestHistory.get(ip) || [];
  const validWindow = reqHistory.filter(t => now - t < 60000); // 1 minute window
  validWindow.push(now);
  ipRequestHistory.set(ip, validWindow);

  if (validWindow.length > MAX_REQUESTS_PER_MINUTE) {
    blockIp(ip, `Abnormal request rate: Exceeded ${MAX_REQUESTS_PER_MINUTE} requests/minute.`);
    return res.status(429).json({
      success: false,
      message: 'Rate limit exceeded: Abnormal request burst detected. IP temporarily throttled.',
      correlationId
    });
  }

  // 4. Scan inbound parameters (URL, query string, request body)
  const inspectTargets: string[] = [];
  try {
    inspectTargets.push(decodeURIComponent(req.originalUrl || req.url));
  } catch {
    inspectTargets.push(req.originalUrl || req.url);
  }

  if (req.query) {
    inspectTargets.push(JSON.stringify(req.query));
  }
  if (req.body && typeof req.body === 'object') {
    inspectTargets.push(JSON.stringify(req.body));
  }

  for (const target of inspectTargets) {
    const scan = scanPayloadForAttacks(target);
    if (scan.detected && scan.attackType) {
      recordSecurityEvent({
        eventType: scan.attackType,
        severity: 'CRITICAL',
        affectedResource: req.path,
        correlationId,
        detectionReason: `Intrusion signature matched: ${scan.attackType}. Pattern: ${scan.pattern}`,
        actionTaken: 'BLOCKED',
        verificationStatus: 'CONFIRMED',
        ipAddress: ip,
        method: req.method,
        path: req.path,
        details: { sample: target.slice(0, 100) }
      });

      // Automatically isolate repeat offenders
      const existing = blockedIpsMap.get(ip);
      if (existing) {
        blockIp(ip, `Repeated malicious payloads: ${scan.attackType}`);
      }

      return res.status(403).json({
        success: false,
        message: 'Security Alert: Malicious request signature detected and blocked by Campus Intrusion Detection System.',
        correlationId
      });
    }
  }

  next();
}

/**
 * Returns read-only SIEM events for Super Admin dashboard review.
 */
export function getSecurityLogs(filter?: { severity?: SecuritySeverity; eventType?: SecurityEventType; limit?: number }): SecurityEvent[] {
  let logs = [...securityEventsLog];
  if (filter?.severity) {
    logs = logs.filter(e => e.severity === filter.severity);
  }
  if (filter?.eventType) {
    logs = logs.filter(e => e.eventType === filter.eventType);
  }
  const limit = Math.min(filter?.limit || 100, 500);
  return logs.slice(0, limit);
}

/**
 * Returns security operations system statistics for monitoring.
 */
export function getSecurityStats(): {
  totalEvents: number;
  criticalEvents: number;
  blockedIpsCount: number;
  quarantinedDevicesCount: number;
  activeBlockedIps: { ip: string; remainingSeconds: number; reason: string }[];
  activeQuarantinedDevices: { deviceId: string; remainingSeconds: number; reason: string }[];
} {
  const now = Date.now();
  const activeBlocked: { ip: string; remainingSeconds: number; reason: string }[] = [];
  for (const [ip, rec] of blockedIpsMap.entries()) {
    if (rec.blockedUntil > now) {
      activeBlocked.push({
        ip,
        remainingSeconds: Math.ceil((rec.blockedUntil - now) / 1000),
        reason: rec.reason
      });
    }
  }

  const activeQuarantined: { deviceId: string; remainingSeconds: number; reason: string }[] = [];
  for (const [devId, rec] of quarantinedDevicesMap.entries()) {
    if (rec.quarantinedUntil > now) {
      activeQuarantined.push({
        deviceId: devId,
        remainingSeconds: Math.ceil((rec.quarantinedUntil - now) / 1000),
        reason: rec.reason
      });
    }
  }

  return {
    totalEvents: securityEventsLog.length,
    criticalEvents: securityEventsLog.filter(e => e.severity === 'CRITICAL').length,
    blockedIpsCount: activeBlocked.length,
    quarantinedDevicesCount: activeQuarantined.length,
    activeBlockedIps: activeBlocked,
    activeQuarantinedDevices: activeQuarantined
  };
}
