// ===== Smart Campus Digital Twin & AI Energy Management System =====
// Unified Type Definitions

export type UserRole =
  | 'super_admin'        // Complete administrative control
  | 'facility_manager'   // Facility, meter, alert, optimization control
  | 'department_hod'     // Isolated to permitted department(s) only
  | 'viewer';            // Read-only dashboard viewer

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  roleTitle: string;
  departmentId?: string;
  departmentName?: string;
  organizationId?: string;
  campusId?: string;
  createdAt: string;
  lastLogin: string;
}

export interface RegisteredUser extends User {
  passwordHash: string;
}

export interface Organization {
  id: string;
  name: string;
  code: string;
  campuses: Campus[];
}

export interface Campus {
  id: string;
  organizationId: string;
  name: string;
  code: string;
  location: string;
  totalAreaSqM: number;
  contractedDemandKva: number;
  solarCapacityKwp: number;
  isDefault: boolean;
}

export type BuildingCategory =
  | 'academic' | 'department' | 'administrative' | 'library'
  | 'workshop' | 'architecture' | 'hostel' | 'solar_plant'
  | 'canteen' | 'heritage' | 'laboratory' | 'other';

export interface Building {
  id: string;
  campusId?: string;
  name: string;
  code: string;
  category: BuildingCategory | string;
  categoryLabel: string;
  totalFloors: number;
  totalRooms: number;
  floorAreaSqM: number;
  monthlyBudgetKwh: number;
  monthlyBudgetCost: number;
  meshName: string;
  centerCoordinates: [number, number, number];
  status: 'normal' | 'warning' | 'high_usage' | 'critical';
  currentPowerKw: number;
  todayEnergyKwh: number;
  monthEnergyKwh: number;
  todayCost: number;
  powerFactor: number;
  currentOccupancy?: number;
  occupancyCapacity?: number;
  verifiedCategory?: string;
  categoryBadgeColor?: string;
  latitude?: number;
  longitude?: number;
  altitudeMeters?: number;
  substationFeeder?: string;
  verificationSource?: string;
  verificationStatus?: 'verified' | 'provisional';
  departments?: string[];
  departmentId?: string;
}

export interface Room {
  id: string;
  buildingId: string;
  floor: string;
  roomNumber: string;
  name: string;
  departmentName?: string;
  departmentId?: string;
  currentPowerKw: number;
  todayKwh: number;
  status: 'normal' | 'high_usage' | 'off';
  equipmentInfo: string;
  occupancy?: number;
  temperatureC?: number;
  humidityPercent?: number;
}

export interface DepartmentInfo {
  id: string;
  campusId?: string;
  name: string;
  code: string;
  hodName: string;
  buildingName: string;
  roomsCount: number;
  currentPowerKw: number;
  todayKwh: number;
  todayCost: number;
}

export interface SolarGridEnergyBalance {
  solarGeneratedKw: number;
  solarGeneratedTodayKwh: number;
  solarUsedCampusKw: number;
  solarUsedTodayKwh: number;
  solarExportedGridKw: number;
  solarExportedTodayKwh: number;
  gridElectricityUsedKw: number;
  gridElectricityTodayKwh: number;
  totalCampusDemandKw: number;
  totalCampusTodayKwh: number;
  solarOffsetPercentage: number;
}

export interface TariffRule {
  id: string;
  name: string;
  currencySymbol: string;
  ratePerKwh: number;
  solarFeedInTariff: number;
  contractedDemandKva: number;
}

export type AlertSeverity = 'info' | 'warning' | 'critical';
export type AlertStatus = 'active' | 'open' | 'acknowledged' | 'resolved' | 'recurring';

export interface AlertResolutionHistoryItem {
  id: string;
  action: 'acknowledged' | 'resolved' | 'reopened' | 'recurring';
  userId: string;
  userName: string;
  userRole: string;
  timestamp: string;
  note?: string;
  diagnosticNotes?: string;
  verifiedCondition?: string;
  previousStatus: AlertStatus;
  newStatus: AlertStatus;
}

export interface Alert {
  id: string;
  type: string;
  severity: AlertSeverity;
  status: AlertStatus;
  title: string;
  description: string;
  buildingId?: string;
  buildingName?: string;
  roomId?: string;
  roomName?: string;
  departmentId?: string;
  departmentName?: string;
  deviceId?: string;
  value?: number;
  threshold?: number;
  timestamp: string;
  acknowledgedAt?: string;
  acknowledgedBy?: string;
  acknowledgedByUserId?: string;
  resolvedAt?: string;
  resolvedBy?: string;
  resolvedByUserId?: string;
  resolutionNote?: string;
  diagnosticNotes?: string;
  verifiedCondition?: string;
  previousStatus?: AlertStatus;
  isRecurring?: boolean;
  recurrenceCount?: number;
  resolutionHistory?: AlertResolutionHistoryItem[];
  isSimulated: boolean;
}

