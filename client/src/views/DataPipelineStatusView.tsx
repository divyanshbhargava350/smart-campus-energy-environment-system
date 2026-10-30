import React, { useState, useEffect } from 'react';
import {
  Database, Server, CheckCircle2, AlertTriangle, RefreshCw,
  Upload, Send, ShieldAlert, Cpu, Activity, Clock, FileText,
  Trash2, X, Check, Zap, Play, Filter, Info, Eye, Layers,
  Plus, Wifi, WifiOff, Globe, Radio, ShieldCheck
} from 'lucide-react';
import { api } from '../services/api.js';
import { DataPipelineStatus, UnusedEquipmentFinding, IngestionPayload } from '../../../shared/types.js';

interface DataPipelineStatusViewProps {
  onNavigateToTab?: (tab: any) => void;
}

export const DataPipelineStatusView: React.FC<DataPipelineStatusViewProps> = ({ onNavigateToTab }) => {
  const [pipelineStatus, setPipelineStatus] = useState<DataPipelineStatus | null>(null);
  const [unusedFindings, setUnusedFindings] = useState<UnusedEquipmentFinding[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // Data Sources Fleet Management State
  const [dataSources, setDataSources] = useState<any[]>([]);
  const [showAddSourceModal, setShowAddSourceModal] = useState<boolean>(false);
  const [testingSourceId, setTestingSourceId] = useState<string | null>(null);
  const [testResults, setTestResults] = useState<{ [id: string]: any }>({});
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [sourceSearch, setSourceSearch] = useState<string>('');

  const [newSource, setNewSource] = useState({
    id: '',
    name: '',
    sourceType: 'esp32',
    protocol: 'MQTT',
    endpointOrMac: '192.168.1.120:502',
    buildingId: 'MITS_AI_BUILDING',
    floor: 'Ground Floor',
    roomId: '',
    samplingRateSeconds: 15,
    parameters: ['voltage', 'current', 'powerKw', 'energyKwh'],
    isSimulated: true
  });
  const [registerError, setRegisterError] = useState<string | null>(null);
  const [registerSuccess, setRegisterSuccess] = useState<string | null>(null);
  const [isRegistering, setIsRegistering] = useState<boolean>(false);

  // Ingestion API Interactive Test Console
  const [testPayload, setTestPayload] = useState<IngestionPayload>({
    deviceId: 'MITS-ESP32-M004-TEST',
    buildingId: 'MITS_AI_BUILDING',
    roomId: 'ROOM_M004',
    measurementType: 'full_telemetry',
    powerKw: 3.4,
    energyKwh: 28.5,
    voltage: 231.5,
    currentAmps: 14.7,
    powerFactor: 0.96,
    dataSource: 'sensor'
  });
  const [ingestTestResult, setIngestTestResult] = useState<any>(null);
  const [isSubmittingIngest, setIsSubmittingIngest] = useState<boolean>(false);

  // CSV Import State
  const [csvText, setCsvText] = useState<string>('');
  const [csvFilename, setCsvFilename] = useState<string>('meter_readings_sample.csv');
  const [isUploadingCsv, setIsUploadingCsv] = useState<boolean>(false);
  const [csvReport, setCsvReport] = useState<any>(null);

  // Demo Batch Generation State
  const [isGeneratingDemo, setIsGeneratingDemo] = useState<boolean>(false);
  const [demoMessage, setDemoMessage] = useState<string | null>(null);

  // Mitigation Action
  const [mitigatingId, setMitigatingId] = useState<string | null>(null);

  const fetchDataSources = () => {
    api.dataSources().then(res => {
      if (res.success && res.data) {
        setDataSources(res.data);
      }
    }).catch(err => console.error('Error fetching data sources:', err));
  };

  const fetchStatus = () => {
    setLoading(true);
    api.pipelineStatus().then(res => {
      setLoading(false);
      if (res.success && res.data) {
        setPipelineStatus(res.data);
      }
    }).catch(err => {
      setLoading(false);
      console.error('Error fetching pipeline status:', err);
    });

    api.unusedEquipmentFindings().then(res => {
      if (res.success && res.data) {
        setUnusedFindings(res.data);
      }
    });

    fetchDataSources();
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleTestConnection = async (sourceId: string) => {
    setTestingSourceId(sourceId);
    try {
      const res = await api.testDataSource(sourceId);
      setTestingSourceId(null);
      setTestResults(prev => ({ ...prev, [sourceId]: res }));
    } catch (err: any) {
      setTestingSourceId(null);
      setTestResults(prev => ({
        ...prev,
        [sourceId]: { success: false, message: err?.message || 'Connection ping failed.' }
      }));
    }
  };

  const handleToggleSource = async (sourceId: string) => {
    try {
      const res = await api.toggleDataSource(sourceId);
      if (res.success) {
        fetchDataSources();
      }
    } catch (err) {
      console.error('Toggle error:', err);
    }
  };

  const handleRegisterSource = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSource.id.trim() || !newSource.name.trim() || !newSource.buildingId) {
      setRegisterError('Please fill in required fields: ID, Name, and Building.');
      return;
    }

    setIsRegistering(true);
    setRegisterError(null);
    setRegisterSuccess(null);

    try {
      const res = await api.registerDataSource(newSource);
      setIsRegistering(false);
      if (res.success) {
        setRegisterSuccess(res.message);
        fetchDataSources();
        setTimeout(() => {
          setShowAddSourceModal(false);
          setRegisterSuccess(null);
          setNewSource({
            id: '',
            name: '',
            sourceType: 'esp32',
            protocol: 'MQTT',
            endpointOrMac: '192.168.1.120:502',
            buildingId: 'MITS_AI_BUILDING',
            floor: 'Ground Floor',
            roomId: '',
            samplingRateSeconds: 15,
            parameters: ['voltage', 'current', 'powerKw', 'energyKwh'],
            isSimulated: true
          });
        }, 1200);
      } else {
        setRegisterError(res.message || 'Failed to register data source.');
      }
    } catch (err: any) {
      setIsRegistering(false);
      setRegisterError(err?.message || 'Network error registering data source.');
    }
  };

  const handleTestIngest = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingIngest(true);
    setIngestTestResult(null);
    try {
      const res = await api.pipelineIngest({
        ...testPayload,
        timestamp: new Date().toISOString()
      });
      setIsSubmittingIngest(false);
      setIngestTestResult(res);
      fetchStatus();
    } catch (err: any) {
      setIsSubmittingIngest(false);
      setIngestTestResult({ success: false, message: err?.message || 'Ingestion failed' });
    }
  };

  const handleCsvUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!csvText.trim()) return;
    setIsUploadingCsv(true);
    setCsvReport(null);
    try {
      const res = await api.pipelineUploadCsv({
        csvText,
        filename: csvFilename
      });
      setIsUploadingCsv(false);
      if (res.success) {
        setCsvReport(res.report);
        fetchStatus();
      }
    } catch (err: any) {
      setIsUploadingCsv(false);
      console.error('CSV upload error:', err);
    }
  };

  const [csvUploadSuccessMsg, setCsvUploadSuccessMsg] = useState<string | null>(null);
  const [syntheticLoading, setSyntheticLoading] = useState<boolean>(false);

  const handleLoadSyntheticCsv = async () => {
    setSyntheticLoading(true);
    setCsvUploadSuccessMsg(null);
    try {
      const res = await api.pipelineSyntheticSample();
      if (res.success && res.csvText) {
        setCsvText(res.csvText);
        setCsvFilename(res.filename || 'synthetic_campus_energy_usage.csv');
        setCsvUploadSuccessMsg(`Loaded MITS synthetic dataset (${res.rowCount} records) into pipeline.`);
        setTimeout(() => setCsvUploadSuccessMsg(null), 4000);
      }
    } catch (err) {
      console.error('Error loading synthetic sample:', err);
    } finally {
      setSyntheticLoading(false);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setCsvFilename(file.name);
      setCsvUploadSuccessMsg(null);
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        if (text) {
          setCsvText(text);
          const lines = text.trim().split(/\r?\n/).length - 1;
          setCsvUploadSuccessMsg(`Selected "${file.name}" (${lines} records ready for validation).`);
        }
      };
      reader.readAsText(file);
    }
  };

  const handleLoadSampleCsv = () => {
    const sample = `meterId,buildingId,powerKw,energyKwh,timestamp\n` +
      `DEV_AI-BLOCK_METER,MITS_AI_BUILDING,48.2,385.0,${new Date().toISOString()}\n` +
      `DEV_MAIN-BLDG_METER,MITS_MAIN_BUILDING,152.0,1230.5,${new Date().toISOString()}\n` +
      `DEV_WORKSHOP_METER,MITS_WORKSHOP,73.5,590.2,${new Date().toISOString()}\n` +
      `DEV_INVALID_METER,MITS_AI_BUILDING,-12.5,0.0,${new Date().toISOString()}\n` +
      `DEV_LIBRARY_METER,MITS_LIBRARY,24.1,198.0,${new Date().toISOString()}`;
    setCsvText(sample);
  };

  const handleGenerateDemoBatch = async () => {
    setIsGeneratingDemo(true);
    setDemoMessage(null);
    try {
      const res = await api.pipelineGenerateDemoBatch();
      setIsGeneratingDemo(false);
      if (res.success) {
        setDemoMessage(res.message);
        fetchStatus();
        setTimeout(() => setDemoMessage(null), 5000);
      }
    } catch (err) {
      setIsGeneratingDemo(false);
      console.error('Demo generation error:', err);
    }
  };

  const handleMitigateFinding = async (findingId: string) => {
    setMitigatingId(findingId);
    try {
      const res = await api.unusedEquipmentAction(findingId, 'mitigate', 'Remote shutdown executed by Facility Manager');
      setMitigatingId(null);
      if (res.success) {
        fetchStatus();
      }
    } catch (err) {
      setMitigatingId(null);
      console.error('Mitigation error:', err);
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ================= HEADER ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-cyan-500/20 text-cyan-400">
              <Database className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Energy Data Pipeline & Ingestion Diagnostics
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Real-time Ingestion API, Central Database Storage, CSV Adapter & Unused Energy Analytics
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={isGeneratingDemo}
            onClick={handleGenerateDemoBatch}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] transition-all"
          >
            {isGeneratingDemo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-cyan-400" />}
            Generate Verified Demo Batch
          </button>
          <button
            onClick={fetchStatus}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh Status
          </button>
        </div>
      </div>

      {demoMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{demoMessage}</span>
        </div>
      )}

      {/* ================= PIPELINE HEALTH METRICS ================= */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Database Health</span>
          <div className="flex items-center gap-1.5 mt-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-base font-bold text-emerald-400">Operational</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-1 truncate">
            MITS Centralized JSON DB
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Energy Readings Stored</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-cyan-400">{pipelineStatus?.totalEnergyReadings}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Persisted on Server Disk
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Solar Generation Records</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-amber-400">{pipelineStatus?.totalSolarRecords}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Inverter Telemetry Intervals
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Audit Log Entries</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{pipelineStatus?.totalAuditRecords}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Role & Command History
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">Rejected Invalid Records</span>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-rose-400">{pipelineStatus?.invalidRecordsRejected}</span>
          </div>
          <span className="text-[10px] text-rose-400 block mt-1">
            Blocked Malformed Data
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">ML Anomaly Engine</span>
          <div className="mt-2">
            <span className="text-base font-bold text-teal-400">Active</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-1 truncate">
            {pipelineStatus?.anomalyPipeline.modelVersion}
          </span>
        </div>
      </div>

      {/* ================= DATA SOURCES FLEET & HARDWARE REGISTRY ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[var(--border-color)]">
          <div>
            <div className="flex items-center gap-2">
              <Server className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Real-Time Data Sources & Hardware Registry
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Configured ESP32 microcontrollers, Modbus power meters, solar inverters, and ambient environmental sensors
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAddSourceModal(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" /> Add Data Source
            </button>
          </div>
        </div>

        {/* Filter & Search Bar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-1.5 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-color)] overflow-x-auto">
            {['all', 'smart_meter', 'esp32', 'solar_inverter', 'env_sensor'].map(f => (
              <button
                key={f}
                onClick={() => setSourceFilter(f)}
                className={`px-2.5 py-1 rounded text-[11px] capitalize font-medium transition-all ${
                  sourceFilter === f
                    ? 'bg-cyan-600 text-white font-bold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {f === 'all' ? 'All Sources' : f.replace('_', ' ')}
              </button>
            ))}
          </div>

          <div className="relative w-full sm:w-64">
            <input
              type="text"
              placeholder="Search source (ID, name, location)..."
              value={sourceSearch}
              onChange={(e) => setSourceSearch(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>

        {/* Data Sources Fleet Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-[11px]">
                <th className="text-left py-2 font-semibold">Device / Hardware ID</th>
                <th className="text-left py-2 font-semibold">Source Name & Location</th>
                <th className="text-center py-2 font-semibold">Protocol & Type</th>
                <th className="text-center py-2 font-semibold">Sampling</th>
                <th className="text-center py-2 font-semibold">Connection State</th>
                <th className="text-right py-2 font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-color)]">
              {dataSources
                .filter(d => {
                  if (sourceFilter !== 'all') {
                    if (d.type !== sourceFilter && d.sourceType !== sourceFilter) return false;
                  }
                  if (sourceSearch.trim()) {
                    const q = sourceSearch.toLowerCase();
                    return (
                      d.id.toLowerCase().includes(q) ||
                      d.name.toLowerCase().includes(q) ||
                      (d.buildingName || '').toLowerCase().includes(q)
                    );
                  }
                  return true;
                })
                .map(src => {
                  const isTesting = testingSourceId === src.id;
                  const testRes = testResults[src.id];
                  const isOnline = src.status === 'online';
                  const connState = src.connectionState || (src.isSimulated ? 'Demo mode' : isOnline ? 'Connected' : 'Offline');

                  return (
                    <React.Fragment key={src.id}>
                      <tr className="hover:bg-[var(--bg-tertiary)]/60 transition-colors">
                        <td className="py-2.5 font-mono text-cyan-400 font-bold">
                          {src.id}
                          <span className="block text-[10px] text-[var(--text-muted)] font-normal">
                            {src.endpointOrMac || '192.168.1.100'} • {src.firmwareVersion || 'v2.4'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="font-semibold text-[var(--text-primary)] block">
                            {src.name}
                          </span>
                          <span className="text-[10px] text-[var(--text-muted)]">
                            {src.buildingName} {src.roomName ? `• ${src.roomName}` : ''} ({src.floor || 'Ground'})
                          </span>
                        </td>
                        <td className="py-2.5 text-center">
                          <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-slate-300">
                            {src.protocol || 'MQTT'} / {src.sourceType || src.type}
                          </span>
                        </td>
                        <td className="py-2.5 text-center font-mono text-slate-300">
                          {src.samplingRateSeconds || 15}s
                        </td>
                        <td className="py-2.5 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            connState === 'Connected'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : connState === 'Demo mode'
                              ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}>
                            {connState}
                          </span>
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              disabled={isTesting}
                              onClick={() => handleTestConnection(src.id)}
                              className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-cyan-600 hover:text-white border border-[var(--border-color)] text-cyan-300 text-[10px] font-bold transition-all flex items-center gap-1"
                              title="Ping device & verify telemetry handshake"
                            >
                              {isTesting ? (
                                <RefreshCw className="w-3 h-3 animate-spin" />
                              ) : (
                                <Wifi className="w-3 h-3 text-cyan-400" />
                              )}
                              Test Connection
                            </button>

                            <button
                              onClick={() => handleToggleSource(src.id)}
                              className={`px-2 py-1 rounded text-[10px] font-bold transition-all ${
                                isOnline
                                  ? 'bg-rose-500/10 text-rose-400 hover:bg-rose-500 hover:text-white'
                                  : 'bg-emerald-500/10 text-emerald-400 hover:bg-emerald-500 hover:text-white'
                              }`}
                              title={isOnline ? 'Disable data stream (retains history)' : 'Enable data stream'}
                            >
                              {isOnline ? 'Disable' : 'Enable'}
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Live Test Results Accordion Row */}
                      {testRes && (
                        <tr className="bg-[var(--bg-tertiary)]/40">
                          <td colSpan={6} className="py-2 px-3">
                            <div className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
                              testRes.success
                                ? 'bg-emerald-950/20 border-emerald-500/30 text-emerald-300'
                                : 'bg-rose-950/20 border-rose-500/30 text-rose-300'
                            }`}>
                              <div className="flex items-center gap-2">
                                {testRes.success ? (
                                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                                )}
                                <span>{testRes.message}</span>
                              </div>

                              {testRes.testReading && (
                                <div className="flex items-center gap-3 font-mono text-[11px] text-slate-300">
                                  <span>Latency: <strong>{testRes.latencyMs} ms</strong></span>
                                  <span>Voltage: <strong>{testRes.testReading.voltage} V</strong></span>
                                  <span>Power: <strong>{testRes.testReading.powerKw} kW</strong></span>
                                  <span>PF: <strong>{testRes.testReading.powerFactor}</strong></span>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
            </tbody>
          </table>
        </div>
      </div>

      {/* ================= REGISTER DATA SOURCE MODAL ================= */}
      {showAddSourceModal && (
        <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4 animate-fadeIn">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-base font-bold text-[var(--text-primary)]">
                  Register New Campus Data Source
                </h3>
                <p className="text-xs text-[var(--text-muted)] mt-0.5">
                  Configure hardware device, sensor type, location assignment, and telemetry sampling
                </p>
              </div>
              <button
                onClick={() => setShowAddSourceModal(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {registerError && (
              <div className="p-2.5 rounded-lg bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
                <span>{registerError}</span>
              </div>
            )}

            {registerSuccess && (
              <div className="p-2.5 rounded-lg bg-emerald-500/15 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>{registerSuccess}</span>
              </div>
            )}

            <form onSubmit={handleRegisterSource} className="space-y-3 text-xs">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Unique Hardware / Device ID:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. MITS-MTR-AI-01"
                    value={newSource.id}
                    onChange={(e) => setNewSource({ ...newSource, id: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 font-mono text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-bold"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Friendly Name:</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. AI Lab 3-Phase Sub-meter"
                    value={newSource.name}
                    onChange={(e) => setNewSource({ ...newSource, name: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Source Type:</label>
                  <select
                    value={newSource.sourceType}
                    onChange={(e) => setNewSource({ ...newSource, sourceType: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="esp32">ESP32 IoT Controller</option>
                    <option value="modbus_meter">Energy Meter (Modbus/RS485)</option>
                    <option value="solar_inverter">Solar Inverter (Modbus/TCP)</option>
                    <option value="env_sensor">Environmental Sensor</option>
                    <option value="csv_import">CSV Ingestion Adapter</option>
                    <option value="external_api">External Energy API</option>
                    <option value="demo">Demo Telemetry Simulator</option>
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Network Protocol:</label>
                  <select
                    value={newSource.protocol}
                    onChange={(e) => setNewSource({ ...newSource, protocol: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MQTT">MQTT (TLS 8883)</option>
                    <option value="Modbus-TCP">Modbus-TCP (Port 502)</option>
                    <option value="Modbus-RTU">Modbus-RTU (RS-485)</option>
                    <option value="HTTP-REST">HTTP REST API</option>
                    <option value="BACnet">BACnet/IP</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Endpoint IP:Port / MAC Address:</label>
                  <input
                    type="text"
                    placeholder="192.168.1.120:502 or 24:6F:28:..."
                    value={newSource.endpointOrMac}
                    onChange={(e) => setNewSource({ ...newSource, endpointOrMac: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Sampling Rate (seconds):</label>
                  <input
                    type="number"
                    min="1"
                    max="3600"
                    value={newSource.samplingRateSeconds}
                    onChange={(e) => setNewSource({ ...newSource, samplingRateSeconds: parseInt(e.target.value) || 15 })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Building Location:</label>
                  <select
                    value={newSource.buildingId}
                    onChange={(e) => setNewSource({ ...newSource, buildingId: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="MITS_AI_BUILDING">AI & Data Science Block</option>
                    <option value="MITS_MAIN_BUILDING">Main Academic Building</option>
                    <option value="MITS_WORKSHOP">Central Workshop</option>
                    <option value="MITS_LIBRARY">Central Library</option>
                    <option value="MITS_ARCH_BUILDING">Architecture Block</option>
                    <option value="MITS_HOSTEL_BLOCKS">Hostel Complex</option>
                  </select>
                </div>

                <div>
                  <label className="text-[var(--text-muted)] block mb-1">Floor Level:</label>
                  <select
                    value={newSource.floor}
                    onChange={(e) => setNewSource({ ...newSource, floor: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  >
                    <option value="Ground Floor">Ground Floor</option>
                    <option value="First Floor">First Floor</option>
                    <option value="Second Floor">Second Floor</option>
                    <option value="Third Floor">Third Floor</option>
                    <option value="Rooftop">Rooftop</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="isSimulatedCheck"
                  checked={newSource.isSimulated}
                  onChange={(e) => setNewSource({ ...newSource, isSimulated: e.target.checked })}
                  className="rounded bg-[var(--bg-tertiary)] border-[var(--border-color)] text-cyan-500 focus:ring-0"
                />
                <label htmlFor="isSimulatedCheck" className="text-xs text-[var(--text-secondary)]">
                  Register as <strong>Demo Mode</strong> telemetry (honestly labeled for testing without physical mains wiring)
                </label>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddSourceModal(false)}
                  className="px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-secondary)] text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isRegistering}
                  className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-bold shadow-sm flex items-center gap-1.5"
                >
                  {isRegistering ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Check className="w-3.5 h-3.5" />}
                  Register & Synchronize Source
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= INTERACTIVE INGESTION CONSOLE & CSV IMPORT ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* Left: REST Ingestion Live Test Console */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-cyan-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                REST Ingestion API Test Console (ESP32 / Meter)
              </h3>
            </div>
            <span className="font-mono text-[10px] text-cyan-300 bg-cyan-500/10 px-2 py-0.5 rounded border border-cyan-500/20">
              POST /api/pipeline/ingest
            </span>
          </div>

          <form onSubmit={handleTestIngest} className="space-y-3 text-xs">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1">Meter / Device ID:</label>
                <input
                  type="text"
                  required
                  value={testPayload.deviceId}
                  onChange={(e) => setTestPayload({ ...testPayload, deviceId: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1">Building Location:</label>
                <select
                  value={testPayload.buildingId}
                  onChange={(e) => setTestPayload({ ...testPayload, buildingId: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                >
                  <option value="MITS_AI_BUILDING">AI & Data Science Block</option>
                  <option value="MITS_MAIN_BUILDING">Main Academic Building</option>
                  <option value="MITS_WORKSHOP">Central Workshop</option>
                  <option value="MITS_LIBRARY">Central Library</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-[var(--text-muted)] block mb-1">Power (kW):</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={testPayload.powerKw}
                  onChange={(e) => setTestPayload({ ...testPayload, powerKw: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 font-mono text-xs text-cyan-400 focus:outline-none focus:border-cyan-500 font-bold"
                />
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1">Energy (kWh):</label>
                <input
                  type="number"
                  step="0.1"
                  required
                  value={testPayload.energyKwh}
                  onChange={(e) => setTestPayload({ ...testPayload, energyKwh: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 font-mono text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[var(--text-muted)] block mb-1">Data Source Tag:</label>
                <select
                  value={testPayload.dataSource}
                  onChange={(e) => setTestPayload({ ...testPayload, dataSource: e.target.value as any })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                >
                  <option value="sensor">Actual Sensor</option>
                  <option value="manual">Manual Reading</option>
                  <option value="simulated">Simulated</option>
                </select>
              </div>
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[var(--text-muted)]">
                Validates: 0.0 &le; kW &le; 2500, non-negative kWh & duplicate suppression
              </span>
              <button
                type="submit"
                disabled={isSubmittingIngest}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm flex items-center gap-1.5"
              >
                {isSubmittingIngest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
                Send Ingest Request
              </button>
            </div>
          </form>

          {/* Result Output */}
          {ingestTestResult && (
            <div className={`p-3 rounded-lg border text-xs space-y-1 ${
              ingestTestResult.success
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
            }`}>
              <div className="flex items-center justify-between font-bold">
                <span className="flex items-center gap-1.5">
                  {ingestTestResult.success ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <AlertTriangle className="w-4 h-4 text-rose-400" />}
                  {ingestTestResult.success ? 'HTTP 201 Created (Verified & Stored)' : 'HTTP 422 / 409 Rejected'}
                </span>
                <span className="font-mono text-[10px]">{ingestTestResult.readingId || 'REJECTED'}</span>
              </div>
              <p className="text-[11px] text-[var(--text-primary)]">{ingestTestResult.message}</p>
            </div>
          )}
        </div>

        {/* Right: CSV Bulk Ingestion Adapter & Synthetic Data Upload */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
            <div className="flex items-center gap-2">
              <Upload className="w-4 h-4 text-emerald-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                CSV Ingestion & Synthetic Data Upload
              </h3>
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              <button
                type="button"
                onClick={handleLoadSyntheticCsv}
                disabled={syntheticLoading}
                className="px-2.5 py-1 rounded bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1 transition-all"
                title="Load the 300-row Kaggle synthetic campus dataset"
              >
                {syntheticLoading ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Database className="w-3 h-3" />}
                Load Synthetic Dataset (300 Rows)
              </button>
              <button
                type="button"
                onClick={handleLoadSampleCsv}
                className="text-xs text-cyan-400 hover:underline font-medium"
              >
                Fill Sample CSV
              </button>
            </div>
          </div>

          {/* Quick Synthetic Demo Generator Strip */}
          <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-cyan-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <span className="text-[11px] font-bold text-white flex items-center gap-1.5">
                <Play className="w-3.5 h-3.5 text-cyan-400" />
                Live Synthetic Telemetry Batch Generator
              </span>
              <span className="text-[10px] text-[var(--text-muted)] block">
                Generates instant live telemetry across all 10 campus feeder meters with tag "simulated"
              </span>
            </div>
            <button
              type="button"
              onClick={handleGenerateDemoBatch}
              disabled={isGeneratingDemo}
              className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white font-bold text-xs shadow-sm flex items-center gap-1.5 shrink-0 transition-all"
            >
              {isGeneratingDemo ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5" />}
              Generate Synthetic Batch
            </button>
          </div>

          {demoMessage && (
            <div className="p-2.5 rounded-lg bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{demoMessage}</span>
            </div>
          )}

          {/* Direct File Picker / Drag Drop */}
          <div className="space-y-1.5">
            <label className="text-[11px] font-semibold text-[var(--text-primary)] block">
              Upload CSV / Synthetic Dataset File:
            </label>
            <div className="flex items-center gap-2">
              <label className="cursor-pointer px-3 py-1.5 rounded-lg bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] border border-dashed border-cyan-500/40 text-cyan-300 text-xs font-semibold flex items-center gap-2 transition-all">
                <Upload className="w-3.5 h-3.5" />
                <span>Browse File (.csv)...</span>
                <input
                  type="file"
                  accept=".csv,text/csv"
                  onChange={handleFileInputChange}
                  className="hidden"
                />
              </label>
              <input
                type="text"
                placeholder="filename.csv"
                value={csvFilename}
                onChange={(e) => setCsvFilename(e.target.value)}
                className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1.5 text-xs text-[var(--text-primary)] font-mono"
              />
            </div>
            {csvUploadSuccessMsg && (
              <span className="text-[10px] text-emerald-400 font-semibold block animate-fadeIn">
                ✓ {csvUploadSuccessMsg}
              </span>
            )}
          </div>

          <form onSubmit={handleCsvUpload} className="space-y-3 text-xs">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label className="text-[var(--text-muted)]">Raw CSV Data (Header + Rows):</label>
                <span className="text-[10px] text-[var(--text-muted)] font-mono">
                  {csvText ? `${csvText.trim().split(/\r?\n/).length - 1} rows detected` : 'Empty'}
                </span>
              </div>
              <textarea
                rows={5}
                required
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="meterId,buildingId,powerKw,energyKwh,timestamp"
                className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg p-2 font-mono text-[11px] text-[var(--text-primary)] focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] text-[var(--text-muted)]">
                Per-row validation: isolates corrupt rows and accepts valid ones
              </span>
              <button
                type="submit"
                disabled={isUploadingCsv || !csvText.trim()}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm flex items-center gap-1.5"
              >
                {isUploadingCsv ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                Process CSV Ingestion
              </button>
            </div>
          </form>

          {/* CSV Report Summary */}
          {csvReport && (
            <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs space-y-2">
              <div className="flex justify-between items-center font-bold">
                <span className="text-[var(--text-primary)]">Batch: {csvReport.batchId}</span>
                <span className="text-emerald-400 font-mono">{csvReport.acceptedRows} Accepted / {csvReport.rejectedRows} Rejected</span>
              </div>
              {csvReport.validationErrors.length > 0 && (
                <div className="space-y-1 text-[11px] text-rose-300 max-h-24 overflow-y-auto">
                  {csvReport.validationErrors.map((err: any, idx: number) => (
                    <div key={idx} className="flex items-center gap-1.5">
                      <span className="w-1.5 h-1.5 rounded-full bg-rose-400 shrink-0" />
                      <span>Row {err.row}: {err.reason}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ================= UNUSED EQUIPMENT & ENERGY WASTE ANALYTICS ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
          <div>
            <div className="flex items-center gap-2">
              <ShieldAlert className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Unused Equipment & Energy Wastage Analytics
              </h3>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Algorithmically detected idle draw, out-of-schedule loads, and avoidable cost impacts
            </p>
          </div>
          <span className="text-xs font-mono text-amber-400 font-bold bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
            {unusedFindings.filter(f => f.status === 'active').length} Active Wastage Flags
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {unusedFindings.map(finding => {
            const isMitigated = finding.status === 'mitigated';
            const isActing = mitigatingId === finding.id;

            return (
              <div
                key={finding.id}
                className={`p-4 rounded-xl border transition-all space-y-3 ${
                  isMitigated
                    ? 'bg-[var(--bg-tertiary)] border-[var(--border-color)] opacity-70'
                    : 'bg-[var(--bg-tertiary)] border-amber-500/40 shadow-sm'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div>
                    <span className="font-mono text-[10px] text-cyan-400 block font-bold">
                      {finding.roomNumber} • {finding.buildingName}
                    </span>
                    <h4 className="text-xs font-bold text-[var(--text-primary)] mt-0.5">
                      {finding.deviceName}
                    </h4>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-[9px] font-bold ${
                    isMitigated
                      ? 'bg-emerald-500/20 text-emerald-400'
                      : 'bg-amber-500/20 text-amber-400 animate-pulse'
                  }`}>
                    {isMitigated ? 'MITIGATED' : 'ACTIVE WASTE'}
                  </span>
                </div>

                <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs space-y-1">
                  <span className="text-[10px] text-amber-300 font-bold block">{finding.reasonFlag}</span>
                  <div className="grid grid-cols-2 gap-2 text-[11px] pt-1">
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Observed Draw</span>
                      <span className="font-mono font-bold text-rose-400">{finding.observedPowerKw} kW</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[var(--text-muted)] block">Avoidable Impact</span>
                      <span className="font-mono font-bold text-emerald-400">₹{finding.costImpactINR}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                  {finding.evidencePoints.slice(0, 2).map((ev, i) => (
                    <div key={i} className="flex items-center gap-1.5">
                      <span className="w-1 h-1 rounded-full bg-cyan-400 shrink-0" />
                      <span className="truncate">{ev}</span>
                    </div>
                  ))}
                </div>

                {!isMitigated ? (
                  <button
                    disabled={isActing}
                    onClick={() => handleMitigateFinding(finding.id)}
                    className="w-full py-1.5 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-500 text-white shadow-sm flex items-center justify-center gap-1.5 transition-all"
                  >
                    {isActing ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5" />}
                    Mitigate Idle Waste Now
                  </button>
                ) : (
                  <div className="text-center text-[10px] text-emerald-400 font-semibold flex items-center justify-center gap-1 py-1">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Energy Waste Successfully Mitigated
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
