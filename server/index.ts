import express from 'express';
import cors from 'cors';
import http from 'http';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { WebSocketServer, WebSocket } from 'ws';
import { apiRouter } from './routes.js';
import { seedMITSDatabase } from './seed.js';
import { energyEngine } from './energyEngine.js';
import { db } from './db.js';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 4000;

const ALLOWED_ORIGINS = [
  'https://smart-campus-energy-environment-sys.vercel.app',
  'http://localhost:5173',
  'http://localhost:4000',
  'http://127.0.0.1:5173',
  'http://127.0.0.1:4000',
];

app.use(cors({
  origin: (origin, callback) => {
    // Allow non-browser requests (e.g. mobile apps, curl, automated testing) or whitelisted origins
    if (!origin || ALLOWED_ORIGINS.includes(origin)) {
      return callback(null, true);
    }
    return callback(new Error('Cross-Origin Request Blocked by Security Policy'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With', 'x-device-key']
}));

// Security Hardening Headers
app.use((_req, res, next) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('X-XSS-Protection', '1; mode=block');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Permissions-Policy', 'geolocation=(), camera=(), microphone=()');
  res.setHeader('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');
  res.setHeader('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com data:; img-src 'self' data: blob: https:; connect-src 'self' https: wss: ws:; frame-ancestors 'none';");
  next();
});

app.use(express.json());

// Mount API
app.use('/api', apiRouter);

// WebSocket
const wss = new WebSocketServer({ server, path: '/ws' });

wss.on('connection', (ws: WebSocket) => {
  const balance = energyEngine.getEnergyBalance();
  ws.send(JSON.stringify({ type: 'SNAPSHOT', data: balance }));
});

// Broadcast live ticks every 3 seconds
setInterval(() => {
  if (wss.clients.size > 0) {
    const balance = energyEngine.getEnergyBalance();
    const packet = JSON.stringify({
      type: 'SOLAR_GRID_TICK',
      timestamp: new Date().toISOString(),
      balance
    });
    wss.clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(packet);
      }
    });
  }
}, 3000);

// Simulation tick: generate telemetry readings every 15 seconds
setInterval(() => {
  const data = db.getData();
  if (!data.simulatorRunning) return;

  const now = new Date().toISOString();
  const factor = energyEngine.getLiveFactor();

  // Update room readings with realistic fluctuations
  data.rooms.forEach(room => {
    const variation = 1 + (Math.random() - 0.5) * 0.08;
    room.currentPowerKw = +(room.currentPowerKw * variation).toFixed(1);
    // Clamp to reasonable range
    if (room.currentPowerKw < 0.5) room.currentPowerKw = 0.5;
    if (room.currentPowerKw > 50) room.currentPowerKw = 50;

    // Add telemetry reading every few ticks
    if (Math.random() < 0.3) {
      db.addTelemetryReading({
        id: `TR_${uuidv4().slice(0, 8)}`,
        timestamp: now,
        deviceId: `DEV_${room.buildingId}`,
        roomId: room.id,
        buildingId: room.buildingId,
        powerKw: room.currentPowerKw,
        energyKwh: room.todayKwh,
        voltage: +(220 + (Math.random() - 0.5) * 20).toFixed(1),
        current: +(room.currentPowerKw * 1000 / 230).toFixed(1),
        temperature: +(25 + Math.random() * 10).toFixed(1),
        humidity: +(45 + Math.random() * 25).toFixed(0),
        isSimulated: true
      });
    }
  });

  // Update device lastSeen
  data.devices.forEach(d => {
    if (d.status === 'online') d.lastSeen = now;
  });

  // Don't call db.save() on every tick to reduce disk I/O
  // Save periodically
  if (Math.random() < 0.1) db.save();
}, 15000);

// Serve static files
const clientDist = path.join(__dirname, '../dist');
const publicDir = path.join(__dirname, '../client/public');
app.use(express.static(clientDist));
app.use(express.static(publicDir));

app.get('*', (req, res, next) => {
  if (req.path.startsWith('/api') || req.path.startsWith('/ws')) return next();
  res.sendFile(path.join(clientDist, 'index.html'));
});

// Global Sanitized Error Handler (Never leaks internal stack traces to clients)
app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('[Application Error]', err?.message || err);
  const statusCode = typeof err.status === 'number' && err.status >= 400 && err.status < 600 ? err.status : 500;
  res.status(statusCode).json({
    success: false,
    message: statusCode === 500
      ? 'An internal system error occurred. Action logged for institutional review.'
      : (err.message || 'Request could not be processed.')
  });
});

// Initialize
async function start() {
  const dataDir = fs.existsSync(path.join(__dirname, '../data'))
    ? path.join(__dirname, '../data')
    : path.join(__dirname, 'data');
  const dbPath = path.join(dataDir, 'campus-db.json');
  const backupPath = path.join(dataDir, 'campus-db.backup.json');

  // Safe automated backup to prevent ANY data loss
  if (fs.existsSync(dbPath)) {
    try {
      fs.copyFileSync(dbPath, backupPath);
      console.log('[Safe Persistence] Verified database backup at', backupPath);
    } catch { /* backup notice */ }
  } else {
    // Only seed if database does not exist
    await seedMITSDatabase();
  }

  server.listen(PORT, () => {
    console.log(`⚡ MITS Gwalior Energy System running at http://localhost:${PORT}`);
  });
}

// Graceful shutdown handling
function gracefulShutdown(signal: string) {
  console.log(`[Server] Received ${signal}. Initiating graceful shutdown...`);
  db.save();
  wss.close(() => {
    console.log('[WebSocket] Connection pool closed.');
  });
  server.close(() => {
    console.log('[HTTP] Server terminated gracefully.');
    process.exit(0);
  });
  setTimeout(() => {
    console.error('[Server] Forced shutdown due to timeout.');
    process.exit(1);
  }, 5000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

if (!process.env.VERCEL) {
  start().catch(err => {
    console.error('Failed to start server:', err);
    process.exit(1);
  });
}

export { app, server };
export default app;
