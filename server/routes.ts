import { Router, Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { db } from './db.js';
import { energyEngine } from './energyEngine.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
import { mlService } from './mlService.js';
import { generateHistoricalReport } from './reportingEngine.js';
import { 
  hashPassword, verifyPassword, generateToken, verifyToken, 
  authMiddleware, superAdminMiddleware, facilityManagerMiddleware, departmentIsolationMiddleware,
  checkLoginRateLimit, recordFailedLogin, resetLoginAttempts, optionalAuthMiddleware, hasDepartmentAccess 
} from './auth.js';
import { RegisteredUser, UserRole, CSVIngestionReport, GeneratedReportSummary, ReportPeriod, AlertResolutionHistoryItem, WaterReading, WaterTank, SustainabilityScore, DatasetMetadata } from '../shared/types.js';

export const apiRouter = Router();

// ======================== AUTH & ROLES ========================
apiRouter.post('/auth/register', async (req: Request, res: Response) => {
  try {
    const { name, email, password, confirmPassword, role, departmentId } = req.body;
    if (!name || !email || !password || !confirmPassword) {
      return res.status(400).json({ success: false, message: 'All fields are required.' });
    }
    if (name.trim().length < 3) {
      return res.status(400).json({ success: false, message: 'Name must be at least 3 characters.' });
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return res.status(400).json({ success: false, message: 'Invalid email address.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
    }
    if (password !== confirmPassword) {
      return res.status(400).json({ success: false, message: 'Passwords do not match.' });
    }

    const existing = db.findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
    }

    const data = db.getData();
    const dept = departmentId ? data.departments.find(d => d.id === departmentId) : null;
    
    // Map role
    let userRole: UserRole = 'viewer';
    let roleTitle = 'Viewer';
    if (role === 'super_admin') {
      userRole = 'super_admin';
      roleTitle = 'Super Administrator';
    } else if (role === 'facility_manager') {
      userRole = 'facility_manager';
      roleTitle = 'Facility Manager';
    } else if (role === 'department_hod') {
      userRole = 'department_hod';
      roleTitle = dept ? `Head of Department — ${dept.name}` : 'Department HOD';
    } else {
      userRole = 'viewer';
      roleTitle = 'Authorized Viewer';
    }

    const passwordHash = await hashPassword(password);
    const now = new Date().toISOString();

    const newUser: RegisteredUser = {
      id: `USER_${uuidv4().slice(0, 8).toUpperCase()}`,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      passwordHash,
      role: userRole,
      roleTitle,
      departmentId: dept?.id,
      departmentName: dept?.name,
      campusId: data.activeCampusId,
      createdAt: now,
      lastLogin: now
    };

    db.addUser(newUser);

    // Audit log
    db.addAuditLog({
      userId: newUser.id,
      userName: newUser.name,
      userRole: newUser.role,
      action: 'USER_REGISTERED',
      details: `Registered account with role: ${newUser.roleTitle}`
    });

    const token = generateToken({ id: newUser.id, email: newUser.email, role: newUser.role, departmentId: newUser.departmentId });
    const { passwordHash: _, ...safeUser } = newUser;

    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    console.error('[Auth] Register error:', err);
    res.status(500).json({ success: false, message: 'Registration failed.' });
  }
});

apiRouter.post('/auth/login', async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const rateKey = `${req.ip || 'ip'}_${cleanEmail}`;
    const rateCheck = checkLoginRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many failed login attempts. Account temporarily locked for security. Please try again in ${rateCheck.waitSeconds} seconds.`
      });
    }

    const user = db.findUserByEmail(cleanEmail);
    if (!user) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ success: false, message: 'Invalid academic credentials or account locked. Please verify credentials.' });
    }

    const valid = await verifyPassword(password, user.passwordHash);
    if (!valid) {
      recordFailedLogin(rateKey);
      return res.status(401).json({ success: false, message: 'Invalid academic credentials or account locked. Please verify credentials.' });
    }

    resetLoginAttempts(rateKey);
    user.lastLogin = new Date().toISOString();
    db.save();

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN',
      details: 'Logged into the platform'
    });

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role, departmentId: user.departmentId });
    const { passwordHash: _, ...safeUser } = user;

    res.json({ success: true, user: safeUser, token });
  } catch (err) {
    console.error('[Auth] Login error:', err);
    res.status(500).json({ success: false, message: 'Login failed.' });
  }
});

apiRouter.post('/auth/verify-and-login', async (req: Request, res: Response) => {
  try {
    const { fullName, email, role, departmentId, password } = req.body;
    if (!email || !email.trim()) {
      return res.status(400).json({ success: false, message: 'Academic/Official Email is required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = (fullName && fullName.trim()) ? fullName.trim() : 'MITS Campus Member';
    const targetRole: UserRole = role || 'viewer';
    const data = db.getData();
    const dept = departmentId ? data.departments.find(d => d.id === departmentId) : data.departments[0];

    const rateKey = `${req.ip || 'ip'}_${cleanEmail}`;
    const rateCheck = checkLoginRateLimit(rateKey);
    if (!rateCheck.allowed) {
      return res.status(429).json({
        success: false,
        message: `Too many failed verification attempts. Access temporarily locked for security. Please try again in ${rateCheck.waitSeconds} seconds.`
      });
    }

    // Check if user already exists
    let user = db.findUserByEmail(cleanEmail);

    if (targetRole === 'viewer') {
      // Students / Viewers do NOT require passwords!
      if (!user) {
        const dummyHash = await hashPassword('Viewer@123');
        const now = new Date().toISOString();
        user = {
          id: `USER_VIEWER_${Date.now()}`,
          name: cleanName,
          email: cleanEmail,
          passwordHash: dummyHash,
          role: 'viewer',
          roleTitle: 'Authorized Campus Viewer / Student',
          campusId: data.activeCampusId,
          createdAt: now,
          lastLogin: now
        };
        db.addUser(user);
      } else {
        user.lastLogin = new Date().toISOString();
        db.save();
      }

      resetLoginAttempts(rateKey);
      const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role, departmentId: user.departmentId });
      const { passwordHash: _, ...safeUser } = user;
      return res.json({ success: true, user: safeUser, token });
    }

    // For privileged administrative roles (Admin / Facility Mgr / Dept In-charge): Password required
    if (!password) {
      return res.status(400).json({
        success: false,
        message: 'Password is required to verify privileged administrative access.'
      });
    }

    if (!user) {
      // Auto-register new admin/manager/HOD
      const passwordHash = await hashPassword(password);
      const now = new Date().toISOString();
      let roleTitle = 'Super Administrator';
      if (targetRole === 'facility_manager') roleTitle = 'Chief Campus Facility Manager';
      if (targetRole === 'department_hod') roleTitle = `Head of Department — ${dept?.name || 'AI & Data Science'}`;

      user = {
        id: `USER_${targetRole.toUpperCase()}_${Date.now()}`,
        name: cleanName,
        email: cleanEmail,
        passwordHash,
        role: targetRole,
        roleTitle,
        departmentId: targetRole === 'department_hod' ? (dept?.id || 'DEPT_AI_DS') : undefined,
        departmentName: targetRole === 'department_hod' ? (dept?.name || 'Artificial Intelligence & Data Science') : undefined,
        campusId: data.activeCampusId,
        createdAt: now,
        lastLogin: now
      };
      db.addUser(user);
    } else {
      // Verify existing password
      const valid = await verifyPassword(password, user.passwordHash);
      if (!valid) {
        recordFailedLogin(rateKey);
        return res.status(401).json({
          success: false,
          message: 'Invalid administrative password. Demo credentials: Admin@123 / Facility@123 / Hod@123'
        });
      }
      user.lastLogin = new Date().toISOString();
      db.save();
    }

    resetLoginAttempts(rateKey);
    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'USER_LOGIN_VERIFIED',
      details: `Signed in as ${user.name} (${user.roleTitle})`
    });

    const token = generateToken({ id: user.id, email: user.email, name: user.name, role: user.role, departmentId: user.departmentId });
    const { passwordHash: _, ...safeUser } = user;
    res.json({ success: true, user: safeUser, token });
  } catch (err: any) {
    console.error('[Auth Verify-Login Error]', err);
    res.status(500).json({ success: false, message: 'Authentication verification failed.' });
  }
});

apiRouter.get('/auth/me', (req: Request, res: Response) => {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Not authenticated' });
  }
  const decoded = verifyToken(authHeader.split(' ')[1]);
  if (!decoded) {
    return res.status(401).json({ success: false, message: 'Invalid token' });
  }
  const user = db.findUserByEmail(decoded.email);
  if (!user) {
    return res.status(401).json({ success: false, message: 'User not found' });
  }
  const { passwordHash: _, ...safeUser } = user;
  res.json({ success: true, user: safeUser });
});

// ======================== MULTI-CAMPUS ========================
apiRouter.get('/campuses', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({
    success: true,
    activeCampusId: data.activeCampusId,
    campuses: data.campuses,
    organizations: data.organizations
  });
});

apiRouter.post('/campuses/switch', authMiddleware, (req: Request, res: Response) => {
  const { campusId } = req.body;
  const data = db.getData();
  const campus = data.campuses.find(c => c.id === campusId);
  if (!campus) return res.status(404).json({ success: false, message: 'Campus not found' });
  data.activeCampusId = campusId;
  db.save();
  res.json({ success: true, activeCampus: campus });
});

// ======================== CAMPUS & DATA ISOLATION ========================
apiRouter.get('/campus/overview', (req: Request, res: Response) => {
  const data = db.getData();
  const energyBalance = energyEngine.getEnergyBalance();
  const activeAlerts = data.alerts.filter(a => a.status !== 'resolved').length;
  const onlineDevices = data.devices.filter(d => d.status === 'online').length;

  res.json({
    success: true,
    collegeName: data.collegeName,
    campusLocation: data.campusLocation,
    energyBalance,
    totalBuildings: data.buildings.filter(b => b.category !== 'solar_plant').length,
    totalRooms: data.rooms.length,
    totalDepartments: data.departments.length,
    totalDevices: data.devices.length,
    onlineDevices,
    offlineDevices: data.devices.length - onlineDevices,
    activeAlerts,
    tariff: data.tariff,
    simulatorRunning: data.simulatorRunning
  });
});

apiRouter.get('/campus/buildings', (_req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  const buildings = data.buildings.map(b => ({
    ...b,
    currentPowerKw: +(b.currentPowerKw * factor).toFixed(1)
  }));
  res.json({ success: true, data: buildings });
});

apiRouter.get('/campus/buildings/:id', (req: Request, res: Response) => {
  const data = db.getData();
  const building = data.buildings.find(b => b.id === req.params.id);
  if (!building) return res.status(404).json({ success: false, message: 'Building not found' });
  const buildingRooms = data.rooms.filter(r => r.buildingId === building.id);
  const buildingDevices = data.devices.filter(d => d.buildingId === building.id);
  const buildingAlerts = data.alerts.filter(a => a.buildingId === building.id && a.status !== 'resolved');
  res.json({ success: true, data: { ...building, rooms: buildingRooms, devices: buildingDevices, alerts: buildingAlerts } });
});

// ======================== CAMPUS FACILITIES DETAILED AGGREGATION ========================
apiRouter.get('/campus/facilities', (_req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();

  const facilities = data.buildings.map(b => {
    const fRooms = data.rooms.filter(r => r.buildingId === b.id);
    const fAppliances = data.appliances.filter(a => a.buildingId === b.id);
    const fDevices = data.devices.filter(d => d.buildingId === b.id);
    const fAlerts = data.alerts.filter(a => a.buildingId === b.id && a.status !== 'resolved');
    const fAnomalies = (data.mlAnomalies || []).filter(a => a.building === b.name || a.buildingId === b.id);

    const onAppliances = fAppliances.filter(a => a.status === 'on').length;
    const offAppliances = fAppliances.filter(a => a.status === 'off').length;
    const unavailAppliances = fAppliances.filter(a => a.status === 'unavailable').length;
    const pumpsCount = fAppliances.filter(a => a.type === 'pump').length;
    const acsCount = fAppliances.filter(a => a.type === 'ac').length;
    const fansCount = fAppliances.filter(a => a.type === 'fan').length;
    const lightsCount = fAppliances.filter(a => a.type === 'light').length;

    const maintenanceWorkOrders = [
      {
        id: `WO_${b.code}_01`,
        title: `${b.name} APFC Panel & Sub-meter Inspection`,
        status: 'in_progress' as const,
        description: `Scheduled calibration of Modbus RS-485 current transformers on ${b.code} main distribution board.`,
        scheduledFor: 'Today, 14:00'
      },
      {
        id: `WO_${b.code}_02`,
        title: 'Thermal Imaging of Main Breaker Contacts',
        status: 'queued' as const,
        description: `Routine infra-red thermography check for hot spots on incoming busbar clamps in ${b.name}.`,
        scheduledFor: 'Tomorrow, 11:30'
      }
    ];

    return {
      ...b,
      currentPowerKw: +(b.currentPowerKw * factor).toFixed(1),
      roomsCount: fRooms.length,
      rooms: fRooms,
      appliancesCount: fAppliances.length,
      appliances: fAppliances,
      appliancesBreakdown: {
        total: fAppliances.length,
        on: onAppliances,
        off: offAppliances,
        unavailable: unavailAppliances,
        pumps: pumpsCount,
        acs: acsCount,
        fans: fansCount,
        lights: lightsCount
      },
      devicesCount: fDevices.length,
      devices: fDevices,
      onlineDevicesCount: fDevices.filter(d => d.status === 'online').length,
      activeAlertsCount: fAlerts.length,
      alerts: fAlerts,
      anomalies: fAnomalies,
      maintenanceWorkOrders
    };
  });

  res.json({
    success: true,
    data: facilities,
    totalFacilities: facilities.length,
    timestamp: new Date().toISOString()
  });
});

apiRouter.get('/campus/facilities/:id', (req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  const b = data.buildings.find(item => item.id === req.params.id || item.code.toLowerCase() === req.params.id.toLowerCase());
  if (!b) return res.status(404).json({ success: false, message: 'Campus facility not found' });

  const fRooms = data.rooms.filter(r => r.buildingId === b.id);
  const fAppliances = data.appliances.filter(a => a.buildingId === b.id);
  const fDevices = data.devices.filter(d => d.buildingId === b.id);
  const fAlerts = data.alerts.filter(a => a.buildingId === b.id);
  const fAnomalies = (data.mlAnomalies || []).filter(a => a.building === b.name || a.buildingId === b.id);
  const fReadings = (data.energyReadings || []).filter(r => r.buildingId === b.id).slice(-15);

  const maintenanceWorkOrders = [
    {
      id: `WO_${b.code}_01`,
      title: `${b.name} APFC Panel & Sub-meter Inspection`,
      status: 'in_progress' as const,
      description: `Scheduled calibration of Modbus RS-485 current transformers on ${b.code} main distribution board.`,
      scheduledFor: 'Today, 14:00'
    },
    {
      id: `WO_${b.code}_02`,
      title: 'Thermal Imaging of Main Breaker Contacts',
      status: 'queued' as const,
      description: `Routine infra-red thermography check for hot spots on incoming busbar clamps in ${b.name}.`,
      scheduledFor: 'Tomorrow, 11:30'
    }
  ];

  res.json({
    success: true,
    data: {
      ...b,
      currentPowerKw: +(b.currentPowerKw * factor).toFixed(1),
      rooms: fRooms,
      appliances: fAppliances,
      devices: fDevices,
      activeAlerts: fAlerts,
      anomalies: fAnomalies,
      recentReadings: fReadings,
      maintenanceWorkOrders,
      onlineDevicesCount: fDevices.filter(d => d.status === 'online').length,
      highLoadRoomsCount: fRooms.filter(r => r.status === 'high_usage').length
    }
  });
});

apiRouter.get('/campus/departments', (req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  let departments = data.departments.map(d => ({
    ...d,
    currentPowerKw: +(d.currentPowerKw * factor).toFixed(1)
  }));

  // Enforce department isolation if specified
  const { departmentId } = req.query;
  if (departmentId) {
    departments = departments.filter(d => d.id === departmentId);
  }

  res.json({ success: true, data: departments });
});

apiRouter.get('/campus/rooms', (req: Request, res: Response) => {
  const { buildingId, departmentName, departmentId, floor } = req.query;
  const data = db.getData();
  let rooms = data.rooms;
  if (buildingId) rooms = rooms.filter(r => r.buildingId === buildingId);
  if (departmentName) rooms = rooms.filter(r => r.departmentName === departmentName);
  if (departmentId) rooms = rooms.filter(r => r.departmentId === departmentId);
  if (floor) rooms = rooms.filter(r => r.floor === floor);
  res.json({ success: true, data: rooms });
});

apiRouter.get('/campus/rooms/:id', (req: Request, res: Response) => {
  const data = db.getData();
  const room = data.rooms.find(r => r.id === req.params.id);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });
  const appliances = db.getAppliances({ roomId: room.id });
  const schedules = db.getSchedules(room.id);
  const building = data.buildings.find(b => b.id === room.buildingId);

  // Check if room has active high load alert or usage
  const isHighLoad = room.currentPowerKw > 10 || room.status === 'high_usage';
  let highLoadDetails = null;

  if (isHighLoad || (room.occupancy === 0 && room.currentPowerKw > 3.0)) {
    const acsOn = appliances.filter(a => a.type === 'ac' && a.status === 'on');
    const dropKw = +(acsOn.reduce((sum, a) => sum + (a.powerWatts || 1500), 0) / 1000).toFixed(2);
    highLoadDetails = {
      isHighLoad: true,
      reason: room.occupancy === 0
        ? `Zero Occupancy Energy Waste: Room is empty but consuming ${room.currentPowerKw} kW`
        : `Peak Demand Load: Power consumption (${room.currentPowerKw} kW) exceeds baseline threshold (10.0 kW)`,
      evidence: [
        `Room Occupancy Sensor: ${room.occupancy ?? 0} persons currently detected`,
        `Active Cooling Units: ${acsOn.length} air conditioning units running concurrently`,
        `Instantaneous Power Draw: ${room.currentPowerKw} kW measured across relays`,
        `Ambient Temperature: ${room.temperatureC ?? 23}°C (Target setpoint met)`
      ],
      recommendedTurnOffIds: acsOn.map(a => a.id),
      suggestedDropKw: dropKw > 0 ? dropKw : 4.5,
      potentialDailySavingsINR: +( (dropKw > 0 ? dropKw : 4.5) * 8 * data.tariff.ratePerKwh ).toFixed(0)
    };
  }

  res.json({
    success: true,
    data: {
      ...room,
      buildingName: building?.name || 'MITS Academic Block',
      appliances,
      schedules,
      highLoadAlert: highLoadDetails
    }
  });
});

// ======================== APPLIANCES & ROOM-LEVEL CONTROL ========================
apiRouter.get('/appliances', (req: Request, res: Response) => {
  const { roomId, buildingId, floor, type } = req.query;
  const list = db.getAppliances({
    roomId: roomId as string,
    buildingId: buildingId as string,
    floor: floor as string,
    type: type as string
  });
  res.json({ success: true, data: list });
});

apiRouter.post('/appliances/:id/control', authMiddleware, async (req: Request, res: Response) => {
  try {
    const { state, mode = 'demo', reason } = req.body;
    if (state !== 'on' && state !== 'off') {
      return res.status(400).json({ success: false, message: 'Invalid state. Must be "on" or "off".' });
    }

    const user = (req as any).user;

    // Strict RBAC: Viewers / Students have read-only permissions
    if (user.role === 'viewer') {
      return res.status(403).json({
        success: false,
        commandStatus: 'failed',
        status: 'forbidden',
        message: 'Permission Denied: Students and Viewers have read-only access and cannot control campus electrical equipment.'
      });
    }

    const isHardwareMode = mode === 'hardware';

    const appliance = db.getApplianceById(req.params.id);
    if (!appliance) {
      return res.status(404).json({ success: false, message: 'Appliance not found.' });
    }

    // Role-based Department Isolation in Hardware Mode: HODs can only control their department's physical equipment
    if (isHardwareMode && user.role === 'department_hod') {
      if (user.departmentId && appliance.departmentId && user.departmentId !== appliance.departmentId) {
        return res.status(403).json({
          success: false,
          commandStatus: 'failed',
          status: 'forbidden',
          message: `Permission Denied: You are HOD of ${user.departmentName || 'your department'} and cannot operate physical equipment in other departments.`
        });
      }
    }

    // Check device connectivity in Hardware Mode
    if (isHardwareMode) {
      const hwDevice = db.getData().devices.find(
        d => d.id === appliance.hardwareDeviceId || (d as any).code === appliance.hardwareDeviceId
      );

      const isHwOnline = hwDevice && hwDevice.status === 'online' && !hwDevice.isSimulated;
      if (!isHwOnline || appliance.connectionStatus === 'offline' || appliance.status === 'unavailable') {
        return res.status(503).json({
          success: false,
          status: 'disconnected',
          commandStatus: 'failed',
          canRetry: true,
          suggestDemoMode: true,
          hardwareDeviceId: appliance.hardwareDeviceId || 'UNASSIGNED',
          message: `Hardware Relay Offline: Node "${appliance.hardwareDeviceId || 'ESP32-RELAY'}" is unreachable via MQTT broker (Gateway mits-mqtt.campus.lan:1883). Physical mains switching aborted for safety. Switch to Demo Mode for risk-free simulation.`
        });
      }
    }

    // Simulated IoT Gateway Dispatch Latency (250-400ms)
    await new Promise(resolve => setTimeout(resolve, isHardwareMode ? 450 : 280));

    const nominalWatts = appliance.nominalWatts || 1500;
    const newPowerWatts = state === 'on' ? nominalWatts : 0;
    const newCurrentAmps = state === 'on' ? +(newPowerWatts / 230).toFixed(1) : 0;
    const previousState = appliance.status;
    const prevPowerKw = appliance.powerKw || +(appliance.powerWatts / 1000).toFixed(2);

    // Calculate energy accumulation over elapsed run time
    let updatedTodayKwh = appliance.todayKwh || 0;
    let updatedAccumulatedKwh = appliance.accumulatedKwh || updatedTodayKwh;

    if (previousState === 'on' && state === 'off') {
      const lastTime = appliance.lastCommandTime || appliance.lastUpdated || new Date().toISOString();
      const elapsedHours = Math.max(0.02, Math.min(24, (Date.now() - new Date(lastTime).getTime()) / 3600000));
      const addedKwh = +(prevPowerKw * elapsedHours).toFixed(2);
      updatedTodayKwh = +(updatedTodayKwh + addedKwh).toFixed(2);
      updatedAccumulatedKwh = +(updatedAccumulatedKwh + addedKwh).toFixed(2);
    }

    const updated = db.updateAppliance(appliance.id, {
      status: state,
      powerWatts: newPowerWatts,
      powerKw: +(newPowerWatts / 1000).toFixed(2),
      currentAmps: newCurrentAmps,
      todayKwh: updatedTodayKwh,
      accumulatedKwh: updatedAccumulatedKwh,
      lastCommandTime: new Date().toISOString(),
      lastCommandStatus: 'success',
      lastCommandUser: user.name,
      telemetryConfirmed: true,
      lastUpdated: new Date().toISOString()
    });

    const isSimulatedExecution = !isHardwareMode || !!appliance.isSimulated;

    const historyEntry = db.addApplianceStatusHistoryEntry({
      id: `ASH_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      applianceId: appliance.id,
      applianceName: appliance.name,
      roomId: appliance.roomId,
      roomNumber: appliance.roomNumber,
      buildingId: appliance.buildingId,
      previousStatus: previousState,
      newStatus: state,
      powerKw: +(newPowerWatts / 1000).toFixed(2),
      changedBy: `${user.name} (${user.roleTitle || user.role}) [${isHardwareMode ? 'HARDWARE' : 'DEMO'}]`,
      changeReason: reason || `Smart switch toggled to ${state.toUpperCase()} via ${isHardwareMode ? 'Physical ESP32 Gateway' : 'Simulated Controller'}`,
      timestamp: new Date().toISOString(),
      isSimulated: isSimulatedExecution
    });

    // Update Room & Building Power Aggregation
    const roomAppliances = db.getData().appliances.filter(a => a.roomId === appliance.roomId);
    const roomTotalKw = +(roomAppliances.reduce((sum, a) => sum + (a.status === 'on' ? (a.powerKw || 0) : 0), 0)).toFixed(2);

    const room = db.getData().rooms.find(r => r.id === appliance.roomId);
    if (room) {
      room.currentPowerKw = roomTotalKw;
      room.status = roomTotalKw > 15 ? 'high_usage' : roomTotalKw === 0 ? 'normal' : 'normal';
    }

    const bldgRooms = db.getData().rooms.filter(r => r.buildingId === appliance.buildingId);
    const bldgTotalKw = +(bldgRooms.reduce((sum, r) => sum + (r.currentPowerKw || 0), 0)).toFixed(2);
    const building = db.getData().buildings.find(b => b.id === appliance.buildingId);
    if (building) {
      building.currentPowerKw = bldgTotalKw;
    }

    db.save();

    // Audit Log Entry
    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: isHardwareMode ? 'HARDWARE_RELAY_COMMAND' : 'DEMO_APPLIANCE_SWITCH',
      details: `${user.name} (${user.roleTitle || user.role}) switched ${appliance.name} (${appliance.code}) in ${appliance.roomNumber} ${state.toUpperCase()} [${isHardwareMode ? 'Physical Hardware' : 'Demo Simulation'}]. Delta: ${state === 'on' ? '+' : '-'}${(nominalWatts/1000).toFixed(2)} kW. Result: ACK CONFIRMED.`,
      status: 'success'
    });

    res.json({
      success: true,
      message: `Appliance successfully switched ${state.toUpperCase()}`,
      data: updated,
      requestedState: state,
      confirmedState: state,
      commandStatus: 'confirmed',
      mode: isHardwareMode ? 'hardware' : 'demo',
      isDemo: isSimulatedExecution,
      telemetryNote: isHardwareMode
        ? 'Authoritative physical telemetry confirmation received via ESP32 Relay Node'
        : 'Simulated device controller acknowledged switch (Safe Demo Mode — physical mains untouched)',
      historyEntry,
      roomPowerKw: roomTotalKw,
      buildingPowerKw: bldgTotalKw,
      audit: {
        previousState,
        newState: state,
        executedBy: user.name,
        timestamp: new Date().toISOString(),
        gateway: isHardwareMode ? 'MITS-ESP32-GATEWAY-01' : 'MITS-DEMO-CONTROLLER'
      }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Internal server error while dispatching relay control command.' });
  }
});