export interface Device {
  id: string;
  name: string;
  type: string;
  sourceType?: string;
  protocol?: string;
  endpointOrMac?: string;
  samplingRateSeconds?: number;
  parameters?: string[];
  connectionState?: string;
  buildingId: string;
  buildingName: string;
  roomId?: string;
  roomName?: string;
  floor?: string;
  status: 'online' | 'offline' | 'maintenance';
  lastSeen: string;
  lastReading?: number;
  firmwareVersion: string;
  isSimulated: boolean;
}

export interface TelemetryReading {
  id: string;
  timestamp: string;
  deviceId: string;
  roomId: string;
  buildingId: string;
  powerKw: number;
  energyKwh: number;
  voltage?: number;
  current?: number;
  temperature?: number;
  humidity?: number;
  isSimulated: boolean;
}

// Machine Learning & Analytics Types
export interface MLMetrics {
  maeKwh: number;
  rmseKwh: number;
  mapePercent: number;
  r2Score: number;
}

export interface MLForecastPoint {
  date: string;
  building: string;
  actualKwh?: number;
  predictedKwh: number;
  lowerBound: number;
  upperBound: number;
}

export interface MLSevenDayPoint {
  date: string;
  dayName: string;
  totalForecastKwh: number;
  peakDemandKw: number;
  buildingBreakdown: Record<string, number>;
}

export interface MLHourlyForecastPoint {
  hour: number;
  timeLabel: string;
  forecastDemandKw: number;
  lowerBoundKw: number;
  upperBoundKw: number;
  isPeakPeriod: boolean;
}

export type FaultStatus = 'open' | 'pending_review' | 'acknowledged' | 'resolved' | 'recurring' | 'dismissed';

export interface FaultResolutionDetails {
  resolvedBy: string;
  resolvedAt: string;
  actionTaken: string;
  verifiedCondition: string;
}

export interface MLAnomalyRecord {
  id: string;
  date: string;
  building: string;
  buildingId?: string;
  roomId?: string;
  roomNumber?: string;
  affectedDeviceId?: string;
  affectedDeviceName?: string;
  faultCategory?: string;
  recordedKwh: number;
  expectedBaselineKwh: number;
  deviationPercent: number;
  anomalyScore: number;
  severity: 'critical' | 'high' | 'medium' | 'low';
  usageLevel: string;
  suggestedAction: string;
  status: FaultStatus;
  dismissReason?: string;
  reviewedBy?: string;
  recurrenceCount?: number;
  previousResolutionDate?: string;
  previousResolutionNotes?: string;
  resolutionDetails?: FaultResolutionDetails;
  lastRecurredAt?: string;
  isSimulated?: boolean;
}

// Measurement & Verification (M&V) Optimization Types
export type SavingsStage = 'estimated' | 'measured' | 'verified';

export interface SavingsVerificationRecord {
  id: string;
  title: string;
  facilityName: string;
  buildingId: string;
  stage: SavingsStage;
  baselinePeriod: string;
  baselineKwh: number;
  postOptimizationKwh: number;
  savingsKwh: number;
  costSavingsINR: number;
  co2ReductionKg: number;
  methodology: string;
  approvedBy?: string;
  approvedAt?: string;
  status: 'active' | 'under_review' | 'verified';
  evidenceNotes: string;
}

// Environmental Monitoring
export interface EnvironmentalZone {
  id: string;
  name: string;
  buildingName: string;
  temperatureC: number;
  humidityPercent: number;
  co2Ppm?: number;
  iaqIndex: number; // 0 - 500 (Indoor Air Quality)
  sensorStatus: 'calibrated' | 'drift_detected' | 'offline';
  lastReadingTime: string;
}

// Dataset Management
export interface DatasetMetadata {
  id: string;
  filename: string;
  recordCount: number;
  dateRange: string;
  buildingsCovered: string[];
  importedAt: string;
  source: string;
  status: 'active_training' | 'archived';
}

// Room-Level Equipment & Appliance Control Types
export type ApplianceType = 'ac' | 'light' | 'fan' | 'projector' | 'computer' | 'machinery' | 'pump' | 'other';
export type ApplianceStatus = 'on' | 'off' | 'unavailable';
export type DeviceConnectionStatus = 'online' | 'offline' | 'standby';
export type CommandExecutionStatus = 'idle' | 'pending' | 'success' | 'failed' | 'timeout';

