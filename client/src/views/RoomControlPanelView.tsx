import React, { useState, useEffect } from 'react';
import {
  Building, Room, Appliance, ApplianceSchedule, User, UserRole, ApplianceType
} from '../../../shared/types.js';
import { api } from '../services/api.js';
import {
  Power, Wind, Lightbulb, Fan, Tv, Monitor, Cpu, ShieldAlert,
  CheckCircle2, Clock, AlertTriangle, Zap, Calendar, Play,
  Pause, Trash2, ArrowLeft, ChevronRight, Search, Filter,
  Activity, Server, Thermometer, Droplets, Users, ShieldCheck,
  RefreshCw, Check, X, Info, Download, Radio, Terminal, ExternalLink, HardDrive
} from 'lucide-react';

interface RoomControlPanelViewProps {
  buildings: Building[];
  initialBuildingId?: string | null;
  initialRoomId?: string | null;
  currentUser: User | null;
  onSelectBuilding?: (id: string | null) => void;
  onBackTo3D?: () => void;
}

export const RoomControlPanelView: React.FC<RoomControlPanelViewProps> = ({
  buildings,
  initialBuildingId,
  initialRoomId,
  currentUser,
  onSelectBuilding,
  onBackTo3D
}) => {
  // Navigation & Hierarchy Selection
  const [selectedBuildingId, setSelectedBuildingId] = useState<string>(
    initialBuildingId || (buildings.length > 0 ? buildings[0].id : 'MITS_AI_BUILDING')
  );
  const [selectedFloor, setSelectedFloor] = useState<string>('All');
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(initialRoomId || null);
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [roomFilterStatus, setRoomFilterStatus] = useState<'all' | 'high_usage' | 'normal' | 'off'>('all');

  // Data states
  const [buildingRooms, setBuildingRooms] = useState<Room[]>([]);
  const [activeRoomDetail, setActiveRoomDetail] = useState<any>(null);
  const [appliances, setAppliances] = useState<Appliance[]>([]);
  const [schedules, setSchedules] = useState<ApplianceSchedule[]>([]);
  const [loadingRoom, setLoadingRoom] = useState<boolean>(false);
  const [applianceFilterType, setApplianceFilterType] = useState<string>('all');

  // Command execution & state tracking
  const [commandingId, setCommandingId] = useState<string | null>(null);
  const [commandSuccessId, setCommandSuccessId] = useState<string | null>(null);
  const [commandError, setCommandError] = useState<string | null>(null);
  const [pendingCommands, setPendingCommands] = useState<{ [applianceId: string]: 'on' | 'off' }>({});
  const [failedApplianceIds, setFailedApplianceIds] = useState<{ [id: string]: string }>({});
  const [commandHistory, setCommandHistory] = useState<any[]>([]);

  // Real Hardware Mode vs Demo Simulation Mode Toggle
  const [controlMode, setControlMode] = useState<'demo' | 'hardware'>('demo');
  const [showHardwareGuide, setShowHardwareGuide] = useState<boolean>(false);
  const [hardwareGatewayStatus, setHardwareGatewayStatus] = useState<any>(null);

  // High Load Mitigation Modal
  const [showMitigationModal, setShowMitigationModal] = useState<boolean>(false);
  const [simulationData, setSimulationData] = useState<any>(null);
  const [isSimulating, setIsSimulating] = useState<boolean>(false);
  const [isExecutingMitigation, setIsExecutingMitigation] = useState<boolean>(false);
  const [confirmedMitigation, setConfirmedMitigation] = useState<boolean>(false);
  const [mitigationResult, setMitigationResult] = useState<any>(null);

  // Add Schedule Modal
  const [showAddScheduleModal, setShowAddScheduleModal] = useState<boolean>(false);
  const [newScheduleData, setNewScheduleData] = useState({
    name: '',
    applianceId: '',
    startTime: '18:00',
    endTime: '08:00',
    daysOfWeek: [1, 2, 3, 4, 5],
    targetState: 'off' as 'on' | 'off'
  });

  // Role permissions
  const isSuperAdmin = currentUser?.role === 'super_admin';
  const isFacilityManager = currentUser?.role === 'facility_manager';
  const isHOD = currentUser?.role === 'department_hod';
  const isViewer = currentUser?.role === 'viewer';

  const canControlCurrentRoom = () => {
    // In Demo Mode: Safe simulated testing is open to all users
    if (controlMode === 'demo') return true;

    // In Hardware Mode: Strict Electrical Safety Interlock
    if (isViewer) return false;
    if (isSuperAdmin || isFacilityManager) return true;
    if (isHOD && activeRoomDetail) {
      return activeRoomDetail.departmentId === currentUser?.departmentId;
    }
    return false;
  };

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);

  // Fetch rooms for building
  const fetchRooms = (bId: string) => {
    api.rooms({ buildingId: bId }).then(res => {
      if (res.success && res.data) {
        setBuildingRooms(res.data);
        if (!selectedRoomId || !res.data.some((r: Room) => r.id === selectedRoomId)) {
          if (res.data.length > 0) {
            setSelectedRoomId(res.data[0].id);
          } else {
            setSelectedRoomId(null);
          }
        }
      }
    });
  };

  useEffect(() => {
    if (selectedBuildingId) {
      fetchRooms(selectedBuildingId);
      if (onSelectBuilding) onSelectBuilding(selectedBuildingId);
    }
  }, [selectedBuildingId]);

  const fetchRoomCommandHistory = (roomId: string) => {
    api.roomCommands(roomId).then(res => {
      if (res.success && res.data) {
        setCommandHistory(res.data);
      }
    }).catch(err => console.error('Error fetching room commands:', err));
  };

  // Fetch room detail & appliances when selectedRoomId changes
  const fetchRoomDetail = (roomId: string) => {
    setLoadingRoom(true);
    setCommandError(null);
    api.roomDetail(roomId).then(res => {
      setLoadingRoom(false);
      if (res.success && res.data) {
        setActiveRoomDetail(res.data);
        setAppliances(res.data.appliances || []);
        setSchedules(res.data.schedules || []);
      }
    }).catch(err => {
      setLoadingRoom(false);
      console.error('Error fetching room detail:', err);
    });

    fetchRoomCommandHistory(roomId);
  };

  useEffect(() => {
    if (selectedRoomId) {
      fetchRoomDetail(selectedRoomId);
    } else {
      setActiveRoomDetail(null);
      setAppliances([]);
      setSchedules([]);
      setCommandHistory([]);
    }
  }, [selectedRoomId]);

  // Distinct floors for selected building
  const availableFloors = ['All', ...Array.from(new Set(buildingRooms.map(r => r.floor || 'Ground Floor')))];

  // Filtered rooms
  const filteredRooms = buildingRooms.filter(r => {
    if (selectedFloor !== 'All' && r.floor !== selectedFloor) return false;
    if (roomFilterStatus !== 'all' && r.status !== roomFilterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchNum = r.roomNumber.toLowerCase().includes(q);
      const matchName = r.name.toLowerCase().includes(q);
      const matchDept = (r.departmentName || '').toLowerCase().includes(q);
      return matchNum || matchName || matchDept;
    }
    return true;
  });

  // Controllable Appliances filtering
  const filteredAppliances = appliances.filter(a => {
    if (applianceFilterType === 'all') return true;
    return a.type === applianceFilterType;
  });

  // Fetch hardware gateway status when opening hardware guide modal
  const fetchHardwareStatus = async () => {
    try {
      const res = await api.hardwareStatus();
      if (res.success) {
        setHardwareGatewayStatus(res);
      }
    } catch (err) {
      console.error('Failed to fetch hardware status:', err);
    }
  };

  // Handle Appliance ON/OFF Toggle with Confirmed vs Requested State Management
  const handleToggleAppliance = async (appliance: Appliance) => {
    if (!canControlCurrentRoom()) {
      setCommandError(
        isViewer
          ? 'Physical Hardware Mode Interlock: Viewers have read-only access. Switch to Demo Simulation Mode above to test controls risk-free.'
          : `Physical Hardware Mode Interlock: You are HOD of ${currentUser?.departmentName || 'your department'} and cannot operate equipment in other departments.`
      );
      return;
    }

    // Prevent duplicate commands while pending
    if (pendingCommands[appliance.id]) {
      return;
    }

    // In Real Hardware Mode: Check connectivity and report explicit error
    if (controlMode === 'hardware' && (appliance.connectionStatus === 'offline' || appliance.status === 'unavailable')) {
      const errMsg = `Cannot switch mains: "${appliance.name}" (${appliance.code}) relay node is offline. Verified hardware telemetry required.`;
      setFailedApplianceIds(prev => ({ ...prev, [appliance.id]: errMsg }));
      setCommandError(errMsg);
      return;
    }

    const nextState = appliance.status === 'on' ? 'off' : 'on';
    setPendingCommands(prev => ({ ...prev, [appliance.id]: nextState }));
    setCommandingId(appliance.id);
    setCommandError(null);
    setFailedApplianceIds(prev => {
      const copy = { ...prev };
      delete copy[appliance.id];
      return copy;
    });

    // 5.0 second timeout race safeguard
    const timeoutPromise = new Promise<{ timeout: true }>((resolve) =>
      setTimeout(() => resolve({ timeout: true }), 5000)
    );

    try {
      const requestPromise = api.controlAppliance(
        appliance.id,
        nextState,
        `Toggled via Room Control Panel in ${controlMode.toUpperCase()} mode`,
        controlMode
      );

      const result: any = await Promise.race([requestPromise, timeoutPromise]);

      setPendingCommands(prev => {
        const copy = { ...prev };
        delete copy[appliance.id];
        return copy;
      });
      setCommandingId(null);

      if (result.timeout) {
        const timeoutMsg = 'Operation timed out after 5.0s without hardware ACK. Check network/MQTT link.';
        setFailedApplianceIds(prev => ({ ...prev, [appliance.id]: timeoutMsg }));
        setCommandError(`Command Timeout: "${appliance.name}" did not acknowledge within 5s.`);
        return;
      }

      if (result.success && result.data) {
        setCommandSuccessId(appliance.id);
        setTimeout(() => setCommandSuccessId(null), 2500);

        // Authoritative update from backend response
        setAppliances(prev => prev.map(a => a.id === appliance.id ? result.data : a));

        // Update active room power rating only after confirmed transition
        if (result.roomPowerKw !== undefined && activeRoomDetail) {
          setActiveRoomDetail((prev: any) => ({
            ...prev,
            currentPowerKw: result.roomPowerKw,
            status: result.roomPowerKw > 15 ? 'high_usage' : result.roomPowerKw === 0 ? 'normal' : 'normal'
          }));

          // Also update list of building rooms
          setBuildingRooms(prev => prev.map(r => r.id === activeRoomDetail.id ? {
            ...r,
            currentPowerKw: result.roomPowerKw,
            status: result.roomPowerKw > 15 ? 'high_usage' : result.roomPowerKw === 0 ? 'normal' : 'normal'
          } : r));
        }

        // Refresh command history
        if (selectedRoomId) fetchRoomCommandHistory(selectedRoomId);
      } else {
        const failMsg = result.message || 'Command dispatch failed on IoT gateway.';
        setFailedApplianceIds(prev => ({ ...prev, [appliance.id]: failMsg }));
        setCommandError(failMsg);
      }
    } catch (err: any) {
      setPendingCommands(prev => {
        const copy = { ...prev };
        delete copy[appliance.id];
        return copy;
      });
      setCommandingId(null);
      const networkMsg = err?.message || 'Network error communicating with campus hardware gateway.';
      setFailedApplianceIds(prev => ({ ...prev, [appliance.id]: networkMsg }));
      setCommandError(networkMsg);
    }
  };

  // Bulk Action Handler (e.g. Turn all ACs off)
  const handleBulkAction = async (type: ApplianceType, targetState: 'on' | 'off') => {
    if (!canControlCurrentRoom()) {
      setCommandError('Permission denied: You do not have authorization to control this room.');
      return;
    }

    const targets = appliances.filter(a => a.type === type && a.status !== targetState);
    if (targets.length === 0) return;

    for (const target of targets) {
      await api.controlAppliance(target.id, targetState, `Bulk command ${targetState.toUpperCase()}`, controlMode);
    }
    if (selectedRoomId) fetchRoomDetail(selectedRoomId);
  };

  // High Load Mitigation Simulation
  const handleOpenMitigation = async () => {
    if (!selectedRoomId) return;
    setIsSimulating(true);
    setShowMitigationModal(true);
    setMitigationResult(null);
    setConfirmedMitigation(false);
    try {
      const res = await api.simulateHighLoadAction(selectedRoomId);
      setIsSimulating(false);
      if (res.success && res.data) {
        setSimulationData(res.data);
      }
    } catch (err) {
      setIsSimulating(false);
      console.error('Simulation error:', err);
    }
  };

  // Execute High Load Mitigation Action
  const handleExecuteMitigation = async () => {
    if (!selectedRoomId || !simulationData) return;
    setIsExecutingMitigation(true);
    try {
      const res = await api.executeHighLoadAction({
        roomId: selectedRoomId,
        applianceIds: simulationData.recommendedApplianceIds,
        reason: 'Automated high load mitigation confirmed by authorized officer'
      });
      setIsExecutingMitigation(false);
      if (res.success && res.data) {
        setMitigationResult(res.data);
        fetchRoomDetail(selectedRoomId);
      }
    } catch (err) {
      setIsExecutingMitigation(false);
      console.error('Execution error:', err);
    }
  };

  // Create Schedule Handler
  const handleCreateSchedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRoomId || !newScheduleData.name || !newScheduleData.applianceId) return;

    try {
      const res = await api.createSchedule({
        ...newScheduleData,
        roomId: selectedRoomId
      });
      if (res.success) {
        setShowAddScheduleModal(false);
        setNewScheduleData({
          name: '',
          applianceId: '',
          startTime: '18:00',
          endTime: '08:00',
          daysOfWeek: [1, 2, 3, 4, 5],
          targetState: 'off'
        });
        fetchRoomDetail(selectedRoomId);
      }
    } catch (err) {
      console.error('Create schedule error:', err);
    }
  };

  // Toggle Schedule
  const handleToggleSchedule = async (id: string) => {
    try {
      await api.toggleSchedule(id);
      if (selectedRoomId) fetchRoomDetail(selectedRoomId);
    } catch (err) {
      console.error('Toggle schedule error:', err);
    }
  };

  // Delete Schedule
  const handleDeleteSchedule = async (id: string) => {
    try {
      await api.deleteSchedule(id);
      if (selectedRoomId) fetchRoomDetail(selectedRoomId);
    } catch (err) {
      console.error('Delete schedule error:', err);
    }
  };

  // Appliance Icon helper
  const getApplianceIcon = (type: ApplianceType) => {
    switch (type) {
      case 'pump':
        return <Droplets className="w-5 h-5 text-cyan-400" />;
      case 'ac':
        return <Wind className="w-5 h-5 text-cyan-400" />;
      case 'light':
        return <Lightbulb className="w-5 h-5 text-amber-400" />;
      case 'fan':
        return <Fan className="w-5 h-5 text-teal-400" />;
      case 'projector':
        return <Tv className="w-5 h-5 text-indigo-400" />;
      case 'computer':
        return <Monitor className="w-5 h-5 text-sky-400" />;
      case 'machinery':
        return <Cpu className="w-5 h-5 text-orange-400" />;
      default:
        return <Zap className="w-5 h-5 text-gray-400" />;
    }
  };

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ================= HEADER & BREADCRUMBS ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Room Energy & Controllable Equipment Panel
              </h2>
              <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                ESP32 IoT Relay Gateway
              </span>
            </div>
            <p className="text-xs text-[var(--text-muted)] mt-1">
              Live room-level power telemetry, sub-meter readings, and bidirectional appliance control
            </p>
          </div>

          <div className="flex items-center gap-2">
            {onBackTo3D && (
              <button
                onClick={onBackTo3D}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] transition-all"
              >
                <ArrowLeft className="w-3.5 h-3.5" /> Back to 3D Campus View
              </button>
            )}
            <button
              onClick={() => selectedRoomId && fetchRoomDetail(selectedRoomId)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm transition-all"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Refresh Telemetry
            </button>
          </div>
        </div>

        {/* Breadcrumb Hierarchy */}
        <div className="flex flex-wrap items-center gap-2 mt-3 pt-3 border-t border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
          <span className="text-cyan-400 font-semibold cursor-pointer" onClick={() => setSelectedFloor('All')}>
            MITS Gwalior Main Campus
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="font-semibold text-[var(--text-primary)]">
            {selectedBuilding?.name || 'Academic Building'}
          </span>
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
          <span className="text-cyan-300 font-medium">
            {activeRoomDetail?.floor || selectedFloor}
          </span>
          {activeRoomDetail && (
            <>
              <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
              <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold">
                {activeRoomDetail.roomNumber} — {activeRoomDetail.name}
              </span>
            </>
          )}
        </div>
      </div>

      {/* ================= OPERATING MODE SWITCHER & HARDWARE GATEWAY BAR ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-sm">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs font-bold text-[var(--text-primary)] uppercase tracking-wide flex items-center gap-1.5">
            <Radio className="w-3.5 h-3.5 text-cyan-400" /> Mode:
          </span>
          <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-0.5 rounded-lg">
            <button
              onClick={() => {
                setControlMode('demo');
                setCommandError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                controlMode === 'demo'
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <CheckCircle2 className="w-3 h-3 text-emerald-300" />
              <span>Demo Simulation Mode</span>
              <span className="px-1 py-0.2 rounded bg-emerald-800/60 text-[9px] font-mono">Safe</span>
            </button>
            <button
              onClick={() => {
                setControlMode('hardware');
                setCommandError(null);
              }}
              className={`flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-semibold transition-all ${
                controlMode === 'hardware'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Zap className="w-3 h-3 text-amber-300" />
              <span>Real Hardware Mode</span>
              <span className="px-1 py-0.2 rounded bg-amber-800/60 text-[9px] font-mono">Physical Relays</span>
            </button>
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          {controlMode === 'demo' ? (
            <span className="text-[11px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5" /> Virtual Relay Mode Active — All users can click and test appliance switching
            </span>
          ) : (
            <span className="text-[11px] text-amber-400 bg-amber-500/10 border border-amber-500/30 px-2.5 py-1 rounded-lg flex items-center gap-1.5">
              <ShieldAlert className="w-3.5 h-3.5" /> Physical Relay Mode Active — Telemetry verified via ESP32 / Modbus gateway
            </span>
          )}

          <button
            onClick={() => {
              setShowHardwareGuide(true);
              fetchHardwareStatus();
            }}
            className="flex items-center gap-1.5 px-3 py-1 rounded-lg text-xs font-medium bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-cyan-500/30 text-cyan-400 hover:text-cyan-300 transition-all shrink-0"
          >
            <Cpu className="w-3.5 h-3.5" /> ESP32 Wiring & Firmware
          </button>
        </div>
      </div>

      {/* ================= BUILDING & FLOOR SELECTION TRAYS ================= */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Left Column: Campus Building & Floor Directory */}
        <div className="lg:col-span-4 space-y-4">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase tracking-wider text-[var(--text-muted)]">
                1. Select Campus Building
              </h3>
              <span className="text-[10px] text-[var(--text-muted)]">{buildings.length} Facilities</span>
            </div>

            <select
              value={selectedBuildingId}
              onChange={(e) => setSelectedBuildingId(e.target.value)}
              className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-medium text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
            >
              {buildings.map(b => (
                <option key={b.id} value={b.id}>
                  {b.name} ({b.totalRooms} rooms • {b.totalFloors} floors)
                </option>
              ))}
            </select>

            {/* Floor Navigation Pills */}
            <div className="space-y-1.5 pt-2">
              <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                2. Select Floor Level:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5">
                {availableFloors.map(fl => (
                  <button
                    key={fl}
                    onClick={() => setSelectedFloor(fl)}
                    className={`px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all text-center truncate ${
                      selectedFloor === fl
                        ? 'bg-cyan-600 text-white font-bold shadow-sm'
                        : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white hover:bg-[var(--border-color)]'
                    }`}
                  >
                    {fl}
                  </button>
                ))}
              </div>
            </div>

            {/* Room Search & Status Filters */}
            <div className="space-y-2 pt-2 border-t border-[var(--border-color)]">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-[var(--text-muted)]" />
                <input
                  type="text"
                  placeholder="Search room (e.g. M004, Lab, EE)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div className="flex items-center gap-1 text-[10px]">
                <span className="text-[var(--text-muted)]">Status:</span>
                {(['all', 'high_usage', 'normal', 'off'] as const).map(st => (
                  <button
                    key={st}
                    onClick={() => setRoomFilterStatus(st)}
                    className={`px-2 py-0.5 rounded capitalize ${
                      roomFilterStatus === st
                        ? 'bg-cyan-500/20 text-cyan-300 font-bold'
                        : 'text-[var(--text-secondary)] hover:text-white'
                    }`}
                  >
                    {st === 'high_usage' ? 'High' : st}
                  </button>
                ))}
              </div>
            </div>

            {/* Rooms List */}
            <div className="space-y-1.5 max-h-[380px] overflow-y-auto pr-1">
              {filteredRooms.length === 0 ? (
                <div className="p-4 text-center text-xs text-[var(--text-muted)]">
                  No rooms matching the selected floor and search criteria.
                </div>
              ) : (
                filteredRooms.map(r => {
                  const isSelected = r.id === selectedRoomId;
                  const isHighUsage = r.status === 'high_usage';
                  return (
                    <div
                      key={r.id}
                      onClick={() => setSelectedRoomId(r.id)}
                      className={`p-2.5 rounded-lg border cursor-pointer transition-all ${
                        isSelected
                          ? 'bg-cyan-500/10 border-cyan-500/50 shadow-sm'
                          : 'bg-[var(--bg-tertiary)] border-[var(--border-color)] hover:border-cyan-500/30'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono font-bold text-xs text-cyan-400">
                          {r.roomNumber}
                        </span>
                        <div className="flex items-center gap-1.5">
                          {r.occupancy !== undefined && (
                            <span className="flex items-center gap-0.5 text-[10px] text-[var(--text-muted)]">
                              <Users className="w-2.5 h-2.5" /> {r.occupancy}
                            </span>
                          )}
                          <span
                            className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                              isHighUsage
                                ? 'bg-rose-500/20 text-rose-400 animate-pulse'
                                : r.status === 'off'
                                ? 'bg-gray-500/20 text-gray-400'
                                : 'bg-emerald-500/20 text-emerald-400'
                            }`}
                          >
                            {isHighUsage ? 'HIGH' : r.status === 'off' ? 'OFF' : 'NORMAL'}
                          </span>
                        </div>
                      </div>
                      <p className="text-xs font-semibold text-[var(--text-primary)] truncate mt-1">
                        {r.name}
                      </p>
                      <div className="flex justify-between items-center text-[10px] text-[var(--text-muted)] mt-1">
                        <span>{r.floor}</span>
                        <span className="font-mono text-cyan-300 font-bold">{r.currentPowerKw} kW</span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Detailed Room Control & Controllable Appliances */}
        <div className="lg:col-span-8 space-y-4">
          {loadingRoom ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-12 text-center shadow-sm">
              <RefreshCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
              <p className="text-xs text-[var(--text-muted)] mt-3">Connecting to Room IoT Gateway & Relays...</p>
            </div>
          ) : !activeRoomDetail ? (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-12 text-center shadow-sm">
              <Server className="w-10 h-10 mx-auto text-[var(--text-muted)] mb-3" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Select a Room to Inspect & Control</h3>
              <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto mt-1">
                Choose an academic classroom, lab, or administrative chamber to manage its appliances, view real-time wattage, and automate energy usage.
              </p>
            </div>
          ) : (
            <>
              {/* Room Telemetry Banner */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-3 border-b border-[var(--border-color)]">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded bg-cyan-500/10 text-cyan-400 font-mono font-bold text-xs border border-cyan-500/20">
                        {activeRoomDetail.roomNumber}
                      </span>
                      <h3 className="text-base font-bold text-[var(--text-primary)]">
                        {activeRoomDetail.name}
                      </h3>
                    </div>
                    <p className="text-xs text-[var(--text-muted)] mt-1">
                      {activeRoomDetail.departmentName || 'Campus Administration'} • {activeRoomDetail.buildingName} • {activeRoomDetail.floor}
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span
                      className={`px-2.5 py-1 rounded text-xs font-bold ${
                        activeRoomDetail.status === 'high_usage'
                          ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          : 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {activeRoomDetail.status === 'high_usage' ? 'HIGH LOAD ALERT' : 'OPTIMAL LOAD'}
                    </span>
                  </div>
                </div>

                {/* Telemetry Metrics Row */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                      Live Room Power
                    </span>
                    <span className="text-lg font-bold font-mono text-cyan-400">
                      {activeRoomDetail.currentPowerKw} <span className="text-xs text-[var(--text-muted)]">kW</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                      Sub-meter Active Draw
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                      Today Consumption
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      {activeRoomDetail.todayKwh} <span className="text-xs text-[var(--text-muted)]">kWh</span>
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                      ₹{(activeRoomDetail.todayKwh * 7.60).toFixed(0)} Estimated Cost
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                      Occupancy Status
                    </span>
                    <span className="text-lg font-bold font-mono text-sky-400 flex items-center gap-1.5">
                      <Users className="w-4 h-4" /> {activeRoomDetail.occupancy ?? 0}
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                      {activeRoomDetail.occupancy === 0 ? 'Vacant Room' : 'Active Students'}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold block">
                      Ambient Climate
                    </span>
                    <span className="text-lg font-bold font-mono text-amber-400 flex items-center gap-1">
                      <Thermometer className="w-4 h-4" /> {activeRoomDetail.temperatureC ?? 23}°C
                    </span>
                    <span className="text-[10px] text-[var(--text-secondary)] block mt-0.5">
                      {activeRoomDetail.humidityPercent ?? 48}% Humidity
                    </span>
                  </div>
                </div>

                {/* Role Permission Notice */}
                {!canControlCurrentRoom() && (
                  <div className="p-2.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-300 flex items-center gap-2">
                    <ShieldAlert className="w-4 h-4 shrink-0" />
                    <span>
                      {isViewer
                        ? 'Read-only view: Signed in as Viewer. You can inspect real-time watts, but equipment switching requires Facility Manager or Super Admin role.'
                        : `Signed in as HOD of ${currentUser?.departmentName}. Equipment controls are locked for other departments.`}
                    </span>
                  </div>
                )}

                {/* Error Banner if any command failed */}
                {commandError && (
                  <div className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/20 text-xs text-rose-300 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <AlertTriangle className="w-4 h-4 shrink-0 text-rose-400" />
                      <span>{commandError}</span>
                    </div>
                    <button onClick={() => setCommandError(null)} className="text-rose-400 hover:text-white">
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>

              {/* ================= HIGH LOAD / ENERGY WASTE DETECTION BANNER ================= */}
              {activeRoomDetail.highLoadAlert && activeRoomDetail.highLoadAlert.isHighLoad && (
                <div className="bg-gradient-to-r from-rose-950/40 via-rose-900/20 to-[var(--bg-secondary)] border border-rose-500/40 rounded-xl p-4 shadow-md space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="p-1.5 rounded-lg bg-rose-500/20 text-rose-400 animate-pulse">
                        <AlertTriangle className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="text-xs font-bold text-rose-300 uppercase tracking-wide">
                          High Load Detection Alert
                        </h4>
                        <p className="text-xs font-medium text-[var(--text-primary)] mt-0.5">
                          {activeRoomDetail.highLoadAlert.reason}
                        </p>
                      </div>
                    </div>

                    <button
                      onClick={handleOpenMitigation}
                      className="px-3 py-1.5 rounded-lg text-xs font-bold bg-rose-600 hover:bg-rose-500 text-white shadow-sm flex items-center gap-1.5 self-start sm:self-auto transition-all"
                    >
                      <Zap className="w-3.5 h-3.5" /> Inspect Evidence & Simulate Shedding
                    </button>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-[var(--text-secondary)] pt-2 border-t border-rose-500/20">
                    {activeRoomDetail.highLoadAlert.evidence?.map((ev: string, idx: number) => (
                      <div key={idx} className="flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ================= CONTROLLABLE APPLIANCES SECTION ================= */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                      <Zap className="w-4 h-4 text-cyan-400" /> Controllable Connected Equipment
                    </h3>
                    <p className="text-xs text-[var(--text-muted)] mt-0.5">
                      Individual relay switches, live draw, and sub-second control commands
                    </p>
                  </div>

                  {/* Appliance Category Filters */}
                  <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-color)] text-xs overflow-x-auto">
                    {[
                      { id: 'all', label: 'All' },
                      { id: 'ac', label: 'ACs' },
                      { id: 'light', label: 'Lights' },
                      { id: 'fan', label: 'Fans' },
                      { id: 'pump', label: 'Pumps' },
                      { id: 'computer', label: 'Workstations' },
                      { id: 'projector', label: 'Projectors' }
                    ].map(tab => (
                      <button
                        key={tab.id}
                        onClick={() => setApplianceFilterType(tab.id)}
                        className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                          applianceFilterType === tab.id
                            ? 'bg-cyan-600 text-white font-bold shadow-sm'
                            : 'text-[var(--text-secondary)] hover:text-white'
                        }`}
                      >
                        {tab.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bulk Quick Action Buttons */}
                {canControlCurrentRoom() && (
                  <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-[var(--border-color)] text-xs">
                    <span className="text-[var(--text-muted)] text-[11px]">Quick Operations:</span>
                    <button
                      onClick={() => handleBulkAction('ac', 'off')}
                      className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-rose-500/20 hover:text-rose-300 border border-[var(--border-color)] text-[var(--text-secondary)] transition-all font-medium"
                    >
                      Turn All ACs Off
                    </button>
                    <button
                      onClick={() => handleBulkAction('light', 'off')}
                      className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-amber-500/20 hover:text-amber-300 border border-[var(--border-color)] text-[var(--text-secondary)] transition-all font-medium"
                    >
                      Turn All Lights Off
                    </button>
                    <button
                      onClick={() => handleBulkAction('ac', 'on')}
                      className="px-2.5 py-1 rounded bg-[var(--bg-tertiary)] hover:bg-cyan-500/20 hover:text-cyan-300 border border-[var(--border-color)] text-[var(--text-secondary)] transition-all font-medium"
                    >
                      Turn All ACs On
                    </button>
                  </div>
                )}

                {/* Appliances Cards Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {filteredAppliances.length === 0 ? (
                    <div className="col-span-2 p-8 text-center text-xs text-[var(--text-muted)]">
                      No appliances found under this category for this room.
                    </div>
                  ) : (
                    filteredAppliances.map(app => {
                      const isOn = app.status === 'on';
                      const isUnavailable = (app.status === 'unavailable' || app.connectionStatus === 'offline') && controlMode === 'hardware';
                      const isPending = !!pendingCommands[app.id];
                      const pendingTarget = pendingCommands[app.id];
                      const isExecuting = commandingId === app.id || isPending;
                      const isSuccess = commandSuccessId === app.id;
                      const hasFailed = !!failedApplianceIds[app.id];
                      const powerKw = app.powerKw !== undefined ? app.powerKw : +((app.powerWatts || 0) / 1000).toFixed(2);
                      const accumulatedKwh = app.accumulatedKwh !== undefined ? app.accumulatedKwh : (app.todayKwh || 0);
                      const lastUpdatedText = app.lastUpdated ? new Date(app.lastUpdated).toLocaleTimeString() : 'Live';

                      return (
                        <div
                          key={app.id}
                          className={`p-3.5 rounded-xl border transition-all ${
                            isPending
                              ? 'bg-cyan-950/20 border-cyan-400 ring-1 ring-cyan-400/50'
                              : hasFailed
                              ? 'bg-rose-950/20 border-rose-500/50 ring-1 ring-rose-500/30'
                              : isUnavailable
                              ? 'bg-amber-950/15 border-amber-500/40 opacity-90'
                              : isOn
                              ? 'bg-[var(--bg-tertiary)] border-cyan-500/40 shadow-sm'
                              : 'bg-[var(--bg-secondary)] border-[var(--border-color)] opacity-85'
                          }`}
                        >
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5">
                              <div className="p-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                                {getApplianceIcon(app.type)}
                              </div>
                              <div>
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                                    {app.name}
                                  </h4>
                                  {controlMode === 'demo' ? (
                                    <span
                                      className="px-1.5 py-0.2 rounded text-[9px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                                      title="Virtual switch active — click to test"
                                    >
                                      Demo Mode
                                    </span>
                                  ) : (
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[9px] font-semibold ${
                                        isUnavailable
                                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                                          : 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                                      }`}
                                      title="Connected to ESP32 Mains Relay"
                                    >
                                      {isUnavailable ? 'Offline' : 'Hardware Node'}
                                    </span>
                                  )}
                                </div>
                                <span className="font-mono text-[10px] text-[var(--text-muted)] block mt-0.5">
                                  {app.code} • {app.hardwareDeviceId || 'ESP32 Relay'}
                                </span>
                              </div>
                            </div>

                            {/* ON/OFF Switch / Pending / Unavailable Badge */}
                            {isUnavailable ? (
                              <div className="flex items-center gap-1.5">
                                <span className="px-2.5 py-1 rounded-lg bg-amber-500/15 border border-amber-500/40 text-amber-400 font-bold text-[10px] flex items-center gap-1">
                                  <AlertTriangle className="w-3 h-3" />
                                  Offline
                                </span>
                                <button
                                  onClick={() => handleToggleAppliance(app)}
                                  className="px-2 py-0.5 rounded bg-amber-600/30 hover:bg-amber-600 text-amber-200 text-[10px] font-semibold transition-all"
                                  title="Retry hardware ping"
                                >
                                  Ping
                                </button>
                              </div>
                            ) : (
                              <button
                                disabled={(!canControlCurrentRoom() && controlMode === 'hardware') || isExecuting}
                                onClick={() => handleToggleAppliance(app)}
                                className={`relative inline-flex h-6 w-12 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                                  (!canControlCurrentRoom() && controlMode === 'hardware') || isExecuting
                                    ? 'opacity-60 cursor-not-allowed'
                                    : isOn
                                    ? 'bg-emerald-500 hover:bg-emerald-400'
                                    : 'bg-gray-600 hover:bg-gray-500'
                                }`}
                                title={
                                  !canControlCurrentRoom() && controlMode === 'hardware'
                                    ? 'Controls locked in Hardware Mode for your role'
                                    : isExecuting
                                    ? 'Command is currently dispatching...'
                                    : `Click to switch ${isOn ? 'OFF' : 'ON'}`
                                }
                              >
                                <span
                                  className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                                    isOn ? 'translate-x-6' : 'translate-x-0'
                                  }`}
                                >
                                  {isExecuting ? (
                                    <RefreshCw className="w-3 h-3 text-cyan-600 animate-spin" />
                                  ) : isSuccess ? (
                                    <Check className="w-3 h-3 text-emerald-600" />
                                  ) : (
                                    <Power className={`w-3 h-3 ${isOn ? 'text-emerald-600' : 'text-gray-400'}`} />
                                  )}
                                </span>
                              </button>
                            )}
                          </div>

                          {/* Pending Command Indicator Banner */}
                          {isPending && (
                            <div className="mt-2.5 p-1.5 rounded-lg bg-cyan-500/15 border border-cyan-500/40 flex items-center gap-2 text-[10px] text-cyan-300 animate-pulse">
                              <RefreshCw className="w-3 h-3 animate-spin shrink-0 text-cyan-400" />
                              <span>
                                Requesting <strong>{pendingTarget?.toUpperCase()}</strong>... Awaiting {controlMode === 'hardware' ? 'ESP32 hardware' : 'simulated'} ACK
                              </span>
                            </div>
                          )}

                          {/* Failure & Retry Banner */}
                          {hasFailed && !isPending && (
                            <div className="mt-2.5 p-2 rounded-lg bg-rose-500/15 border border-rose-500/40 flex items-center justify-between text-[10px] text-rose-300">
                              <div className="flex items-center gap-1.5 min-w-0">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-400 shrink-0" />
                                <span className="truncate">{failedApplianceIds[app.id]}</span>
                              </div>
                              <button
                                onClick={() => handleToggleAppliance(app)}
                                className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white font-bold transition-all shrink-0 ml-2"
                              >
                                Retry
                              </button>
                            </div>
                          )}

                          {/* Confirmed Success Banner */}
                          {isSuccess && !isPending && (
                            <div className="mt-2.5 p-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 flex items-center gap-1.5 text-[10px] text-emerald-300">
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>State <strong>{isOn ? 'ON' : 'OFF'}</strong> confirmed by authoritative telemetry ACK</span>
                            </div>
                          )}

                          {/* Telemetry info row */}
                          <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-[var(--border-color)] text-[10px]">
                            <div>
                              <span className="text-[var(--text-muted)] block">Active Power (kW)</span>
                              <span className={`font-mono font-bold ${
                                isUnavailable
                                  ? 'text-amber-400 italic'
                                  : isOn
                                  ? 'text-cyan-400 text-xs'
                                  : 'text-[var(--text-muted)]'
                              }`}>
                                {isUnavailable ? 'Unavailable' : isOn ? `${powerKw} kW` : '0.00 kW'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[var(--text-muted)] block">Connection Status</span>
                              <span className={`font-mono font-semibold ${
                                isUnavailable ? 'text-amber-400' : 'text-emerald-400'
                              }`}>
                                {isUnavailable ? 'Offline' : 'Connected'}
                              </span>
                            </div>

                            <div>
                              <span className="text-[var(--text-muted)] block">Accumulated Energy</span>
                              <span className="font-mono text-emerald-400 font-semibold">
                                {accumulatedKwh} kWh
                              </span>
                            </div>
                          </div>

                          {/* Gateway feedback & Last Updated timestamp */}
                          <div className="flex items-center justify-between text-[9px] text-[var(--text-muted)] mt-2 pt-1 border-t border-[var(--border-color)]">
                            <span className="flex items-center gap-1">
                              <span className={`w-1.5 h-1.5 rounded-full ${
                                isUnavailable
                                  ? 'bg-amber-400'
                                  : isOn
                                  ? 'bg-emerald-400 animate-pulse'
                                  : 'bg-gray-500'
                              }`} />
                              {isUnavailable
                                ? `UNCONFIRMED: ${app.unavailableReason || 'Gateway unreachable'}`
                                : isOn
                                ? 'ON (Confirmed Telemetry)'
                                : 'OFF (Confirmed Telemetry)'}
                            </span>
                            <span className="font-mono text-slate-400">
                              Updated: {lastUpdatedText} • {controlMode === 'demo' ? 'Virtual Relay' : 'ESP32 Relay'}
                            </span>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>

              {/* ================= COMMAND & DISPATCH HISTORY ================= */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                  <div className="flex items-center gap-2">
                    <Clock className="w-4 h-4 text-cyan-400" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Recent Room Command & Dispatch History
                    </h3>
                  </div>
                  <span className="text-[10px] text-[var(--text-muted)] font-mono">
                    {commandHistory.length} Recorded Transmissions
                  </span>
                </div>

                {commandHistory.length === 0 ? (
                  <div className="py-6 text-center text-xs text-[var(--text-muted)]">
                    No recent remote relay commands recorded for this room.
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-[var(--bg-tertiary)] text-[var(--text-muted)] uppercase text-[9px] font-mono border-b border-[var(--border-color)]">
                        <tr>
                          <th className="py-2 px-3">Timestamp</th>
                          <th className="py-2 px-3">Appliance</th>
                          <th className="py-2 px-3">State Transition</th>
                          <th className="py-2 px-3">Executed By</th>
                          <th className="py-2 px-3">Result / Mode</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[var(--border-color)] font-mono text-[11px]">
                        {commandHistory.slice(0, 8).map((h: any) => (
                          <tr key={h.id} className="hover:bg-[var(--bg-tertiary)]/50 transition-colors">
                            <td className="py-2 px-3 text-[var(--text-muted)]">
                              {new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                            </td>
                            <td className="py-2 px-3 font-semibold text-[var(--text-primary)] font-sans">
                              {h.applianceName}
                            </td>
                            <td className="py-2 px-3">
                              <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                h.newStatus === 'on' ? 'bg-emerald-500/15 text-emerald-400' : 'bg-gray-500/15 text-gray-400'
                              }`}>
                                {h.previousStatus?.toUpperCase()} → {h.newStatus?.toUpperCase()}
                              </span>
                            </td>
                            <td className="py-2 px-3 text-[var(--text-secondary)] font-sans text-[11px]">
                              {h.changedBy || 'System Gateway'}
                            </td>
                            <td className="py-2 px-3">
                              <div className="flex items-center gap-1.5">
                                <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-500/20 text-emerald-300 font-bold flex items-center gap-1">
                                  <Check className="w-2.5 h-2.5" /> ACK CONFIRMED
                                </span>
                                {h.isSimulated && (
                                  <span className="px-1.5 py-0.5 rounded text-[9px] bg-amber-500/15 text-amber-300 border border-amber-500/30">
                                    Demo Mode
                                  </span>
                                )}
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* ================= SCHEDULES & AUTOMATION ================= */}
              <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-4 h-4 text-emerald-400" />
                    <h3 className="text-sm font-bold text-[var(--text-primary)]">
                      Appliance Automation Schedules
                    </h3>
                  </div>

                  {canControlCurrentRoom() && (
                    <button
                      onClick={() => setShowAddScheduleModal(true)}
                      className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
                    >
                      + Add New Schedule
                    </button>
                  )}
                </div>

                {schedules.length === 0 ? (
                  <div className="p-4 text-center text-xs text-[var(--text-muted)] border border-dashed border-[var(--border-color)] rounded-lg">
                    No active automation schedules configured for this room. Click "+ Add New Schedule" to automate idle power cutoffs.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {schedules.map(sched => (
                      <div
                        key={sched.id}
                        className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs"
                      >
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-bold text-[var(--text-primary)]">{sched.name}</span>
                            <span className={`px-1.5 py-0.2 rounded text-[10px] font-semibold ${
                              sched.isActive ? 'bg-emerald-500/20 text-emerald-400' : 'bg-gray-500/20 text-gray-400'
                            }`}>
                              {sched.isActive ? 'ACTIVE' : 'PAUSED'}
                            </span>
                          </div>
                          <p className="text-[11px] text-[var(--text-muted)] mt-0.5">
                            Target: {sched.applianceName} • Time Window: {sched.startTime} to {sched.endTime} • Action: {sched.action}
                          </p>
                        </div>

                        {canControlCurrentRoom() && (
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleToggleSchedule(sched.id)}
                              className="px-2.5 py-1 rounded bg-[var(--bg-secondary)] hover:bg-[var(--border-color)] border border-[var(--border-color)] text-[var(--text-primary)] text-xs flex items-center gap-1 font-medium transition-all"
                            >
                              {sched.isActive ? <Pause className="w-3 h-3 text-amber-400" /> : <Play className="w-3 h-3 text-emerald-400" />}
                              {sched.isActive ? 'Pause' : 'Resume'}
                            </button>
                            <button
                              onClick={() => handleDeleteSchedule(sched.id)}
                              className="p-1.5 rounded hover:bg-rose-500/20 text-rose-400 transition-all"
                              title="Delete schedule"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* ================= HIGH LOAD MITIGATION & EVIDENCE MODAL ================= */}
      {showMitigationModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-xl w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div className="flex items-center gap-2">
                <span className="p-2 rounded-lg bg-rose-500/20 text-rose-400">
                  <ShieldAlert className="w-5 h-5" />
                </span>
                <div>
                  <h3 className="text-base font-bold text-[var(--text-primary)]">
                    Corrective Load Shedding & Action Workflow
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    MITS Gwalior Energy Management Incident Mitigation
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowMitigationModal(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {isSimulating ? (
              <div className="py-8 text-center space-y-2">
                <RefreshCw className="w-8 h-8 mx-auto text-cyan-400 animate-spin" />
                <p className="text-xs text-[var(--text-muted)]">Simulating IPMVP Load Shedding & Tariff Delta...</p>
              </div>
            ) : mitigationResult ? (
              /* Success State Verification */
              <div className="py-4 space-y-4 text-center">
                <div className="w-12 h-12 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                  <CheckCircle2 className="w-7 h-7" />
                </div>
                <div>
                  <h4 className="text-base font-bold text-emerald-400">
                    Corrective Load Shedding Verified!
                  </h4>
                  <p className="text-xs text-[var(--text-muted)] mt-1">
                    IoT command acknowledgement received from relays. Load successfully mitigated.
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-left">
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Previous Load</span>
                    <span className="font-mono font-bold text-rose-400">{mitigationResult.previousPowerKw} kW</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">Verified Drop</span>
                    <span className="font-mono font-bold text-emerald-400">-{mitigationResult.verifiedDropKw} kW</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-[var(--text-muted)] block">New Room Load</span>
                    <span className="font-mono font-bold text-cyan-400">{mitigationResult.newRoomPowerKw} kW</span>
                  </div>
                </div>

                <button
                  onClick={() => setShowMitigationModal(false)}
                  className="w-full py-2.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white transition-all shadow-sm"
                >
                  Close & Return to Control Panel
                </button>
              </div>
            ) : simulationData ? (
              /* Action Simulation & Confirmation Dialog */
              <div className="space-y-4">
                <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs space-y-2">
                  <div className="font-semibold text-rose-300">
                    {simulationData.reason}
                  </div>
                  <div className="space-y-1 text-[11px] text-[var(--text-secondary)]">
                    {simulationData.evidence?.map((ev: string, i: number) => (
                      <div key={i} className="flex items-center gap-1.5">
                        <span className="w-1 h-1 rounded-full bg-cyan-400" />
                        <span>{ev}</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Simulated Impact Metrics */}
                <div className="grid grid-cols-3 gap-3">
                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-cyan-500/20 text-center">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                      Instant Load Drop
                    </span>
                    <span className="text-lg font-bold font-mono text-cyan-400">
                      -{simulationData.expectedDropKw} <span className="text-xs">kW</span>
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-emerald-500/20 text-center">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                      Daily Savings
                    </span>
                    <span className="text-lg font-bold font-mono text-emerald-400">
                      ₹{simulationData.projectedDailySavingsINR}
                    </span>
                  </div>

                  <div className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-teal-500/20 text-center">
                    <span className="text-[10px] text-[var(--text-muted)] uppercase block font-semibold">
                      CO2 Reduced
                    </span>
                    <span className="text-lg font-bold font-mono text-teal-400">
                      {simulationData.projectedCO2ReductionKg} <span className="text-xs">kg</span>
                    </span>
                  </div>
                </div>

                {/* Targeted Appliances for Shedding */}
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-[var(--text-secondary)]">
                    Targeted Non-essential Appliances to Switch OFF:
                  </label>
                  <div className="space-y-1 max-h-32 overflow-y-auto pr-1">
                    {simulationData.targetAppliances?.map((t: any) => (
                      <div key={t.id} className="p-2 rounded bg-[var(--bg-tertiary)] text-xs flex justify-between items-center">
                        <span className="text-[var(--text-primary)] font-medium">{t.name}</span>
                        <span className="font-mono text-rose-400 font-bold">{(t.powerWatts/1000).toFixed(2)} kW</span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Explicit User Confirmation */}
                <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedMitigation}
                      onChange={(e) => setConfirmedMitigation(e.target.checked)}
                      className="mt-0.5 rounded border-gray-600 text-cyan-600 focus:ring-0"
                    />
                    <span className="text-[var(--text-primary)]">
                      I confirm and authorize this corrective load reduction action for {activeRoomDetail.name} ({activeRoomDetail.roomNumber}). This command will be logged in the campus audit trail.
                    </span>
                  </label>
                </div>

                {/* Execution Button */}
                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    onClick={() => setShowMitigationModal(false)}
                    className="px-4 py-2 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--border-color)] text-[var(--text-primary)] transition-all"
                  >
                    Cancel
                  </button>
                  <button
                    disabled={!confirmedMitigation || isExecutingMitigation}
                    onClick={handleExecuteMitigation}
                    className={`px-4 py-2 rounded-lg text-xs font-bold transition-all shadow-sm flex items-center gap-1.5 ${
                      confirmedMitigation && !isExecutingMitigation
                        ? 'bg-rose-600 hover:bg-rose-500 text-white'
                        : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {isExecutingMitigation ? (
                      <>
                        <RefreshCw className="w-3.5 h-3.5 animate-spin" /> Dispatching Hardware Commands...
                      </>
                    ) : (
                      <>
                        <ShieldCheck className="w-3.5 h-3.5" /> Execute Corrective Shedding Now
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      )}

      {/* ================= ADD SCHEDULE MODAL ================= */}
      {showAddScheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                <Calendar className="w-4 h-4 text-cyan-400" /> Create Appliance Schedule
              </h3>
              <button
                onClick={() => setShowAddScheduleModal(false)}
                className="text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSchedule} className="space-y-3 text-xs">
              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Schedule Title:
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Night Cooling Shutoff"
                  value={newScheduleData.name}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, name: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                />
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Target Appliance:
                </label>
                <select
                  required
                  value={newScheduleData.applianceId}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, applianceId: e.target.value })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                >
                  <option value="">-- Choose Appliance --</option>
                  {appliances.map(a => (
                    <option key={a.id} value={a.id}>
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    Start Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={newScheduleData.startTime}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, startTime: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  />
                </div>

                <div>
                  <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                    End Time:
                  </label>
                  <input
                    type="time"
                    required
                    value={newScheduleData.endTime}
                    onChange={(e) => setNewScheduleData({ ...newScheduleData, endTime: e.target.value })}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                  />
                </div>
              </div>

              <div>
                <label className="text-[var(--text-secondary)] font-semibold block mb-1">
                  Enforced State:
                </label>
                <select
                  value={newScheduleData.targetState}
                  onChange={(e) => setNewScheduleData({ ...newScheduleData, targetState: e.target.value as any })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs text-[var(--text-primary)] focus:outline-none focus:border-cyan-500"
                >
                  <option value="off">Switch OFF (Auto Energy Saver)</option>
                  <option value="on">Switch ON (Scheduled Operation)</option>
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
                <button
                  type="button"
                  onClick={() => setShowAddScheduleModal(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] text-[var(--text-primary)]"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
                >
                  Save Schedule
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ================= HARDWARE GUIDE & ESP32 WIRING MODAL ================= */}
      {showHardwareGuide && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto animate-fadeIn">
          <div className="bg-[#0F172A] border border-cyan-500/40 rounded-2xl max-w-2xl w-full p-6 shadow-2xl space-y-5 my-8">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-lg bg-cyan-500/20 text-cyan-400">
                  <Cpu className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">
                    MITS ESP32 4-Channel Relay Node & Hardware Specification
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Authoritative wiring pinouts, optical isolation architecture, and Arduino firmware
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowHardwareGuide(false)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Hardware Status Banner */}
            <div className="p-3 rounded-xl bg-slate-800/80 border border-slate-700 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
                <div>
                  <span className="font-bold text-white block">Campus MQTT Gateway: mits-mqtt.campus.lan</span>
                  <span className="text-[10px] text-slate-400">TLS Port 8883 / Plain Port 1883 • WebSocket Port 9001</span>
                </div>
              </div>
              <span className="px-2 py-1 rounded bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 font-mono text-[10px]">
                Optical Isolation: PC817 Verified
              </span>
            </div>

            {/* Pin Mapping Table */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
                ESP32 GPIO Pin Assignments (Active-LOW Relays)
              </h4>
              <div className="border border-slate-700 rounded-xl overflow-hidden text-xs">
                <table className="w-full text-left">
                  <thead className="bg-slate-800 text-slate-300 font-semibold border-b border-slate-700 text-[11px]">
                    <tr>
                      <th className="p-2.5">Relay Channel</th>
                      <th className="p-2.5">GPIO Pin</th>
                      <th className="p-2.5">Load Type</th>
                      <th className="p-2.5">Trigger Logic</th>
                      <th className="p-2.5">Isolation</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 text-[11px] font-mono text-slate-300">
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-400">Channel 1</td>
                      <td className="p-2.5 text-amber-300">GPIO 16</td>
                      <td className="p-2.5 font-sans">Air Conditioner (AC #1)</td>
                      <td className="p-2.5 text-emerald-400">Active-LOW</td>
                      <td className="p-2.5 font-sans">PC817 Optocoupler</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-400">Channel 2</td>
                      <td className="p-2.5 text-amber-300">GPIO 17</td>
                      <td className="p-2.5 font-sans">Secondary AC / Heavy Vent</td>
                      <td className="p-2.5 text-emerald-400">Active-LOW</td>
                      <td className="p-2.5 font-sans">PC817 Optocoupler</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-400">Channel 3</td>
                      <td className="p-2.5 text-amber-300">GPIO 18</td>
                      <td className="p-2.5 font-sans">BLDC Ceiling Fans Array</td>
                      <td className="p-2.5 text-emerald-400">Active-LOW</td>
                      <td className="p-2.5 font-sans">PC817 Optocoupler</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-cyan-400">Channel 4</td>
                      <td className="p-2.5 text-amber-300">GPIO 19</td>
                      <td className="p-2.5 font-sans">LED Batten Lighting Circuit</td>
                      <td className="p-2.5 text-emerald-400">Active-LOW</td>
                      <td className="p-2.5 font-sans">PC817 Optocoupler</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-400">DHT22 Sensor</td>
                      <td className="p-2.5 text-amber-300">GPIO 4</td>
                      <td className="p-2.5 font-sans">Room Temp & Humidity</td>
                      <td className="p-2.5 text-slate-400">1-Wire Bus</td>
                      <td className="p-2.5 font-sans">4.7kΩ Pull-up</td>
                    </tr>
                    <tr>
                      <td className="p-2.5 font-bold text-slate-400">PZEM-004T Meter</td>
                      <td className="p-2.5 text-amber-300">GPIO 21 (TX), 22 (RX)</td>
                      <td className="p-2.5 font-sans">Watts, Volts, Amps, kWh</td>
                      <td className="p-2.5 text-slate-400">Hardware UART2</td>
                      <td className="p-2.5 font-sans">Built-in Optical</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>

            {/* Electrical Safety & Interlock Notice */}
            <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-300 space-y-1.5">
              <div className="flex items-center gap-2 font-bold text-amber-200">
                <ShieldCheck className="w-4 h-4 text-amber-400" />
                Electrical Safety Rules & Snubber Protection
              </div>
              <ul className="list-disc pl-5 space-y-1 text-[11px] text-amber-300/90 font-sans">
                <li><strong>Optical Isolation:</strong> High voltage AC mains and 3.3V DC logic ground must never share reference. Keep optocoupler isolation slot milled under the PCB.</li>
                <li><strong>Fail-Safe Boot:</strong> Firmware initializes all GPIOs HIGH on power up to guarantee relays remain OFF during ESP32 boot resets.</li>
                <li><strong>Inductive Load Snubber:</strong> Always install an RC snubber network (100nF 400V + 100Ω 2W) across relay contacts to extinguish inductive arcs when AC compressor kicks off.</li>
              </ul>
            </div>

            {/* MQTT Topic Specification */}
            <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs space-y-1.5">
              <span className="text-slate-400 font-semibold block text-[11px] uppercase">
                MQTT Command & Telemetry Topic Hierarchy
              </span>
              <div className="font-mono text-[11px] text-cyan-300 space-y-1">
                <div>Subscribe: <span className="text-white">mits/campus/{'{building}'}/{'{room}'}/relay/{'{channel}'}/set</span></div>
                <div>Publish Telemetry: <span className="text-white">mits/campus/{'{building}'}/{'{room}'}/telemetry</span></div>
                <div>LWT / Heartbeat: <span className="text-white">mits/campus/nodes/{'{nodeId}'}/lwt</span></div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-700">
              <a
                href="/firmware/mits_esp32_relay_node.ino"
                download="mits_esp32_relay_node.ino"
                className="px-4 py-2 rounded-xl text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-md flex items-center gap-2 transition-all"
              >
                <Download className="w-4 h-4" /> Download Complete Arduino Firmware (.ino)
              </a>
              <button
                onClick={() => setShowHardwareGuide(false)}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all"
              >
                Close Specification
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