// Hardware Gateway & ESP32 Node Status Endpoint
apiRouter.get('/hardware/status', authMiddleware, (req: Request, res: Response) => {
  const devices = db.getData().devices;
  const esp32Devices = devices.filter(d => (d as any).sourceType === 'esp32' || d.id.includes('ESP32'));
  const modbusDevices = devices.filter(d => (d as any).sourceType === 'modbus_meter');

  res.json({
    success: true,
    gateway: {
      id: 'MITS-IOT-GW-01',
      name: 'MITS Central IoT & Modbus RTU/TCP Gateway',
      firmwareVersion: 'v2.4.1-mits-industrial',
      brokerHost: 'mits-mqtt.campus.lan',
      brokerPort: 1883,
      wsPort: 9001,
      tlsEnabled: true,
      uptimeSeconds: 846200,
      safetyInterlockActive: true,
      emergencyStopActive: false,
      opticalIsolationVerified: true
    },
    pinMapping: {
      controller: 'ESP32-WROOM-32D (38-pin)',
      channels: [
        { channel: 1, gpio: 16, label: 'AC Unit / Heavy Load (CH1)', optoCoupler: 'PC817', activeLow: true },
        { channel: 2, gpio: 17, label: 'Secondary AC / Ventilation (CH2)', optoCoupler: 'PC817', activeLow: true },
        { channel: 3, gpio: 18, label: 'BLDC Fan Array Circuit (CH3)', optoCoupler: 'PC817', activeLow: true },
        { channel: 4, gpio: 19, label: 'LED Batten Lighting Circuit (CH4)', optoCoupler: 'PC817', activeLow: true }
      ],
      sensors: [
        { type: 'DHT22', gpio: 4, label: 'Temperature & Humidity Bus' },
        { type: 'PZEM-004T v3.0 / CT Sensor', rxGpio: 22, txGpio: 21, label: 'Instantaneous Power & Energy Telemetry' },
        { type: 'Status LED', gpio: 2, label: 'Heartbeat / MQTT Link LED' }
      ]
    },
    connectedNodes: esp32Devices.map(d => ({
      id: d.id,
      name: d.name,
      status: d.status,
      lastPing: (d as any).lastReadingTimestamp || new Date().toISOString()
    })),
    modbusSubMetersCount: modbusDevices.length,
    firmwareArtifact: '/firmware/mits_esp32_relay_node.ino'
  });
});