export interface Appliance {
  id: string;
  name: string;
  code: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  departmentId?: string;
  departmentName?: string;
  type: ApplianceType;
  status: ApplianceStatus;
  powerWatts: number;         // current actual power drawn (0 if OFF or unavailable)
  powerKw?: number;          // powerWatts / 1000
  nominalWatts: number;      // rated maximum power drawn when ON
  voltage: number;           // e.g. 230 V
  currentAmps: number;       // e.g. 6.5 A
  runtimeHoursToday: number; // e.g. 4.2 hrs
  todayKwh: number;          // e.g. 6.3 kWh
  accumulatedKwh?: number;   // same as todayKwh
  isControllable: boolean;
  connectionStatus: DeviceConnectionStatus;
  isSimulated: boolean;
  hardwareDeviceId?: string; // e.g. 'MITS-ESP32-RELAY-04'
  lastCommandTime?: string;
  lastCommandStatus?: CommandExecutionStatus;
  lastCommandUser?: string;
  telemetryConfirmed?: boolean;
  telemetrySource?: 'sensor' | 'smart_switch' | 'simulated' | 'unavailable';
  unavailableReason?: string;
  lastUpdated?: string;
}

export interface ApplianceStatusHistoryEntry {
  id: string;
  applianceId: string;
  applianceName: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  previousStatus: ApplianceStatus;
  newStatus: ApplianceStatus;
  powerKw: number;
  changedBy: string;
  changeReason?: string;
  timestamp: string;
  isSimulated: boolean;
}

export interface AIQueryAuditEntry {
  id: string;
  query: string;
  response: string;
  groundingSource: string;
  isGroundingVerified: boolean;
  timestamp: string;
  userRole?: string;
}

export interface FacilityDetailedInfo {
  building: Building;
  rooms: Room[];
  appliances: Appliance[];
  devices: Device[];
  activeAlerts: Alert[];
  recentReadings: EnergyReading[];
  maintenanceWorkOrders: {
    id: string;
    title: string;
    status: 'in_progress' | 'queued' | 'completed';
    description: string;
    scheduledFor: string;
  }[];
  totalDemandKw: number;
  todayKwh: number;
  powerFactor: number;
  onlineDevicesCount: number;
  highLoadRoomsCount: number;
}

export interface ApplianceSchedule {
  id: string;
  name: string;
  applianceId: string;
  applianceName: string;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  startTime: string;          // "HH:MM" e.g. "08:30"
  endTime: string;            // "HH:MM" e.g. "17:30"
  daysOfWeek: number[];       // [1, 2, 3, 4, 5] (1=Mon, 7=Sun)
  action: 'auto_power_cut' | 'auto_power_on' | 'scheduled_eco';
  targetState: ApplianceStatus;
  isActive: boolean;
  lastTriggered?: string;
  overrideUntil?: string;
}

export interface CorrectiveActionSimulation {
  alertId?: string;
  roomId: string;
  roomNumber: string;
  roomName: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  currentPowerKw: number;
  occupancy: number;
  reason: string;
  evidence: string[];
  recommendedApplianceIds: string[];
  expectedDropKw: number;
  projectedDailySavingsINR: number;
  projectedCO2ReductionKg: number;
  targetAppliances: {
    id: string;
    name: string;
    type: ApplianceType;
    powerWatts: number;
  }[];
}

export interface AuditLogEntry {
  id: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  details: string;
  timestamp: string;
  status: 'success' | 'failed';
  ipAddress?: string;
}

// ======================== PIPELINE, SOLAR, STORAGE & ANOMALY TYPES ========================

export type DataSourceType = 'sensor' | 'manual' | 'file_upload' | 'simulated';
export type DataQualityStatus = 'valid' | 'suspect' | 'rejected' | 'duplicate';
export type SolarInverterStatus = 'normal' | 'warning' | 'fault' | 'offline';

export interface EnergyReading {
  id: string;
  meterId: string;
  meterName: string;
  buildingId: string;
  buildingName: string;
  floor?: string;
  roomId?: string;
  roomNumber?: string;
  departmentId?: string;
  timestamp: string;          // ISO 8601 UTC
  powerKw: number;            // Instantaneous power in kW (separate from energy!)
  energyKwh: number;          // Cumulative / interval energy in kWh
  voltage?: number;           // Volts (e.g. 230 / 415)
  currentAmps?: number;       // Amperes
  powerFactor?: number;       // 0.0 - 1.0
  frequencyHz?: number;       // e.g. 50.0 Hz
  dataSource: DataSourceType;
  qualityStatus: DataQualityStatus;
  validationNotes?: string;
}

