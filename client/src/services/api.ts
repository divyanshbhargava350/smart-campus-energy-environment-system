// API Service for Smart Campus Energy and Environment System
const API_BASE = '/api';

function getHeaders(): HeadersInit {
  const token = localStorage.getItem('mits_token');
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  return headers;
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${url}`, {
    ...options,
    headers: { ...getHeaders(), ...(options?.headers || {}) }
  });
  const data = await res.json();
  if (!res.ok && res.status === 401) {
    try {
      localStorage.removeItem('mits_token');
      localStorage.removeItem('mits_user');
    } catch { /* ignore */ }
    window.dispatchEvent(new CustomEvent('mits_auth_logout'));
  }
  return data;
}

export const api = {
  // Auth
  register: (body: any) => request<any>('/auth/register', { method: 'POST', body: JSON.stringify(body) }),
  login: (body: any) => request<any>('/auth/login', { method: 'POST', body: JSON.stringify(body) }),
  me: () => request<any>('/auth/me'),

  // Multi-Campus
  campuses: () => request<any>('/campuses'),
  switchCampus: (campusId: string) => request<any>('/campuses/switch', { method: 'POST', body: JSON.stringify({ campusId }) }),

  // Campus Core
  overview: () => request<any>('/campus/overview'),
  buildings: () => request<any>('/campus/buildings'),
  building: (id: string) => request<any>(`/campus/buildings/${id}`),
  facilities: () => request<any>('/campus/facilities'),
  facility: (id: string) => request<any>(`/campus/facilities/${id}`),
  departments: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/campus/departments${q}`);
  },
  department: (id: string) => request<any>(`/campus/departments/${id}`),
  rooms: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/campus/rooms${q}`);
  },

  // Machine Learning (XGBoost & Isolation Forest & LLM Assistant)
  mlForecast: () => request<any>('/ml/forecast'),
  mlAnomalies: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/ml/anomalies${q}`);
  },
  mlAnomalyAction: (id: string, body: { status: string; reason?: string; actionTaken?: string; verifiedCondition?: string }) =>
    request<any>(`/ml/anomalies/${id}/action`, { method: 'POST', body: JSON.stringify(body) }),
  recurringFaults: () => request<any>('/faults/recurring'),
  mlTrain: (csvPath?: string) => request<any>('/ml/train', { method: 'POST', body: JSON.stringify({ csvPath }) }),
  mlChat: (message: string, config?: any) => request<any>('/ml/chat', { method: 'POST', body: JSON.stringify({ message, config }) }),
  aiAuditQueries: () => request<any>('/ml/chat/audit'),

  // Dataset Ingestion Pipeline
  datasets: () => request<any>('/datasets/list'),
  datasetPreview: () => request<any>('/datasets/preview'),
  uploadDatasetFile: (body: { csvText: string; filename: string }) =>
    request<any>('/datasets/upload', { method: 'POST', body: JSON.stringify(body) }),

  // Measurement & Verification (M&V) Optimization Savings
  savingsVerifications: () => request<any>('/savings-verification'),
  createSavingsVerification: (body: any) => request<any>('/savings-verification', { method: 'POST', body: JSON.stringify(body) }),

  // Environmental & Water Monitoring
  environmentalZones: () => request<any>('/environmental/zones'),
  environmentOverview: () => request<any>('/environment'),
  waterOverview: () => request<any>('/water/overview'),
  waterTanks: () => request<any>('/water/tanks'),
  waterReadings: (tankId?: string) => request<any>(`/water/readings${tankId ? `?tankId=${tankId}` : ''}`),
  ingestWater: (body: any) => request<any>('/water/ingest', { method: 'POST', body: JSON.stringify(body) }),

  // Sustainability & ESG Analytics
  sustainabilityScore: () => request<any>('/sustainability/score'),
  campusAnalytics: () => request<any>('/analytics'),
  systemHealth: () => request<any>('/health'),

  // Energy & Telemetry
  solarGridCurve: () => request<any>('/energy/solar-grid-curve'),
  buildingComparison: () => request<any>('/energy/building-comparison'),
  departmentComparison: () => request<any>('/energy/department-comparison'),
  wastageRanking: () => request<any>('/energy/wastage-ranking'),

  // Billing
  billingOverview: () => request<any>('/billing/overview'),
  tariff: () => request<any>('/tariff'),
  updateTariff: (body: any) => request<any>('/tariff', { method: 'PUT', body: JSON.stringify(body) }),

  // Alerts
  alerts: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/alerts${q}`);
  },
  acknowledgeAlert: (id: string, note?: string) =>
    request<any>(`/alerts/${id}/acknowledge`, { method: 'POST', body: JSON.stringify({ note }) }),
  resolveAlert: (id: string, body?: { resolutionNote?: string; actionTaken?: string; diagnosticNotes?: string; verifiedCondition?: string }) =>
    request<any>(`/alerts/${id}/resolve`, {
      method: 'POST',
      body: JSON.stringify(body || { resolutionNote: 'Fault verified and resolved by campus operator' })
    }),
  reopenAlert: (id: string, note?: string) =>
    request<any>(`/alerts/${id}/reopen`, { method: 'POST', body: JSON.stringify({ note }) }),

  // Devices & Data Sources
  devices: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/devices${q}`);
  },
  dataSources: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/datasources${q}`);
  },
  registerDataSource: (data: any) =>
    request<any>('/datasources/register', { method: 'POST', body: JSON.stringify(data) }),
  testDataSource: (id: string) =>
    request<any>(`/datasources/${id}/test`, { method: 'POST' }),
  toggleDataSource: (id: string) =>
    request<any>(`/datasources/${id}/toggle`, { method: 'PUT' }),
  updateDataSource: (id: string, data: any) =>
    request<any>(`/datasources/${id}`, { method: 'PUT', body: JSON.stringify(data) }),

  // Reports
  reportSummary: () => request<any>('/reports/energy-summary'),
  reportWeekly: (week?: number, year?: number) => request<any>(`/reports/weekly?week=${week || 1}&year=${year || 2024}`),
  reportMonthly: (month?: number, year?: number) => request<any>(`/reports/monthly?month=${month || 1}&year=${year || 2024}`),
  generateReport: (body: { period: string; startDate?: string; endDate?: string; departmentId?: string; buildingId?: string }) =>
    request<any>('/reports/generate', { method: 'POST', body: JSON.stringify(body) }),
  auditLogs: () => request<any>('/audit-logs'),

  // Room-Level Appliances, Hardware Relays & Control
  roomDetail: (id: string) => request<any>(`/campus/rooms/${id}`),
  appliances: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/appliances${q}`);
  },
  applianceHistory: (applianceId?: string) =>
    request<any>(`/appliances/history${applianceId ? `?applianceId=${applianceId}` : ''}`),
  controlAppliance: (id: string, state: 'on' | 'off', reason?: string, mode?: 'demo' | 'hardware') =>
    request<any>(`/appliances/${id}/control`, { method: 'POST', body: JSON.stringify({ state, reason, mode }) }),
  roomCommands: (roomId: string) =>
    request<any>(`/rooms/${roomId}/commands`),
  hardwareStatus: () => request<any>('/hardware/status'),
  verifiedBuildings: () => request<any>('/buildings/verified'),

  // Automation Schedules
  schedules: (roomId?: string) => {
    const q = roomId ? `?roomId=${encodeURIComponent(roomId)}` : '';
    return request<any>(`/schedules${q}`);
  },
  createSchedule: (body: any) => request<any>('/schedules', { method: 'POST', body: JSON.stringify(body) }),
  toggleSchedule: (id: string) => request<any>(`/schedules/${id}/toggle`, { method: 'PUT' }),
  deleteSchedule: (id: string) => request<any>(`/schedules/${id}`, { method: 'DELETE' }),

  // High Load Mitigation Workflow
  simulateHighLoadAction: (roomId: string) =>
    request<any>('/high-load/simulate', { method: 'POST', body: JSON.stringify({ roomId }) }),
  executeHighLoadAction: (payload: { roomId: string; applianceIds: string[]; reason?: string }) =>
    request<any>('/high-load/execute', { method: 'POST', body: JSON.stringify(payload) }),

  // Energy Data Pipeline & Central Storage
  pipelineIngest: (body: any) =>
    request<any>('/pipeline/ingest', { method: 'POST', body: JSON.stringify(body) }),
  pipelineReadings: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/pipeline/readings${q}`);
  },
  pipelineStatus: () => request<any>('/pipeline/status'),
  pipelineUploadCsv: (body: { csvText: string; filename?: string }) =>
    request<any>('/pipeline/upload-csv', { method: 'POST', body: JSON.stringify(body) }),
  pipelineGenerateDemoBatch: () =>
    request<any>('/pipeline/generate-demo-batch', { method: 'POST' }),
  pipelineSyntheticSample: () =>
    request<any>('/pipeline/synthetic-sample-csv'),

  // Solar Energy Monitoring
  solarOverview: () => request<any>('/solar/overview'),
  solarIngest: (body: any) =>
    request<any>('/solar/ingest', { method: 'POST', body: JSON.stringify(body) }),
  solarHistory: (params?: Record<string, string>) => {
    const q = params ? '?' + new URLSearchParams(params).toString() : '';
    return request<any>(`/solar/history${q}`);
  },

  // Unused Equipment & Idle Energy Analytics
  unusedEquipmentFindings: (status?: string) => {
    const q = status ? `?status=${encodeURIComponent(status)}` : '';
    return request<any>(`/equipment/unused-findings${q}`);
  },
  unusedEquipmentAction: (id: string, action: string, resolutionNotes?: string) =>
    request<any>(`/equipment/unused-findings/${id}/action`, { method: 'POST', body: JSON.stringify({ action, resolutionNotes }) }),

  // Admin
  adminUsers: () => request<any>('/admin/users'),
  simulatorStatus: () => request<any>('/admin/simulator'),
  toggleSimulator: () => request<any>('/admin/simulator/toggle', { method: 'POST' }),
  updateThresholds: (body: any) => request<any>('/admin/thresholds', { method: 'PUT', body: JSON.stringify(body) }),
};