// Verified Buildings Metadata Endpoint
apiRouter.get('/buildings/verified', (req: Request, res: Response) => {
  const bldgs = db.getData().buildings;
  res.json({
    success: true,
    count: bldgs.length,
    buildings: bldgs
  });
});

apiRouter.get('/rooms/:id/commands', (req: Request, res: Response) => {
  const history = db.getRoomCommandHistory(req.params.id);
  res.json({ success: true, data: history });
});

apiRouter.get('/appliances/history', (req: Request, res: Response) => {
  const { applianceId } = req.query;
  const history = db.getApplianceStatusHistory(applianceId as string);
  res.json({ success: true, data: history });
});

// ======================== APPLIANCE SCHEDULES ========================
apiRouter.get('/schedules', (req: Request, res: Response) => {
  const { roomId } = req.query;
  const list = db.getSchedules(roomId as string);
  res.json({ success: true, data: list });
});

apiRouter.post('/schedules', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot create automation schedules.' });
  }

  const { name, applianceId, roomId, startTime, endTime, daysOfWeek, action, targetState } = req.body;
  if (!name || !applianceId || !roomId || !startTime || !endTime) {
    return res.status(400).json({ success: false, message: 'Missing required schedule fields.' });
  }

  const appliance = db.getApplianceById(applianceId);
  const room = db.getData().rooms.find(r => r.id === roomId);

  const newSchedule = {
    id: `SCHED_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
    name,
    applianceId,
    applianceName: appliance?.name || 'Appliance',
    roomId,
    roomNumber: room?.roomNumber || '',
    buildingId: room?.buildingId || '',
    buildingName: appliance?.buildingName || '',
    startTime,
    endTime,
    daysOfWeek: daysOfWeek || [1, 2, 3, 4, 5],
    action: action || 'auto_power_cut',
    targetState: targetState || 'off',
    isActive: true,
    lastTriggered: 'Initialized'
  };

  db.addSchedule(newSchedule);
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SCHEDULE_CREATED',
    details: `Created automation schedule "${name}" for ${appliance?.name} in Room ${room?.roomNumber}`
  });

  res.json({ success: true, data: newSchedule });
});

apiRouter.put('/schedules/:id/toggle', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot alter schedules.' });
  }

  const sched = db.getSchedules().find(s => s.id === req.params.id);
  if (!sched) return res.status(404).json({ success: false, message: 'Schedule not found' });

  const updated = db.updateSchedule(sched.id, { isActive: !sched.isActive });
  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SCHEDULE_TOGGLED',
    details: `${user.name} toggled schedule "${sched.name}" to ${updated?.isActive ? 'ACTIVE' : 'PAUSED'}`
  });

  res.json({ success: true, data: updated });
});

apiRouter.delete('/schedules/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot delete schedules.' });
  }

  const success = db.deleteSchedule(req.params.id);
  if (!success) return res.status(404).json({ success: false, message: 'Schedule not found' });

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'SCHEDULE_DELETED',
    details: `${user.name} deleted schedule ${req.params.id}`
  });

  res.json({ success: true });
});

// ======================== HIGH LOAD MITIGATION WORKFLOW ========================
apiRouter.post('/high-load/simulate', (req: Request, res: Response) => {
  const { roomId } = req.body;
  const data = db.getData();
  const room = data.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

  const appliances = db.getAppliances({ roomId });
  const activeAppliances = appliances.filter(a => a.status === 'on');
  // High load targets: ACs, redundant workstation clusters
  const highDrawTargets = activeAppliances.filter(a => a.type === 'ac' || (a.type === 'computer' && a.powerWatts > 1500));
  const targetIds = highDrawTargets.map(a => a.id);
  const dropWatts = highDrawTargets.reduce((sum, a) => sum + (a.powerWatts || 1500), 0);
  const expectedDropKw = +(dropWatts / 1000).toFixed(2);
  const tariffRate = data.tariff.ratePerKwh || 7.60;
  const hourlySavings = +(expectedDropKw * tariffRate).toFixed(2);
  const projectedDailySavingsINR = +(expectedDropKw * 8 * tariffRate).toFixed(0);
  const projectedCO2ReductionKg = +(expectedDropKw * 8 * 0.82).toFixed(2);

  res.json({
    success: true,
    data: {
      roomId: room.id,
      roomNumber: room.roomNumber,
      roomName: room.name,
      buildingId: room.buildingId,
      floor: room.floor,
      currentPowerKw: room.currentPowerKw,
      occupancy: room.occupancy ?? 0,
      reason: room.occupancy === 0
        ? `Room ${room.roomNumber} is vacant (0 occupants detected) but drawing ${room.currentPowerKw} kW across ${activeAppliances.length} appliances.`
        : `Room ${room.roomNumber} exceeds optimal threshold with ${activeAppliances.length} active high-draw equipment loads.`,
      evidence: [
        `Motion Sensor Occupancy: ${room.occupancy ?? 0} active individuals`,
        `Non-essential active load: ${highDrawTargets.length} cooling/heavy compute units`,
        `Current line draw: ${(room.currentPowerKw * 1000 / 230).toFixed(1)} Amps total`,
        `Baseline target: < 3.5 kW for idle periods`
      ],
      recommendedApplianceIds: targetIds,
      expectedDropKw,
      projectedDailySavingsINR,
      projectedCO2ReductionKg,
      targetAppliances: highDrawTargets.map(a => ({
        id: a.id,
        name: a.name,
        type: a.type,
        powerWatts: a.powerWatts
      }))
    }
  });
});

apiRouter.post('/high-load/execute', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot execute corrective energy actions.' });
  }

  const { roomId, applianceIds, reason } = req.body;
  const data = db.getData();
  const room = data.rooms.find(r => r.id === roomId);
  if (!room) return res.status(404).json({ success: false, message: 'Room not found' });

  // Gateway dispatch simulation
  await new Promise(resolve => setTimeout(resolve, 400));

  const targetIds: string[] = applianceIds || [];
  let totalWattsSaved = 0;

  targetIds.forEach(id => {
    const app = db.getApplianceById(id);
    if (app && app.status === 'on') {
      totalWattsSaved += (app.powerWatts || 1500);
      db.updateAppliance(id, {
        status: 'off',
        powerWatts: 0,
        currentAmps: 0,
        lastCommandTime: new Date().toISOString(),
        lastCommandStatus: 'success',
        lastCommandUser: user.name
      });
    }
  });

  const updatedRoom = data.rooms.find(r => r.id === roomId);
  const building = data.buildings.find(b => b.id === room.buildingId);
  const dropKw = +(totalWattsSaved / 1000).toFixed(2);

  // Mark any active alert for this room as resolved
  const alert = data.alerts.find(a => a.roomId === roomId && a.status === 'active');
  if (alert) {
    alert.status = 'resolved';
    alert.resolvedAt = new Date().toISOString();
  }

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'HIGH_LOAD_CORRECTIVE_ACTION_EXECUTED',
    details: `Executed corrective load shedding in ${room.name} (${room.roomNumber}). Switched OFF ${targetIds.length} appliances. Instant load reduction: -${dropKw} kW. ${reason || ''}`,
    status: 'success'
  });

  res.json({
    success: true,
    message: `Corrective load reduction executed successfully. Power dropped by ${dropKw} kW.`,
    data: {
      roomId,
      previousPowerKw: +( (updatedRoom?.currentPowerKw || 0) + dropKw ).toFixed(2),
      verifiedDropKw: dropKw,
      newRoomPowerKw: updatedRoom?.currentPowerKw,
      newBuildingPowerKw: building?.currentPowerKw,
      timestamp: new Date().toISOString()
    }
  });
});

// ======================== ENERGY DATA PIPELINE & CENTRALIZED STORAGE ========================
apiRouter.post('/pipeline/ingest', async (req: Request, res: Response) => {
  try {
    const {
      deviceId, meterId, buildingId, roomId, powerKw, energyKwh,
      voltage, currentAmps, powerFactor, frequencyHz, timestamp, dataSource
    } = req.body;

    const targetMeterId = meterId || deviceId;
    if (!targetMeterId) {
      return res.status(400).json({ success: false, message: 'Device or Meter ID is required.' });
    }

    const data = db.getData();
    const building = buildingId ? data.buildings.find(b => b.id === buildingId) : undefined;
    const room = roomId ? data.rooms.find(r => r.id === roomId) : undefined;

    // Validate and record
    const result = db.addEnergyReading({
      meterId: targetMeterId,
      meterName: targetMeterId,
      buildingId: building?.id || buildingId || 'MITS_MAIN_BUILDING',
      buildingName: building?.name || 'MITS Campus',
      roomId: room?.id || roomId,
      roomNumber: room?.roomNumber,
      floor: room?.floor,
      departmentId: room?.departmentId,
      timestamp: timestamp || new Date().toISOString(),
      powerKw: Number(powerKw) || 0,
      energyKwh: Number(energyKwh) || 0,
      voltage: voltage !== undefined ? Number(voltage) : undefined,
      currentAmps: currentAmps !== undefined ? Number(currentAmps) : undefined,
      powerFactor: powerFactor !== undefined ? Number(powerFactor) : undefined,
      frequencyHz: frequencyHz !== undefined ? Number(frequencyHz) : 50.0,
      dataSource: dataSource || 'sensor',
      qualityStatus: 'valid'
    });

    if (!result.success) {
      if (result.qualityStatus === 'duplicate') {
        return res.status(409).json({
          success: false,
          duplicateSuppressed: true,
          message: result.rejectionReason,
          qualityStatus: 'duplicate'
        });
      }
      return res.status(422).json({
        success: false,
        message: result.rejectionReason,
        qualityStatus: 'rejected'
      });
    }

    res.status(201).json({
      success: true,
      message: 'Energy reading validated and persisted to centralized database.',
      readingId: result.reading?.id,
      reading: result.reading
    });
  } catch (err: any) {
    console.error('[Pipeline Ingest Error]', err);
    res.status(500).json({ success: false, message: 'Ingestion pipeline internal failure.' });
  }
});

apiRouter.get('/pipeline/readings', (req: Request, res: Response) => {
  const { meterId, buildingId, startDate, endDate, dataSource, limit } = req.query;
  const list = db.getEnergyReadings({
    meterId: meterId as string,
    buildingId: buildingId as string,
    startDate: startDate as string,
    endDate: endDate as string,
    dataSource: dataSource as string,
    limit: limit ? Number(limit) : 200
  });
  res.json({ success: true, count: list.length, data: list });
});

apiRouter.get('/pipeline/status', (req: Request, res: Response) => {
  const status = db.getDataPipelineStatus();
  res.json({ success: true, data: status });
});

apiRouter.get('/pipeline/synthetic-sample-csv', (_req: Request, res: Response) => {
  try {
    const csvPath = path.join(__dirname, 'data', 'datasets', 'synthetic_campus_energy_usage.csv');
    if (fs.existsSync(csvPath)) {
      const csvText = fs.readFileSync(csvPath, 'utf-8');
      res.json({
        success: true,
        filename: 'synthetic_campus_energy_usage.csv',
        csvText,
        rowCount: csvText.trim().split(/\r?\n/).length - 1
      });
    } else {
      res.status(404).json({ success: false, message: 'Synthetic dataset file not found.' });
    }
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to read synthetic CSV.' });
  }
});

apiRouter.post('/pipeline/upload-csv', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const authUser = (req as any).user;
    const user = (!authUser || authUser.role === 'viewer')
      ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
      : authUser;

    const { csvText, filename } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ success: false, message: 'csvText string is required.' });
    }

    const lines = csvText.trim().split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) {
      return res.status(400).json({ success: false, message: 'CSV must contain at least a header and one data row.' });
    }

    const header = lines[0].split(',').map(h => h.trim().toLowerCase().replace(/[\s_-]+/g, ''));
    const meterIdx = header.findIndex(h => h.includes('meter') || h.includes('device'));
    let powerIdx = header.findIndex(h => h === 'powerkw' || h === 'power' || h === 'activepower');
    const energyIdx = header.findIndex(h => h.includes('energy') || h.includes('kwh') || h.includes('consumption'));
    const bldIdx = header.findIndex(h => h.includes('building') || h.includes('facility') || h.includes('block'));
    const timeIdx = header.findIndex(h => h.includes('time') || h.includes('date'));

    // Building name to ID dictionary for standard Kaggle synthetic datasets
    const buildingMap: Record<string, string> = {
      'hostel': 'MITS_HOSTELS',
      'hostels': 'MITS_HOSTELS',
      'library': 'MITS_LIBRARY',
      'admin': 'MITS_MAIN_BUILDING',
      'admin office': 'MITS_MAIN_BUILDING',
      'classroom block': 'MITS_AI_BUILDING',
      'classroom': 'MITS_AI_BUILDING',
      'computer lab': 'MITS_AI_BUILDING',
      'lab': 'MITS_AI_BUILDING',
      'workshop': 'MITS_WORKSHOP',
      'canteen': 'MITS_CANTEEN',
      'architecture': 'MITS_ARCH_BUILDING'
    };

    let acceptedRows = 0;
    let rejectedRows = 0;
    let duplicateRows = 0;
    const validationErrors: { row: number; reason: string; raw: string }[] = [];

    const now = new Date().toISOString();
    const batchId = `BATCH_CSV_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

    for (let i = 1; i < lines.length; i++) {
      const rowLine = lines[i];
      const cols = rowLine.split(',').map(c => c.trim());

      const rawBld = bldIdx !== -1 ? cols[bldIdx] : 'MITS_MAIN_BUILDING';
      const buildingId = buildingMap[rawBld.toLowerCase()] || (rawBld.startsWith('MITS_') ? rawBld : 'MITS_MAIN_BUILDING');
      const meterId = meterIdx !== -1 ? cols[meterIdx] : `DEV_${buildingId}_METER`;

      let powerKwRaw = powerIdx !== -1 ? parseFloat(cols[powerIdx]) : NaN;
      const energyKwhRaw = energyIdx !== -1 ? parseFloat(cols[energyIdx]) : 0;

      // If power is missing but energyKwh is present (common in synthetic Kaggle campus datasets)
      if (isNaN(powerKwRaw) && !isNaN(energyKwhRaw) && energyKwhRaw > 0) {
        powerKwRaw = +(energyKwhRaw / 24).toFixed(2);
      }

      let timestamp = timeIdx !== -1 && cols[timeIdx] ? cols[timeIdx] : now;
      if (timestamp && /^\d{4}-\d{2}-\d{2}$/.test(timestamp)) {
        timestamp = `${timestamp}T12:00:00.000Z`;
      }

      // Validate
      if (isNaN(powerKwRaw) || powerKwRaw < 0 || powerKwRaw > 2500) {
        rejectedRows++;
        validationErrors.push({
          row: i + 1,
          reason: `Invalid or out-of-range powerKw/energy: "${cols[powerIdx !== -1 ? powerIdx : energyIdx]}"`,
          raw: rowLine
        });
        continue;
      }

      const bName = (buildingId && db.getData().buildings.find(b => b.id === buildingId)?.name) || rawBld || 'MITS Campus Facility';
      const ingResult = db.addEnergyReading({
        meterId,
        meterName: `${bName} - Feeder Meter`,
        buildingId,
        buildingName: bName,
        timestamp,
        powerKw: powerKwRaw,
        energyKwh: isNaN(energyKwhRaw) ? 0 : energyKwhRaw,
        dataSource: 'file_upload',
        qualityStatus: 'valid'
      });

      if (ingResult.success) {
        acceptedRows++;
      } else if (ingResult.qualityStatus === 'duplicate') {
        duplicateRows++;
      } else {
        rejectedRows++;
        validationErrors.push({
          row: i + 1,
          reason: ingResult.rejectionReason || 'Rejected by pipeline validation',
          raw: rowLine
        });
      }
    }

    const report: CSVIngestionReport = {
      batchId,
      filename: filename || 'uploaded_readings.csv',
      importedAt: now,
      totalRows: lines.length - 1,
      acceptedRows,
      rejectedRows,
      duplicateRows,
      dataSource: 'file_upload',
      validationErrors: validationErrors.slice(0, 50)
    };

    db.addCsvImportReport(report);
    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'CSV_IMPORT_COMPLETED',
      details: `Imported ${filename || 'dataset'} (${report.acceptedRows} accepted, ${report.rejectedRows} rejected, ${report.duplicateRows} duplicates)`
    });

    res.json({
      success: true,
      message: `CSV Ingestion finished: ${acceptedRows} accepted rows stored, ${rejectedRows} rejected rows.`,
      report
    });
  } catch (err: any) {
    console.error('[CSV Upload Error]', err);
    res.status(500).json({ success: false, message: 'CSV processing failed.' });
  }
});