export interface SolarGenerationRecord {
  id: string;
  solarSystemId: string;
  installationName: string;
  buildingId: string;
  buildingName: string;
  timestamp: string;          // ISO 8601 UTC
  outputKw: number;           // Instantaneous output in kW
  generatedTodayKwh: number;  // Today cumulative generated kWh
  cumulativeMwh: number;      // Lifetime cumulative generation in MWh
  irradianceWm2?: number;     // Solar irradiance in W/m²
  panelTempC?: number;        // PV Module temperature in °C
  inverterStatus: SolarInverterStatus;
  faultCodes: string[];       // e.g. ["E-00: Normal", "E-12: Grid Overfrequency"]
  avoidedCostTodayINR: number;// Calculated: generatedTodayKwh * tariff.ratePerKwh
  avoidedCo2Kg: number;       // Calculated: generatedTodayKwh * 0.82 kg/kWh
  dataSource: DataSourceType;
  qualityStatus: DataQualityStatus;
}

export interface SolarInstallationSummary {
  id: string;
  name: string;
  buildingId: string;
  capacityKwp: number;
  currentOutputKw: number;
  todayGeneratedKwh: number;
  inverterStatus: SolarInverterStatus;
  faultCode: string;
  efficiencyPercent: number;
}

export interface SolarSystemOverview {
  totalCapacityKwp: number;
  currentOutputKw: number;
  todayGeneratedKwh: number;
  monthGeneratedKwh: number;
  yearGeneratedKwh: number;
  avoidedCostTodayINR: number;
  avoidedCostMonthINR: number;
  avoidedCo2TodayKg: number;
  solarContributionPercent: number;
  installations: SolarInstallationSummary[];
  hourlyProfile: {
    hour: number;
    timeLabel: string;
    solarKw: number;
    campusDemandKw: number;
    gridImportKw: number;
    gridExportKw: number;
  }[];
  datewiseHistory: {
    date: string;
    generatedKwh: number;
    avoidedCostINR: number;
    peakKw: number;
    efficiency: number;
  }[];
}

export interface UnusedEquipmentFinding {
  id: string;
  deviceId: string;
  deviceName: string;
  deviceType: ApplianceType;
  roomId: string;
  roomNumber: string;
  buildingId: string;
  buildingName: string;
  floor: string;
  observationPeriod: string;
  detectedAt: string;
  observedPowerKw: number;
  baselinePowerKw: number;
  avoidableKwh: number;
  costImpactINR: number;
  reasonFlag: string;
  evidencePoints: string[];
  recommendedAction: string;
  confidenceLevel: 'high' | 'medium' | 'low';
  dataLimitations: string;
  status: 'active' | 'mitigated' | 'acknowledged' | 'false_positive';
}

export interface IngestionPayload {
  deviceId: string;
  buildingId?: string;
  roomId?: string;
  timestamp?: string;
  measurementType: 'power' | 'energy' | 'solar' | 'environment' | 'full_telemetry';
  powerKw?: number;
  energyKwh?: number;
  voltage?: number;
  currentAmps?: number;
  powerFactor?: number;
  temperatureC?: number;
  humidityPercent?: number;
  co2Ppm?: number;
  dataSource: DataSourceType;
}

export interface IngestionResult {
  success: boolean;
  readingId?: string;
  message: string;
  validationStatus: DataQualityStatus;
  rejectionReason?: string;
  processedAt: string;
}

export interface CSVIngestionReport {
  batchId: string;
  filename: string;
  importedAt: string;
  totalRows: number;
  acceptedRows: number;
  rejectedRows: number;
  duplicateRows: number;
  dataSource: DataSourceType;
  validationErrors: { row: number; reason: string; raw: string }[];
}

export interface Model3DManifest {
  version: string;
  campusId: string;
  buildings: any[];
  model?: { url: string; format: string; scale?: number };
  buildingMappings?: any[];
}

export interface CampusTelemetryOverview {
  currentCampusDemandKw?: number;
  solarGenerationNowKw?: number;
  gridImportNowKw?: number;
  todayEnergyKwh?: number;
  todayCost?: number;
  peakDemandTodayKw?: number;
  peakDemandTime?: string;
  budgetUtilizationPercent?: number;
  monthCost?: number;
  monthlyBudgetCost?: number;
  monthEnergyKwh?: number;
  onlineDevicesCount?: number;
  totalIotDevices?: number;
  treesEquivalentSaved?: number;
  averagePowerFactor?: number;
  campusEui?: number;
  totalDemandKw?: number;
  solarKw?: number;
  gridKw?: number;
  batteryKw?: number;
}