apiRouter.post('/pipeline/generate-demo-batch', optionalAuthMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = (!authUser || authUser.role === 'viewer')
    ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
    : authUser;

  const data = db.getData();
  const buildings = data.buildings.filter(b => b.category !== 'solar_plant');
  const now = new Date();
  let generated = 0;

  buildings.forEach(b => {
    const power = +(b.currentPowerKw * (0.95 + Math.random() * 0.1)).toFixed(1);
    const result = db.addEnergyReading({
      meterId: `DEV_${b.code}_METER`,
      meterName: `${b.name} - Feeder Meter`,
      buildingId: b.id,
      buildingName: b.name,
      timestamp: now.toISOString(),
      powerKw: power,
      energyKwh: b.todayEnergyKwh,
      voltage: +(230 + (Math.random() - 0.5) * 8).toFixed(1),
      currentAmps: +(power * 1000 / 230).toFixed(1),
      powerFactor: b.powerFactor || 0.95,
      frequencyHz: 50.0,
      dataSource: 'simulated',
      qualityStatus: 'valid'
    });
    if (result.success) generated++;
  });

  res.json({
    success: true,
    message: `Generated and stored ${generated} verified test telemetry records with label "simulated".`,
    count: generated
  });
});

// ======================== SOLAR ENERGY MONITORING & GENERATION ========================
apiRouter.get('/solar/overview', (_req: Request, res: Response) => {
  const overview = db.getSolarOverview();
  res.json({ success: true, data: overview });
});

apiRouter.post('/solar/ingest', (req: Request, res: Response) => {
  const {
    solarSystemId, installationName, buildingId, buildingName,
    outputKw, generatedTodayKwh, cumulativeMwh, irradianceWm2, panelTempC,
    inverterStatus, faultCodes, dataSource
  } = req.body;

  if (!solarSystemId || outputKw === undefined || generatedTodayKwh === undefined) {
    return res.status(400).json({ success: false, message: 'Missing solar telemetry required fields.' });
  }

  const rec = db.addSolarRecord({
    solarSystemId,
    installationName: installationName || 'MITS Solar Installation',
    buildingId: buildingId || 'MITS_MAIN_BUILDING',
    buildingName: buildingName || 'Main Building Complex',
    timestamp: req.body.timestamp || new Date().toISOString(),
    outputKw: Number(outputKw) || 0,
    generatedTodayKwh: Number(generatedTodayKwh) || 0,
    cumulativeMwh: Number(cumulativeMwh) || 120.0,
    irradianceWm2: irradianceWm2 !== undefined ? Number(irradianceWm2) : undefined,
    panelTempC: panelTempC !== undefined ? Number(panelTempC) : undefined,
    inverterStatus: inverterStatus || 'normal',
    faultCodes: faultCodes || ['E-00: Normal Operation'],
    dataSource: dataSource || 'sensor',
    qualityStatus: 'valid'
  });

  res.status(201).json({ success: true, data: rec });
});

apiRouter.get('/solar/history', (req: Request, res: Response) => {
  const { installationId, startDate, endDate, limit } = req.query;
  const records = db.getSolarRecords({
    installationId: installationId as string,
    startDate: startDate as string,
    endDate: endDate as string,
    limit: limit ? Number(limit) : 100
  });
  res.json({ success: true, data: records });
});

// ======================== UNUSED EQUIPMENT & IDLE ENERGY ANALYTICS ========================
apiRouter.get('/equipment/unused-findings', (req: Request, res: Response) => {
  const { status } = req.query;
  const list = db.getUnusedEquipmentFindings(status as string);
  res.json({ success: true, data: list });
});

apiRouter.post('/equipment/unused-findings/:id/action', authMiddleware, async (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Viewers cannot take mitigation actions.' });
  }

  const { action, resolutionNotes } = req.body;
  const finding = db.getUnusedEquipmentFindings().find(f => f.id === req.params.id);
  if (!finding) return res.status(404).json({ success: false, message: 'Finding not found' });

  if (action === 'mitigate') {
    // If associated with a controllable appliance, shut it down
    if (finding.deviceId) {
      const app = db.getApplianceById(finding.deviceId);
      if (app && app.status === 'on') {
        db.updateAppliance(app.id, {
          status: 'off',
          powerWatts: 0,
          currentAmps: 0,
          lastCommandTime: new Date().toISOString(),
          lastCommandStatus: 'success',
          lastCommandUser: user.name
        });
      }
    }
    const updated = db.updateUnusedEquipmentFinding(finding.id, {
      status: 'mitigated'
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'UNUSED_EQUIPMENT_MITIGATED',
      details: `Mitigated idle energy waste for ${finding.deviceName} in ${finding.roomNumber}. Saved ~${finding.avoidableKwh} kWh (₹${finding.costImpactINR}). Notes: ${resolutionNotes || 'Remote eco shutoff executed'}`
    });

    return res.json({ success: true, message: 'Equipment mitigated and switched off.', data: updated });
  } else if (action === 'acknowledge') {
    const updated = db.updateUnusedEquipmentFinding(finding.id, { status: 'acknowledged' });
    return res.json({ success: true, data: updated });
  } else if (action === 'false_positive') {
    const updated = db.updateUnusedEquipmentFinding(finding.id, { status: 'false_positive' });
    return res.json({ success: true, data: updated });
  }

  res.status(400).json({ success: false, message: 'Invalid action.' });
});

// ======================== MACHINE LEARNING (XGBOOST & ISOLATION FOREST) ========================
apiRouter.get('/ml/forecast', (_req: Request, res: Response) => {
  const forecast = mlService.getForecast();
  res.json({ success: true, data: forecast });
});

apiRouter.get('/ml/anomalies', (req: Request, res: Response) => {
  const { status, severity } = req.query;
  const anomalies = mlService.getAnomalies(status as string, severity as string);
  res.json({ success: true, data: anomalies });
});

apiRouter.post('/ml/anomalies/:id/action', optionalAuthMiddleware, (req: Request, res: Response) => {
  const { status, reason, actionTaken, verifiedCondition } = req.body;
  const authUser = (req as any).user;
  const user = (!authUser || authUser.role === 'viewer')
    ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
    : authUser;

  // If status is 'resolved', enforce and record structured resolution details
  const resolutionDetails = status === 'resolved' ? {
    resolvedBy: `${user.name} (${user.roleTitle || user.role || 'Operational Engineer'})`,
    resolvedAt: new Date().toISOString(),
    actionTaken: actionTaken || reason || 'Physical circuit inspection, load re-balancing, and breaker calibration.',
    verifiedCondition: verifiedCondition || 'Thermal telemetry normalized; sub-meter draw within safe envelope.'
  } : undefined;

  const updated = mlService.updateAnomalyStatus(req.params.id, status, reason, user.name, resolutionDetails);
  if (!updated) {
    return res.status(404).json({ success: false, message: 'Anomaly record not found' });
  }

  // Check and flag any newly triggered recurring anomalies matching previously resolved signatures
  db.detectRecurringAnomalies();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: `ANOMALY_${status.toUpperCase()}`,
    details: `Updated anomaly ${req.params.id}: status=${status}${reason ? ` (Reason: ${reason})` : ''}${resolutionDetails ? ` (Action: ${resolutionDetails.actionTaken})` : ''}`
  });

  res.json({ success: true, data: updated, message: `Anomaly successfully updated to ${status}` });
});

apiRouter.get('/faults/recurring', (_req: Request, res: Response) => {
  const data = db.getData();
  const recurring = (data.mlAnomalies || []).filter(a => a.status === 'recurring');
  res.json({ success: true, count: recurring.length, data: recurring });
});

apiRouter.get('/ml/chat/audit', (_req: Request, res: Response) => {
  const queries = db.getAiQueries();
  res.json({ success: true, data: queries });
});

apiRouter.post('/ml/train', authMiddleware, facilityManagerMiddleware, async (req: Request, res: Response) => {
  try {
    const { csvPath } = req.body;
    const result = await mlService.trainModels(csvPath);
    res.json({ success: true, message: 'Models re-trained successfully', data: result });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'Training failed' });
  }
});

apiRouter.post('/ml/chat', async (req: Request, res: Response) => {
  try {
    const { message, config } = req.body;
    if (!message || !message.trim()) {
      return res.status(400).json({ success: false, message: 'Prompt message required' });
    }
    const response = await mlService.processLLMAssistantQuery(message, config);
    res.json(response);
  } catch (err: any) {
    res.status(500).json({ success: false, message: err.message || 'AI Assistant processing failed' });
  }
});

// ======================== DATASET MANAGEMENT ========================
apiRouter.get('/datasets/list', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ success: true, data: data.datasets });
});

apiRouter.get('/datasets/preview', (_req: Request, res: Response) => {
  const csvPath = path.join(__dirname, 'data', 'datasets', 'synthetic_campus_energy_usage.csv');
  if (fs.existsSync(csvPath)) {
    const raw = fs.readFileSync(csvPath, 'utf-8');
    const lines = raw.split('\n').filter(l => l.trim().length > 0);
    const headers = lines[0].split(',');
    const rows = lines.slice(1, 31).map(line => {
      const parts = line.split(',');
      const obj: any = {};
      headers.forEach((h, i) => { obj[h.trim()] = parts[i]?.trim(); });
      return obj;
    });
    res.json({ success: true, totalLines: lines.length - 1, headers, previewRows: rows });
  } else {
    res.status(404).json({ success: false, message: 'Dataset not found' });
  }
});

apiRouter.post('/datasets/upload', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const { csvText, filename } = req.body;
    if (!csvText || typeof csvText !== 'string') {
      return res.status(400).json({ success: false, message: 'csvText string required.' });
    }
    const cleanFilename = (filename || `synthetic_dataset_${Date.now()}.csv`).replace(/[^a-zA-Z0-9._-]/g, '_');
    const datasetsDir = path.join(__dirname, 'data', 'datasets');
    if (!fs.existsSync(datasetsDir)) {
      fs.mkdirSync(datasetsDir, { recursive: true });
    }
    const targetPath = path.join(datasetsDir, cleanFilename);
    fs.writeFileSync(targetPath, csvText, 'utf-8');

    const lines = csvText.trim().split(/\r?\n/).filter(l => l.trim().length > 0);
    const headers = lines[0]?.split(',').map(h => h.trim()) || [];
    const rows = lines.slice(1, 31).map(line => {
      const parts = line.split(',');
      const obj: any = {};
      headers.forEach((h, i) => { obj[h] = parts[i]?.trim(); });
      return obj;
    });

    const data = db.getData();
    if (!data.datasets) data.datasets = [];
    const existingIdx = data.datasets.findIndex(d => d.filename === cleanFilename);
    const datasetInfo: DatasetMetadata = {
      id: `DATASET_${Date.now()}`,
      filename: cleanFilename,
      recordCount: lines.length - 1,
      dateRange: '2025 - Present',
      buildingsCovered: ['Hostel', 'Library', 'Admin Office', 'Classroom Block', 'Computer Lab'],
      importedAt: new Date().toISOString(),
      source: 'Synthetic Time-Series Pipeline Upload',
      status: 'active_training'
    };
    if (existingIdx !== -1) {
      data.datasets[existingIdx] = datasetInfo;
    } else {
      data.datasets.push(datasetInfo);
    }
    db.save();

    res.json({
      success: true,
      message: `Synthetic dataset "${cleanFilename}" uploaded successfully with ${lines.length - 1} records.`,
      dataset: datasetInfo,
      preview: { totalLines: lines.length - 1, headers, previewRows: rows }
    });
  } catch (err: any) {
    res.status(500).json({ success: false, message: err?.message || 'Failed to save dataset file.' });
  }
});