export interface DataPipelineStatus {
  databaseType: string;
  databasePath: string;
  databaseStatus: 'healthy' | 'degraded' | 'offline';
  totalEnergyReadings: number;
  totalSolarRecords: number;
  totalEnvironmentalReadings: number;
  totalAuditRecords: number;
  totalAlerts: number;
  lastSuccessfulIngestion: string;
  recordsReceivedToday: number;
  invalidRecordsRejected: number;
  activeDataSources: {
    sourceId: string;
    sourceName: string;
    sourceType: DataSourceType;
    lastSeen: string;
    status: 'online' | 'intermittent' | 'offline';
    totalReadingsLogged: number;
  }[];
  recentCsvImports: CSVIngestionReport[];
  anomalyPipeline: {
    rulesEngineStatus: 'active' | 'standby';
    mlIsolationForestStatus: 'operational' | 'training' | 'fallback_to_rules';
    modelVersion: string;
    lastScoredAt: string;
    activeAnomaliesCount: number;
  };
}

export interface BillingRecord {
  id: string;
  month: string;
  year: number;
  totalKwh: number;
  totalCost: number;
  status: 'paid' | 'pending';
}

export interface MaintenanceTicket {
  id: string;
  deviceId: string;
  title: string;
  status: 'open' | 'in_progress' | 'closed';
  priority: 'low' | 'medium' | 'high';
  createdAt: string;
}

export type ReportPeriod = 'daily' | 'weekly' | 'monthly' | 'yearly' | 'custom';

export interface GeneratedReportSummary {
  reportId: string;
  title: string;
  period: ReportPeriod;
  startDate: string;
  endDate: string;
  generatedAt: string;
  generatedByUserId: string;
  generatedByUserName: string;
  generatedByUserRole: string;
  departmentId?: string;
  departmentName?: string;
  buildingId?: string;
  buildingName?: string;
  totalConsumptionKwh: number;
  peakDemandKw: number;
  averageDemandKw: number;
  solarGeneratedKwh: number;
  solarSelfConsumedKwh: number;
  gridImportKwh: number;
  solarOffsetPercent: number;
  carbonAbatedKg: number;
  estimatedCostINR: number;
  solarSavingsINR: number;
  tariffRatePerKwh: number;
  totalAlertsLogged: number;
  resolvedAlertsCount: number;
  openAlertsCount: number;
  dataCoveragePercent: number;
  missingDataIntervalsCount: number;
  sourceBreakdown: {
    sensorPercent: number;
    meterPercent: number;
    simulatedPercent: number;
  };
  breakdown: {
    timestamp: string;
    label: string;
    consumptionKwh: number;
    solarKwh: number;
    gridKwh: number;
    peakKw: number;
    costINR: number;
  }[];
  buildingsBreakdown?: {
    buildingId: string;
    buildingName: string;
    totalKwh: number;
    peakKw: number;
    percentOfCampus: number;
  }[];
}

export interface WaterTank {
  id: string;
  name: string;
  buildingId: string;
  buildingName: string;
  capacityLiters: number;
  currentLevelPercent: number;
  currentVolumeLiters: number;
  status: 'normal' | 'low' | 'overflow_risk' | 'leak_detected';
  flowRateLps: number;
  leakDetected: boolean;
  lastUpdated: string;
  sensorType: string;
}

export interface WaterReading {
  id: string;
  timestamp: string;
  tankId?: string;
  meterId: string;
  buildingId: string;
  consumptionLiters: number;
  flowRateLps: number;
  pressureBar?: number;
  qualityStatus: 'valid' | 'quarantine' | 'rejected';
  dataSource: 'sensor' | 'manual' | 'simulated';
}

export interface SustainabilityScore {
  overallIndex: number;
  grade: 'A+' | 'A' | 'B' | 'C';
  carbonFootprintKg: {
    scope1Direct: number;
    scope2GridElectricity: number;
    scope3Indirect: number;
    totalKg: number;
    offsetBySolarKg: number;
    netCarbonKg: number;
  };
  renewableSharePercent: number;
  energyEfficiencyIndex: number;
  waterRecycledPercent: number;
  wasteDiversionPercent: number;
  calculatedAt: string;
}