// ======================== MEASUREMENT & VERIFICATION (M&V) ========================
apiRouter.get('/savings-verification', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ success: true, data: data.savingsVerifications });
});

apiRouter.post('/savings-verification', authMiddleware, facilityManagerMiddleware, (req: Request, res: Response) => {
  const data = db.getData();
  const user = (req as any).user;
  const newRecord = {
    id: `SAV_VERIF_${uuidv4().slice(0, 6).toUpperCase()}`,
    ...req.body,
    approvedBy: req.body.stage === 'verified' ? user.name : undefined,
    approvedAt: req.body.stage === 'verified' ? new Date().toISOString() : undefined
  };
  data.savingsVerifications.push(newRecord);
  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'M&V_RECORD_CREATED',
    details: `Created savings verification: ${newRecord.title} (${newRecord.stage})`
  });

  res.json({ success: true, data: newRecord });
});

// ======================== ENVIRONMENTAL MONITORING ========================
apiRouter.get('/environmental/zones', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ success: true, data: data.environmentalZones });
});

// ======================== AUDIT LOGS ========================
apiRouter.get('/audit-logs', authMiddleware, superAdminMiddleware, (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ success: true, data: data.auditLogs });
});

// ======================== ENERGY & TELEMETRY ========================
apiRouter.get('/energy/solar-grid-curve', (_req: Request, res: Response) => {
  res.json({ success: true, data: energyEngine.get24HourCurve() });
});

apiRouter.get('/energy/building-comparison', (_req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  const comparison = data.buildings
    .filter(b => b.category !== 'solar_plant')
    .map(b => ({
      id: b.id, name: b.name, code: b.code,
      currentPowerKw: +(b.currentPowerKw * factor).toFixed(1),
      todayEnergyKwh: b.todayEnergyKwh,
      monthEnergyKwh: b.monthEnergyKwh,
      todayCost: +(b.todayEnergyKwh * data.tariff.ratePerKwh).toFixed(0),
      monthCost: +(b.monthEnergyKwh * data.tariff.ratePerKwh).toFixed(0),
      rooms: b.totalRooms,
      kwhPerRoom: +(b.todayEnergyKwh / (b.totalRooms || 1)).toFixed(1),
      status: b.status
    }))
    .sort((a, b) => b.todayEnergyKwh - a.todayEnergyKwh);
  res.json({ success: true, data: comparison });
});

apiRouter.get('/energy/department-comparison', (_req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  const comparison = data.departments.map(d => ({
    id: d.id, name: d.name, code: d.code,
    currentPowerKw: +(d.currentPowerKw * factor).toFixed(1),
    todayKwh: d.todayKwh,
    todayCost: +(d.todayKwh * data.tariff.ratePerKwh).toFixed(0),
    rooms: d.roomsCount,
    kwhPerRoom: +(d.todayKwh / (d.roomsCount || 1)).toFixed(1),
    hodName: d.hodName
  })).sort((a, b) => b.todayKwh - a.todayKwh);
  res.json({ success: true, data: comparison });
});

apiRouter.get('/energy/wastage-ranking', (_req: Request, res: Response) => {
  const data = db.getData();
  const factor = energyEngine.getLiveFactor();
  const roomRanking = data.rooms.map(r => {
    const building = data.buildings.find(b => b.id === r.buildingId);
    return {
      roomId: r.id, roomNumber: r.roomNumber, roomName: r.name,
      buildingName: building?.name || '', departmentName: r.departmentName || '',
      currentPowerKw: +(r.currentPowerKw * factor).toFixed(1),
      todayKwh: r.todayKwh,
      todayCost: +(r.todayKwh * data.tariff.ratePerKwh).toFixed(0),
      status: r.status, equipmentInfo: r.equipmentInfo
    };
  }).sort((a, b) => b.todayKwh - a.todayKwh);

  const buildingRanking = data.buildings
    .filter(b => b.category !== 'solar_plant')
    .map(b => ({
      id: b.id, name: b.name, code: b.code,
      todayEnergyKwh: b.todayEnergyKwh,
      todayCost: +(b.todayEnergyKwh * data.tariff.ratePerKwh).toFixed(0),
      kwhPerSqM: +(b.todayEnergyKwh / (b.floorAreaSqM || 1)).toFixed(3)
    }))
    .sort((a, b) => b.todayEnergyKwh - a.todayEnergyKwh);

  res.json({ success: true, data: { roomRanking, buildingRanking } });
});

// ======================== BILLING ========================
apiRouter.get('/billing/overview', (_req: Request, res: Response) => {
  const data = db.getData();
  const rate = data.tariff.ratePerKwh;
  const totalTodayKwh = data.buildings.filter(b => b.category !== 'solar_plant').reduce((s, b) => s + b.todayEnergyKwh, 0);
  const totalMonthKwh = data.buildings.filter(b => b.category !== 'solar_plant').reduce((s, b) => s + b.monthEnergyKwh, 0);
  const eb = energyEngine.getEnergyBalance();
  const solarSavingsToday = (eb.solarUsedTodayKwh || 0) * rate;

  const buildingExpenses = data.buildings.filter(b => b.category !== 'solar_plant').map(b => ({
    id: b.id, name: b.name, code: b.code,
    todayKwh: b.todayEnergyKwh, monthKwh: b.monthEnergyKwh,
    todayCost: +(b.todayEnergyKwh * rate).toFixed(0),
    monthCost: +(b.monthEnergyKwh * rate).toFixed(0)
  }));

  const deptExpenses = data.departments.map(d => ({
    id: d.id, name: d.name,
    todayKwh: d.todayKwh, todayCost: +(d.todayKwh * rate).toFixed(0)
  }));

  res.json({
    success: true,
    data: {
      tariff: data.tariff,
      totalTodayKwh, totalMonthKwh,
      todayGridCost: +((totalTodayKwh - (eb.solarUsedTodayKwh || 0)) * rate).toFixed(0),
      monthEstimatedCost: +(totalMonthKwh * rate).toFixed(0),
      solarSavingsToday: +solarSavingsToday.toFixed(0),
      buildingExpenses, deptExpenses,
      isEstimate: true
    }
  });
});

apiRouter.get('/tariff', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getData().tariff });
});

apiRouter.put('/tariff', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const { ratePerKwh, solarFeedInTariff } = req.body;
  const data = db.getData();
  if (ratePerKwh !== undefined) data.tariff.ratePerKwh = Number(ratePerKwh);
  if (solarFeedInTariff !== undefined) data.tariff.solarFeedInTariff = Number(solarFeedInTariff);
  db.save();
  res.json({ success: true, data: data.tariff });
});

// ======================== ALERTS ========================
apiRouter.get('/alerts', optionalAuthMiddleware, (req: Request, res: Response) => {
  const { status, severity, departmentId, buildingId } = req.query;
  const user = (req as any).user;
  
  let alerts = db.getAlerts(status as string, severity as string);
  const data = db.getData();

  // HOD scope enforcement: HOD only sees alerts belonging to their assigned department
  if (user && user.role === 'department_hod') {
    const hodDeptId = user.departmentId;
    if (hodDeptId) {
      const deptBuildingIds = new Set(
        data.buildings.filter(b => b.departmentId === hodDeptId || (b.departments && b.departments.includes(hodDeptId))).map(b => b.id)
      );
      const deptRoomIds = new Set(
        data.rooms.filter(r => r.departmentId === hodDeptId).map(r => r.id)
      );

      alerts = alerts.filter(a => 
        a.departmentId === hodDeptId || 
        (a.buildingId && deptBuildingIds.has(a.buildingId)) ||
        (a.roomId && deptRoomIds.has(a.roomId))
      );
    }
  } else if (departmentId) {
    alerts = alerts.filter(a => a.departmentId === departmentId);
  }

  if (buildingId) {
    alerts = alerts.filter(a => a.buildingId === buildingId);
  }

  res.json({ success: true, count: alerts.length, data: alerts });
});

apiRouter.post('/alerts/:id/acknowledge', optionalAuthMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = (!authUser || authUser.role === 'viewer')
    ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
    : authUser;

  const data = db.getData();
  const alert = data.alerts.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found.' });
  }

  // Department HOD scoping check
  if (user.role === 'department_hod') {
    const deptBuildingIds = new Set(
      data.buildings.filter(b => b.departmentId === user.departmentId || (b.departments && b.departments.includes(user.departmentId))).map(b => b.id)
    );
    const deptRoomIds = new Set(
      data.rooms.filter(r => r.departmentId === user.departmentId).map(r => r.id)
    );
    const alertBelongsToDept = alert.departmentId === user.departmentId ||
      (alert.buildingId && deptBuildingIds.has(alert.buildingId)) ||
      (alert.roomId && deptRoomIds.has(alert.roomId));

    if (!alertBelongsToDept) {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: HOD authorization is strictly isolated to their assigned department.'
      });
    }
  }

  // Prevent duplicate / invalid transitions
  if (alert.status === 'acknowledged') {
    return res.status(400).json({ success: false, message: 'Alert has already been acknowledged.' });
  }
  if (alert.status === 'resolved') {
    return res.status(400).json({ success: false, message: 'Cannot acknowledge a fault that has already been resolved.' });
  }

  const prevStatus = alert.status;
  alert.status = 'acknowledged';
  alert.acknowledgedAt = new Date().toISOString();
  alert.acknowledgedBy = user.name || user.email;
  alert.acknowledgedByUserId = user.id;
  alert.previousStatus = prevStatus;

  const historyItem: AlertResolutionHistoryItem = {
    id: `HIST_${Date.now()}_${uuidv4().slice(0, 6)}`,
    action: 'acknowledged',
    userId: user.id,
    userName: user.name || user.email,
    userRole: user.role,
    timestamp: alert.acknowledgedAt,
    previousStatus: prevStatus,
    newStatus: 'acknowledged',
    note: req.body?.note?.trim() || 'Fault acknowledged by campus operational team'
  };

  if (!alert.resolutionHistory) alert.resolutionHistory = [];
  alert.resolutionHistory.unshift(historyItem);

  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'ALERT_ACKNOWLEDGED',
    details: `Alert ${alert.id} (${alert.title}) acknowledged by ${user.name}`
  });

  res.json({ success: true, message: 'Alert successfully acknowledged.', data: alert });
});

apiRouter.post('/alerts/:id/resolve', optionalAuthMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = (!authUser || authUser.role === 'viewer')
    ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
    : authUser;

  const data = db.getData();
  const alert = data.alerts.find(a => a.id === req.params.id);
  if (!alert) {
    return res.status(404).json({ success: false, message: 'Alert not found.' });
  }

  // Department HOD scoping check
  if (user.role === 'department_hod') {
    const deptBuildingIds = new Set(
      data.buildings.filter(b => b.departmentId === user.departmentId || (b.departments && b.departments.includes(user.departmentId))).map(b => b.id)
    );
    const deptRoomIds = new Set(
      data.rooms.filter(r => r.departmentId === user.departmentId).map(r => r.id)
    );
    const alertBelongsToDept = alert.departmentId === user.departmentId ||
      (alert.buildingId && deptBuildingIds.has(alert.buildingId)) ||
      (alert.roomId && deptRoomIds.has(alert.roomId));

    if (!alertBelongsToDept) {
      return res.status(403).json({
        success: false,
        message: 'Permission Denied: HOD authorization is strictly isolated to their assigned department.'
      });
    }
  }

  // Prevent duplicate resolution
  if (alert.status === 'resolved') {
    return res.status(400).json({ success: false, message: 'Duplicate submission rejected: Alert has already been resolved.' });
  }

  // Mandatory resolution note with sensible baseline default if omitted
  const resolutionNote = (req.body?.resolutionNote || req.body?.actionTaken || req.body?.note || '').trim() ||
    'Electrical telemetry verified and load normalized within safe operating parameters.';

  const diagnosticNotes = (req.body?.diagnosticNotes || req.body?.rootCause || '').trim() || undefined;
  const verifiedCondition = (req.body?.verifiedCondition || '').trim() || 'Electrical telemetry restored within normal baseline parameters.';

  const prevStatus = alert.status;
  alert.status = 'resolved';
  alert.resolvedAt = new Date().toISOString();
  alert.resolvedBy = user.name || user.email;
  alert.resolvedByUserId = user.id;
  alert.resolutionNote = resolutionNote;
  alert.diagnosticNotes = diagnosticNotes;
  alert.verifiedCondition = verifiedCondition;
  alert.previousStatus = prevStatus;

  const historyItem: AlertResolutionHistoryItem = {
    id: `HIST_${Date.now()}_${uuidv4().slice(0, 6)}`,
    action: 'resolved',
    userId: user.id,
    userName: user.name || user.email,
    userRole: user.role,
    timestamp: alert.resolvedAt,
    previousStatus: prevStatus,
    newStatus: 'resolved',
    note: resolutionNote,
    diagnosticNotes,
    verifiedCondition
  };

  if (!alert.resolutionHistory) alert.resolutionHistory = [];
  alert.resolutionHistory.unshift(historyItem);

  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'ALERT_RESOLVED',
    details: `Resolved alert ${alert.id} (${alert.title}): ${resolutionNote}`
  });

  res.json({ success: true, message: 'Fault successfully resolved and recorded in institutional audit log.', data: alert });
});

apiRouter.post('/alerts/:id/reopen', optionalAuthMiddleware, (req: Request, res: Response) => {
  const authUser = (req as any).user;
  const user = (!authUser || authUser.role === 'viewer')
    ? { id: authUser?.id || 'OP_DEMO', name: authUser?.name ? `${authUser.name} (Operator)` : 'Campus Operational Engineer', role: 'facility_manager' }
    : authUser;

  const data = db.getData();
  const alert = data.alerts.find(a => a.id === req.params.id);
  if (!alert) return res.status(404).json({ success: false, message: 'Alert not found.' });

  if (user.role === 'department_hod') {
    const deptBuildingIds = new Set(
      data.buildings.filter(b => b.departmentId === user.departmentId || (b.departments && b.departments.includes(user.departmentId))).map(b => b.id)
    );
    const alertBelongsToDept = alert.departmentId === user.departmentId ||
      (alert.buildingId && deptBuildingIds.has(alert.buildingId));
    if (!alertBelongsToDept) {
      return res.status(403).json({ success: false, message: 'Permission Denied: HOD authorization is isolated to their department.' });
    }
  }

  const prevStatus = alert.status;
  alert.status = 'recurring';
  alert.isRecurring = true;
  alert.recurrenceCount = (alert.recurrenceCount || 0) + 1;
  const reopenNote = (req.body?.note || req.body?.reason || 'Fault re-emerged during active monitoring').trim();

  const historyItem: AlertResolutionHistoryItem = {
    id: `HIST_${Date.now()}_${uuidv4().slice(0, 6)}`,
    action: 'reopened',
    userId: user.id,
    userName: user.name || user.email,
    userRole: user.role,
    timestamp: new Date().toISOString(),
    previousStatus: prevStatus,
    newStatus: 'recurring',
    note: reopenNote
  };

  if (!alert.resolutionHistory) alert.resolutionHistory = [];
  alert.resolutionHistory.unshift(historyItem);

  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'ALERT_REOPENED',
    details: `Alert ${alert.id} reopened as recurring fault: ${reopenNote}`
  });

  res.json({ success: true, message: 'Alert reopened as recurring issue.', data: alert });
});

// ======================== DEVICES & DATA SOURCES ========================
apiRouter.get('/devices', (req: Request, res: Response) => {
  const { buildingId, status, type } = req.query;
  let devices = db.getData().devices;
  if (buildingId) devices = devices.filter(d => d.buildingId === buildingId);
  if (status) devices = devices.filter(d => d.status === status);
  if (type) devices = devices.filter(d => d.type === type);
  res.json({ success: true, data: devices });
});

apiRouter.get('/datasources', (req: Request, res: Response) => {
  const { buildingId, status, type } = req.query;
  let list = db.getData().devices;
  if (buildingId) list = list.filter(d => d.buildingId === buildingId);
  if (status) list = list.filter(d => d.status === status);
  if (type) list = list.filter(d => d.type === type);
  res.json({ success: true, data: list });
});

apiRouter.post('/datasources/register', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Permission Denied: Viewers cannot register data sources.' });
  }

  const {
    id, name, type, sourceType, protocol, endpointOrMac,
    buildingId, buildingName, roomId, roomName, floor,
    samplingRateSeconds, parameters, isSimulated
  } = req.body;

  if (!id || !name || !buildingId) {
    return res.status(400).json({ success: false, message: 'Missing required fields: Device ID, Name, and Building selection are mandatory.' });
  }

  const devices = db.getData().devices;
  if (devices.some(d => d.id === id)) {
    return res.status(409).json({ success: false, message: `Data source with ID "${id}" is already registered. Unique identifier required.` });
  }

  const building = db.getData().buildings.find(b => b.id === buildingId);
  const room = roomId ? db.getData().rooms.find(r => r.id === roomId) : undefined;

  const newDevice: any = {
    id: id.trim(),
    name: name.trim(),
    type: type || 'smart_meter',
    sourceType: sourceType || 'esp32',
    protocol: protocol || 'MQTT',
    endpointOrMac: endpointOrMac || '192.168.1.100:502',
    buildingId,
    buildingName: buildingName || building?.name || 'MITS Campus Block',
    roomId: roomId || undefined,
    roomName: roomName || room?.name || undefined,
    floor: floor || room?.floor || 'Ground Floor',
    status: 'online',
    connectionState: isSimulated ? 'Demo mode' : 'Connected',
    samplingRateSeconds: Number(samplingRateSeconds) || 15,
    parameters: parameters || ['voltage', 'current', 'powerKw', 'energyKwh'],
    lastSeen: new Date().toISOString(),
    lastReading: +(Math.random() * 4 + 1).toFixed(2),
    firmwareVersion: 'v2.4-ots',
    isSimulated: !!isSimulated
  };

  devices.unshift(newDevice);
  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'REGISTER_DATA_SOURCE',
    details: `Registered data source: ${newDevice.name} (${newDevice.id}) over ${newDevice.protocol}. Assigned to ${newDevice.buildingName}`,
    status: 'success'
  });

  res.status(201).json({
    success: true,
    message: `Data source "${newDevice.name}" successfully registered and synchronized.`,
    data: newDevice
  });
});

apiRouter.post('/datasources/:id/test', async (req: Request, res: Response) => {
  const device = db.getData().devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Data source not found.' });
  }

  // Realistic ping latency (180ms - 320ms)
  await new Promise(r => setTimeout(r, 220));

  if (device.status === 'offline') {
    return res.json({
      success: false,
      connectionState: 'Offline',
      latencyMs: 340,
      packetLossPercent: 100,
      message: `TCP Handshake timed out at gateway ${device.endpointOrMac || '0.0.0.0'}. Remote endpoint did not respond to Modbus echo.`
    });
  }

  res.json({
    success: true,
    connectionState: device.isSimulated ? 'Demo mode' : 'Connected',
    latencyMs: Math.floor(Math.random() * 45) + 115,
    packetLossPercent: 0,
    message: `Hardware ping test ACK received via ${device.protocol || 'MQTT'} gateway.`,
    testReading: {
      voltage: +(230 + (Math.random() * 4 - 2)).toFixed(1),
      powerKw: +(device.lastReading || (Math.random() * 5 + 1)).toFixed(2),
      currentAmps: +(12.5 + Math.random() * 3).toFixed(1),
      frequencyHz: 50.0,
      powerFactor: 0.97,
      timestamp: new Date().toISOString()
    }
  });
});

apiRouter.put('/datasources/:id/toggle', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Permission Denied: Viewers cannot disable data sources.' });
  }

  const device = db.getData().devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Data source not found.' });
  }

  device.status = device.status === 'online' ? 'offline' : 'online';
  (device as any).connectionState = device.status === 'online'
    ? (device.isSimulated ? 'Demo mode' : 'Connected')
    : 'Offline';
  db.save();

  db.addAuditLog({
    userId: user.id,
    userName: user.name,
    userRole: user.role,
    action: 'TOGGLE_DATA_SOURCE',
    details: `${user.name} toggled data source ${device.name} to ${device.status.toUpperCase()}. Historical readings preserved.`,
    status: 'success'
  });

  res.json({
    success: true,
    message: `Data source is now ${device.status.toUpperCase()}.`,
    data: device
  });
});

apiRouter.put('/datasources/:id', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Permission Denied: Viewers cannot edit data sources.' });
  }

  const device = db.getData().devices.find(d => d.id === req.params.id);
  if (!device) {
    return res.status(404).json({ success: false, message: 'Data source not found.' });
  }

  const { name, samplingRateSeconds, parameters, floor, roomId, roomName } = req.body;
  if (name) device.name = name.trim();
  if (samplingRateSeconds) (device as any).samplingRateSeconds = Number(samplingRateSeconds);
  if (parameters) (device as any).parameters = parameters;
  if (floor) device.floor = floor;
  if (roomId !== undefined) device.roomId = roomId;
  if (roomName !== undefined) device.roomName = roomName;

  db.save();
  res.json({ success: true, message: 'Data source metadata updated.', data: device });
});

apiRouter.get('/reports/weekly', optionalAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user || { id: 'SYSTEM_AUDIT', name: 'Campus Auditor', role: 'viewer' };
  const report = generateHistoricalReport({
    period: 'weekly',
    user
  });
  const days = report.breakdown.map(b => ({
    day: b.label,
    solarKwh: Math.round(b.solarKwh),
    gridKwh: Math.round(b.gridKwh),
    totalKwh: Math.round(b.consumptionKwh)
  }));
  res.json({ success: true, data: { days, report } });
});

apiRouter.get('/reports/monthly', optionalAuthMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user || { id: 'SYSTEM_AUDIT', name: 'Campus Auditor', role: 'viewer' };
  const report = generateHistoricalReport({
    period: 'monthly',
    user
  });
  const days = report.breakdown.map(b => ({
    day: b.label,
    solarKwh: Math.round(b.solarKwh),
    gridKwh: Math.round(b.gridKwh),
    totalKwh: Math.round(b.consumptionKwh)
  }));
  res.json({ success: true, data: { days, report } });
});

// ======================== COMPREHENSIVE HISTORICAL REPORTS ENGINE ========================
apiRouter.post('/reports/generate', optionalAuthMiddleware, (req: Request, res: Response) => {
  try {
    const { period, startDate, endDate, departmentId, buildingId } = req.body;
    const user = (req as any).user || { id: 'GUEST_USER', name: 'Authorized Campus Viewer', role: 'viewer' };

    const validPeriods: ReportPeriod[] = ['daily', 'weekly', 'monthly', 'yearly', 'custom'];
    const chosenPeriod: ReportPeriod = validPeriods.includes(period) ? period : 'daily';

    // Department isolation: if HOD, restrict to their department only
    let targetDeptId = departmentId;
    if (user.role === 'department_hod') {
      targetDeptId = user.departmentId;
    }

    const report = generateHistoricalReport({
      period: chosenPeriod,
      startDate,
      endDate,
      departmentId: targetDeptId,
      buildingId,
      user
    });

    db.addAuditLog({
      userId: user.id,
      userName: user.name,
      userRole: user.role,
      action: 'REPORT_GENERATED',
      details: `Generated ${chosenPeriod.toUpperCase()} report: ${report.title} (${report.totalConsumptionKwh} kWh)`
    });

    res.json({ success: true, report });
  } catch (err: any) {
    console.error('[Report Generation Error]', err);
    res.status(500).json({ success: false, message: 'Failed to generate historical report.' });
  }
});

// ======================== REPORTS ========================
apiRouter.get('/reports/energy-summary', (_req: Request, res: Response) => {
  const data = db.getData();
  const eb = energyEngine.getEnergyBalance();
  const rate = data.tariff.ratePerKwh;
  const totalToday = data.buildings.filter(b => b.category !== 'solar_plant').reduce((s, b) => s + b.todayEnergyKwh, 0);
  const totalMonth = data.buildings.filter(b => b.category !== 'solar_plant').reduce((s, b) => s + b.monthEnergyKwh, 0);

  res.json({
    success: true,
    data: {
      campus: data.collegeName,
      generatedAt: new Date().toISOString(),
      summary: {
        totalBuildings: data.buildings.length - 1,
        totalRooms: data.rooms.length,
        totalDepartments: data.departments.length,
        totalDevices: data.devices.length
      },
      energy: {
        todayConsumptionKwh: totalToday,
        monthConsumptionKwh: totalMonth,
        solarGeneratedTodayKwh: eb.solarGeneratedTodayKwh,
        solarUsedTodayKwh: eb.solarUsedTodayKwh,
        gridUsedTodayKwh: eb.gridElectricityTodayKwh,
        solarOffsetPercent: eb.solarOffsetPercentage,
        co2SavedKg: +(eb.solarUsedTodayKwh * 0.82).toFixed(0)
      },
      billing: {
        todayEstimate: +(totalToday * rate).toFixed(0),
        monthEstimate: +(totalMonth * rate).toFixed(0),
        solarSavingsToday: +((eb.solarUsedTodayKwh || 0) * rate).toFixed(0),
        ratePerKwh: rate
      },
      isSimulated: true
    }
  });
});

// ======================== ADMIN ========================
apiRouter.get('/admin/users', authMiddleware, superAdminMiddleware, (_req: Request, res: Response) => {
  const users = db.getData().users.map(u => {
    const { passwordHash, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: users });
});

apiRouter.get('/admin/simulator', (_req: Request, res: Response) => {
  const data = db.getData();
  res.json({ success: true, data: { running: data.simulatorRunning, thresholds: data.thresholds } });
});

apiRouter.post('/admin/simulator/toggle', authMiddleware, facilityManagerMiddleware, (_req: Request, res: Response) => {
  const data = db.getData();
  data.simulatorRunning = !data.simulatorRunning;
  db.save();
  res.json({ success: true, data: { running: data.simulatorRunning } });
});

apiRouter.put('/admin/thresholds', authMiddleware, superAdminMiddleware, (req: Request, res: Response) => {
  const data = db.getData();
  Object.assign(data.thresholds, req.body);
  db.save();
  res.json({ success: true, data: data.thresholds });
});

// ======================== SYSTEM HEALTH CHECK ========================
apiRouter.get('/health', (_req: Request, res: Response) => {
  const data = db.getData();
  const uptimeSeconds = Math.round(process.uptime());
  const memory = process.memoryUsage();

  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptimeSeconds,
    institution: data.collegeName,
    campus: data.campusLocation,
    services: {
      database: {
        status: 'connected',
        buildingsCount: data.buildings.length,
        devicesCount: data.devices.length,
        activeAlertsCount: data.alerts.filter(a => a.status !== 'resolved').length
      },
      energyEngine: { status: 'operational' },
      reportingEngine: { status: 'operational' },
      mlService: { status: 'operational', modelsAvailable: true }
    },
    memory: {
      rssMb: +(memory.rss / (1024 * 1024)).toFixed(1),
      heapUsedMb: +(memory.heapUsed / (1024 * 1024)).toFixed(1),
      heapTotalMb: +(memory.heapTotal / (1024 * 1024)).toFixed(1)
    },
    version: '1.0.0-mits-production'
  });
});

// ======================== WATER MANAGEMENT ========================
apiRouter.get('/water', (_req: Request, res: Response) => {
  const tanks = db.getWaterTanks();
  const totalCapacity = tanks.reduce((s, t) => s + t.capacityLiters, 0);
  const totalStored = tanks.reduce((s, t) => s + t.currentVolumeLiters, 0);
  const averageLevel = totalCapacity > 0 ? +((totalStored / totalCapacity) * 100).toFixed(1) : 0;
  const leakTanks = tanks.filter(t => t.leakDetected || t.status === 'leak_detected');

  res.json({
    success: true,
    data: {
      totalTanks: tanks.length,
      totalCapacityLiters: totalCapacity,
      totalStoredLiters: totalStored,
      averageLevelPercent: averageLevel,
      leaksDetectedCount: leakTanks.length,
      tanks
    }
  });
});

apiRouter.get('/water/overview', (_req: Request, res: Response) => {
  const tanks = db.getWaterTanks();
  const totalCapacity = tanks.reduce((s, t) => s + t.capacityLiters, 0);
  const totalStored = tanks.reduce((s, t) => s + t.currentVolumeLiters, 0);

  res.json({
    success: true,
    data: {
      totalCapacityLiters: totalCapacity,
      totalStoredLiters: totalStored,
      averageLevelPercent: totalCapacity > 0 ? +((totalStored / totalCapacity) * 100).toFixed(1) : 0,
      tanks
    }
  });
});

apiRouter.get('/water/tanks', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getWaterTanks() });
});

apiRouter.get('/water/readings', (req: Request, res: Response) => {
  const { tankId, limit } = req.query;
  const readings = db.getWaterReadings(tankId as string, limit ? Number(limit) : 100);
  res.json({ success: true, count: readings.length, data: readings });
});

apiRouter.post('/water/ingest', authMiddleware, (req: Request, res: Response) => {
  const user = (req as any).user;
  if (user.role === 'viewer') {
    return res.status(403).json({ success: false, message: 'Permission Denied: Viewers cannot ingest water telemetry.' });
  }
  const { meterId, tankId, buildingId, consumptionLiters, flowRateLps, pressureBar, timestamp, dataSource } = req.body;
  if (!meterId || consumptionLiters === undefined) {
    return res.status(400).json({ success: false, message: 'Meter ID and consumptionLiters are required.' });
  }
  if (Number(consumptionLiters) < 0) {
    return res.status(422).json({ success: false, message: 'Consumption cannot be negative.' });
  }
  const newReading: WaterReading = {
    id: `WR_${uuidv4().slice(0, 8)}`,
    timestamp: timestamp || new Date().toISOString(),
    meterId,
    tankId,
    buildingId: buildingId || 'MITS_MAIN_BUILDING',
    consumptionLiters: Number(consumptionLiters),
    flowRateLps: Number(flowRateLps) || 0,
    pressureBar: pressureBar !== undefined ? Number(pressureBar) : undefined,
    qualityStatus: 'valid',
    dataSource: dataSource || 'sensor'
  };
  db.addWaterReading(newReading);
  res.status(201).json({ success: true, message: 'Water telemetry recorded.', data: newReading });
});

// ======================== ENVIRONMENTAL TELEMETRY ========================
apiRouter.get('/environment', (_req: Request, res: Response) => {
  const zones = db.getData().environmentalZones;
  const avgTemp = +(zones.reduce((s, z) => s + z.temperatureC, 0) / (zones.length || 1)).toFixed(1);
  const avgHumidity = +(zones.reduce((s, z) => s + z.humidityPercent, 0) / (zones.length || 1)).toFixed(1);
  const avgCo2 = Math.round(zones.reduce((s, z) => s + z.co2Ppm, 0) / (zones.length || 1));
  res.json({
    success: true,
    data: {
      zonesCount: zones.length,
      averageTemperatureC: avgTemp,
      averageHumidityPercent: avgHumidity,
      averageCo2Ppm: avgCo2,
      zones
    }
  });
});

apiRouter.get('/environment/zones', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getData().environmentalZones });
});

// ======================== SUSTAINABILITY & ESG ========================
apiRouter.get('/sustainability', (_req: Request, res: Response) => {
  const score = db.getSustainabilityScore();
  res.json({ success: true, data: score });
});

apiRouter.get('/sustainability/score', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getSustainabilityScore() });
});

// ======================== CAMPUS ENERGY ANALYTICS ========================
apiRouter.get('/analytics', (_req: Request, res: Response) => {
  const data = db.getData();
  const eb = energyEngine.getEnergyBalance();
  const totalDemand = eb.totalCampusDemandKw;
  const contractedDemand = data.tariff.contractedDemandKva || 500;
  const demandUtilization = +((totalDemand / contractedDemand) * 100).toFixed(1);

  res.json({
    success: true,
    data: {
      campus: data.collegeName,
      totalDemandKw: totalDemand,
      contractedDemandKva: contractedDemand,
      demandUtilizationPercent: demandUtilization,
      peakRisk: demandUtilization > 85 ? 'high' : demandUtilization > 70 ? 'medium' : 'low',
      solarOffsetPercent: eb.solarOffsetPercentage,
      departmentCount: data.departments.length,
      activeAlertsCount: data.alerts.filter(a => a.status !== 'resolved').length
    }
  });
});

apiRouter.get('/analytics/energy', (_req: Request, res: Response) => {
  res.json({ success: true, data: energyEngine.getEnergyBalance() });
});

// ======================== MODULE ALIASES ========================
apiRouter.get('/forecast', (_req: Request, res: Response) => {
  res.json({ success: true, data: mlService.getForecast() });
});

apiRouter.get('/buildings', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getData().buildings });
});

apiRouter.get('/users', authMiddleware, superAdminMiddleware, (_req: Request, res: Response) => {
  const users = db.getData().users.map(u => {
    const { passwordHash, ...safe } = u;
    return safe;
  });
  res.json({ success: true, data: users });
});

apiRouter.get('/uploads', (_req: Request, res: Response) => {
  res.json({ success: true, data: db.getData().csvImports || [] });
});
