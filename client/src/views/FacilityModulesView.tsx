import React, { useState, useEffect } from 'react';
import { 
  Wrench, Building2, Layers, CheckCircle2, AlertTriangle, 
  Clock, Power, Cpu, RefreshCw, X, ChevronRight, Activity, 
  Zap, ShieldAlert, ArrowUpRight, Search, Filter, Droplets, Fan, Tv, Laptop
} from 'lucide-react';
import { api } from '../services/api.js';

interface FacilityModulesViewProps {
  buildings: any[];
  rooms: any[];
  userRole: string;
  onNavigateToTab?: (tab: any) => void;
  onNavigateToRoomControl?: (roomId: string, buildingId: string) => void;
}

export const FacilityModulesView: React.FC<FacilityModulesViewProps> = ({ 
  buildings = [], 
  rooms = [], 
  userRole,
  onNavigateToTab,
  onNavigateToRoomControl
}) => {
  const [facilities, setFacilities] = useState<any[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [selectedFacilityForDetails, setSelectedFacilityForDetails] = useState<any | null>(null);
  const [modalTab, setModalTab] = useState<'rooms' | 'appliances' | 'sensors' | 'orders'>('rooms');

  const categories = [
    { id: 'all', label: 'All Facilities' },
    { id: 'academic', label: 'Academic Complex' },
    { id: 'department', label: 'Department Labs' },
    { id: 'workshop', label: 'Central Workshop' },
    { id: 'library', label: 'Central Library' },
    { id: 'architecture', label: 'Architecture Wing' },
    { id: 'hostel', label: 'Student Hostels' },
    { id: 'solar_plant', label: 'Rooftop Solar Plant' }
  ];

  const loadFacilities = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.facilities();
      if (res && res.success && Array.isArray(res.data)) {
        setFacilities(res.data);
      } else {
        throw new Error(res?.message || 'Invalid facilities payload received from server');
      }
    } catch (err: any) {
      console.error('Failed to load campus facilities:', err);
      setError(err?.message || 'Unable to connect to campus facilities backend API. Please verify server availability.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadFacilities();
  }, []);

  // Filter facilities
  const filtered = facilities.filter(f => {
    const matchesCat = selectedCategory === 'all' || f.category === selectedCategory;
    const matchesSearch = !searchQuery.trim() || 
      f.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
      f.code.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  const getApplianceIcon = (type: string) => {
    switch (type) {
      case 'pump': return <Droplets className="w-3.5 h-3.5 text-cyan-400" />;
      case 'ac': return <Zap className="w-3.5 h-3.5 text-cyan-400" />;
      case 'fan': return <Fan className="w-3.5 h-3.5 text-blue-400" />;
      case 'light': return <Zap className="w-3.5 h-3.5 text-amber-400" />;
      case 'projector': return <Tv className="w-3.5 h-3.5 text-purple-400" />;
      case 'computer': return <Laptop className="w-3.5 h-3.5 text-emerald-400" />;
      default: return <Power className="w-3.5 h-3.5 text-slate-400" />;
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header Banner */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Wrench className="w-5 h-5 text-cyan-400" /> Campus Facilities Telemetry & Operations
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Granular telemetry inspection across buildings, rooms, connected appliances, IoT meters, and maintenance work orders
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-simulated">VERIFIED INFRASTRUCTURE</span>
          <button
            onClick={loadFacilities}
            disabled={loading}
            className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-all disabled:opacity-50"
            title="Reload Facilities Telemetry"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* Categories & Search Filter Bar */}
      <div className="flex flex-col sm:flex-row gap-2 justify-between items-stretch sm:items-center">
        <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-thin">
          {categories.map(c => (
            <button
              key={c.id}
              onClick={() => setSelectedCategory(c.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all ${
                selectedCategory === c.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-slate-500'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>

        <div className="relative min-w-[220px]">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Search facility by name or code..."
            className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl pl-8 pr-3 py-1.5 text-xs text-[var(--text-primary)] placeholder-slate-500 focus:outline-none focus:border-cyan-400"
          />
        </div>
      </div>

      {/* Loading Skeleton */}
      {loading && facilities.length === 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {[1, 2, 3, 4, 5, 6].map(i => (
            <div key={i} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 animate-pulse space-y-3">
              <div className="h-4 bg-slate-700/60 rounded w-2/3" />
              <div className="h-3 bg-slate-700/40 rounded w-1/3" />
              <div className="grid grid-cols-2 gap-2 pt-2">
                <div className="h-10 bg-slate-800 rounded" />
                <div className="h-10 bg-slate-800 rounded" />
              </div>
              <div className="h-8 bg-slate-800 rounded" />
            </div>
          ))}
        </div>
      )}

      {/* Error Message with Retry Action */}
      {error && (
        <div className="p-5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 space-y-3 animate-fadeIn">
          <div className="flex items-center gap-2 font-bold text-sm text-rose-400">
            <AlertTriangle className="w-5 h-5 text-rose-400" />
            <span>Campus Facilities Data Load Error</span>
          </div>
          <p className="text-xs text-slate-300">{error}</p>
          <button
            onClick={loadFacilities}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-xs flex items-center gap-2 transition-all shadow-md"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Retry Loading Facility Telemetry</span>
          </button>
        </div>
      )}

      {/* Empty State */}
      {!loading && !error && filtered.length === 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center space-y-3">
          <Building2 className="w-12 h-12 text-slate-500 mx-auto" />
          <h3 className="text-sm font-bold text-[var(--text-primary)]">No Campus Facilities Found</h3>
          <p className="text-xs text-[var(--text-muted)] max-w-sm mx-auto">
            No facility matches your filter "{selectedCategory !== 'all' ? selectedCategory : searchQuery}". Try selecting "All Facilities" or clearing search.
          </p>
          <button
            onClick={() => { setSelectedCategory('all'); setSearchQuery(''); }}
            className="px-3.5 py-1.5 rounded-lg bg-cyan-600 text-white text-xs font-semibold"
          >
            Reset Filters
          </button>
        </div>
      )}

      {/* Facilities Grid with Clickable Open Data Action */}
      {!loading && !error && filtered.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {filtered.map(f => {
            const highUsageCount = (f.rooms || []).filter((r: any) => r.status === 'high_usage').length;
            const bPumps = (f.appliances || []).filter((a: any) => a.type === 'pump');
            const bOn = (f.appliances || []).filter((a: any) => a.status === 'on').length;
            const bOff = (f.appliances || []).filter((a: any) => a.status === 'off').length;
            const bUnavail = (f.appliances || []).filter((a: any) => a.status === 'unavailable').length;

            return (
              <div
                key={f.id}
                className="bg-[var(--bg-secondary)] border border-[var(--border-color)] hover:border-cyan-500/50 rounded-xl p-4 card-hover flex flex-col justify-between transition-all group"
              >
                <div>
                  {/* Title & Code */}
                  <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                    <span className="font-bold text-sm text-[var(--text-primary)] group-hover:text-cyan-400 transition-colors truncate">
                      {f.name}
                    </span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                      {f.code}
                    </span>
                  </div>

                  <p className="text-xs text-[var(--text-muted)] mt-1.5">{f.categoryLabel}</p>

                  {/* Area & Space Metrics */}
                  <div className="grid grid-cols-2 gap-2 mt-3 text-xs">
                    <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Total Area</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{f.floorAreaSqM} m²</span>
                    </div>
                    <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                      <span className="text-[10px] text-[var(--text-muted)] block">Floors / Rooms</span>
                      <span className="font-mono font-bold text-[var(--text-primary)]">{f.totalFloors} F • {f.roomsCount || f.totalRooms} R</span>
                    </div>
                  </div>

                  {/* Telemetry Numbers */}
                  <div className="mt-3 space-y-1.5 text-[11px]">
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Active Demand:</span>
                      <span className="font-mono font-bold text-cyan-400">{f.currentPowerKw} kW</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-[var(--text-muted)]">Power Factor:</span>
                      <span className={`font-mono font-bold ${f.powerFactor >= 0.95 ? 'text-emerald-400' : 'text-amber-400'}`}>
                        {f.powerFactor}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-[var(--text-muted)]">Appliance States:</span>
                      <div className="flex items-center gap-1.5 font-mono text-[10px]">
                        <span className="text-emerald-400 font-bold">{bOn} ON</span>
                        <span className="text-slate-500">•</span>
                        <span className="text-slate-400">{bOff} OFF</span>
                        {bUnavail > 0 && (
                          <>
                            <span className="text-slate-500">•</span>
                            <span className="text-amber-400 font-bold">{bUnavail} Unavail</span>
                          </>
                        )}
                      </div>
                    </div>
                    {bPumps.length > 0 && (
                      <div className="flex justify-between items-center text-[10px] text-cyan-300 bg-cyan-950/20 px-2 py-0.5 rounded border border-cyan-500/20">
                        <span className="flex items-center gap-1"><Droplets className="w-3 h-3" /> Circulation Pumps:</span>
                        <span className="font-bold">{bPumps.filter(p => p.status === 'on').length}/{bPumps.length} Active</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Open Data Button */}
                <div className="mt-4 pt-3 border-t border-[var(--border-color)] flex items-center justify-between">
                  <div className="flex items-center gap-1.5 text-[10px]">
                    {highUsageCount > 0 ? (
                      <span className="text-rose-400 flex items-center gap-1 font-semibold">
                        <AlertTriangle className="w-3 h-3" /> {highUsageCount} High Load
                      </span>
                    ) : (
                      <span className="text-emerald-400 flex items-center gap-1 font-semibold">
                        <CheckCircle2 className="w-3 h-3" /> Nominal
                      </span>
                    )}
                  </div>

                  <button
                    onClick={() => {
                      setSelectedFacilityForDetails(f);
                      setModalTab('rooms');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-all shadow-sm shadow-cyan-600/20"
                  >
                    <span>Open Facility Data</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Facility Granular Telemetry Inspector Modal / Drawer */}
      {selectedFacilityForDetails && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-3 sm:p-5 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#131C31] border border-cyan-500/40 rounded-2xl max-w-4xl w-full max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
            {/* Modal Header */}
            <div className="p-4 sm:p-5 border-b border-slate-700 flex items-start justify-between bg-[#0A0F1D]">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                    {selectedFacilityForDetails.code}
                  </span>
                  <h3 className="text-base sm:text-lg font-bold text-white">
                    {selectedFacilityForDetails.name}
                  </h3>
                </div>
                <p className="text-xs text-slate-400 mt-1">
                  {selectedFacilityForDetails.categoryLabel} • {selectedFacilityForDetails.totalFloors} Floors • {selectedFacilityForDetails.floorAreaSqM} m² • Power Demand: <strong className="text-cyan-400 font-mono">{selectedFacilityForDetails.currentPowerKw} kW</strong>
                </p>
              </div>

              <button
                onClick={() => setSelectedFacilityForDetails(null)}
                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Tabs */}
            <div className="flex border-b border-slate-700 bg-slate-900/60 px-4 pt-2 gap-2 overflow-x-auto">
              {[
                { id: 'rooms', label: `Monitored Rooms (${(selectedFacilityForDetails.rooms || []).length})` },
                { id: 'appliances', label: `Connected Appliances (${(selectedFacilityForDetails.appliances || []).length})` },
                { id: 'sensors', label: `IoT Meters & Sensors (${(selectedFacilityForDetails.devices || []).length})` },
                { id: 'orders', label: `Maintenance & Alerts` }
              ].map(t => (
                <button
                  key={t.id}
                  onClick={() => setModalTab(t.id as any)}
                  className={`px-3.5 py-2 text-xs font-semibold border-b-2 transition-all whitespace-nowrap ${
                    modalTab === t.id
                      ? 'border-cyan-400 text-cyan-300 bg-cyan-500/10'
                      : 'border-transparent text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Modal Body */}
            <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
              {/* TAB 1: ROOMS */}
              {modalTab === 'rooms' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-1">
                    <span>Rooms mapped to {selectedFacilityForDetails.name}:</span>
                    <span className="font-mono text-cyan-400">Consistent Asset ID: {selectedFacilityForDetails.id}</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(selectedFacilityForDetails.rooms || []).map((r: any) => (
                      <div
                        key={r.id}
                        className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-700/80 hover:border-cyan-500/50 flex flex-col justify-between transition-colors text-xs"
                      >
                        <div>
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white text-xs">{r.name}</span>
                            <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-cyan-400 border border-slate-700">
                              {r.roomNumber}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-400 block mt-0.5">{r.floor} • {r.departmentName || 'General Zone'}</span>
                        </div>

                        <div className="mt-3 pt-2 border-t border-slate-800 flex items-center justify-between text-[11px]">
                          <span className="text-slate-400">Power: <strong className="font-mono text-cyan-400">{r.currentPowerKw} kW</strong></span>
                          <span className="text-slate-400">Energy Today: <strong className="font-mono text-slate-200">{r.todayKwh} kWh</strong></span>
                          {onNavigateToRoomControl && (
                            <button
                              onClick={() => {
                                setSelectedFacilityForDetails(null);
                                onNavigateToRoomControl(r.id, selectedFacilityForDetails.id);
                              }}
                              className="px-2 py-0.5 rounded bg-cyan-600/30 hover:bg-cyan-600 text-cyan-300 hover:text-white text-[10px] font-semibold transition-all"
                            >
                              Control →
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 2: APPLIANCES */}
              {modalTab === 'appliances' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-1">
                    <span>Individual appliances, ACs, fans, lights & pumps with live switch state:</span>
                    <span className="font-mono text-emerald-400">{(selectedFacilityForDetails.appliances || []).filter((a: any) => a.status === 'on').length} Currently Drawing Power</span>
                  </div>

                  <div className="overflow-x-auto border border-slate-700/80 rounded-xl">
                    <table className="w-full text-xs text-left">
                      <thead className="bg-[#0A0F1D] text-slate-400 border-b border-slate-700 text-[11px]">
                        <tr>
                          <th className="px-3 py-2">Appliance Name & Code</th>
                          <th className="px-3 py-2">Room / Floor</th>
                          <th className="px-3 py-2">Type</th>
                          <th className="px-3 py-2">Status & Telemetry</th>
                          <th className="px-3 py-2 text-right">Power Draw</th>
                          <th className="px-3 py-2 text-right">Today Energy</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {(selectedFacilityForDetails.appliances || []).map((a: any) => (
                          <tr key={a.id} className="hover:bg-slate-800/40 transition-colors">
                            <td className="px-3 py-2.5">
                              <div className="font-semibold text-white flex items-center gap-1.5">
                                {getApplianceIcon(a.type)}
                                {a.name}
                              </div>
                              <span className="text-[10px] font-mono text-slate-500">{a.code}</span>
                            </td>
                            <td className="px-3 py-2.5 text-slate-300">
                              <div>{a.roomNumber}</div>
                              <span className="text-[10px] text-slate-500">{a.floor}</span>
                            </td>
                            <td className="px-3 py-2.5 capitalize text-slate-300">
                              <span className="px-1.5 py-0.5 rounded text-[10px] bg-slate-800 text-slate-300 uppercase">
                                {a.type}
                              </span>
                            </td>
                            <td className="px-3 py-2.5">
                              {a.status === 'on' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                                  ON (Confirmed)
                                </span>
                              ) : a.status === 'off' ? (
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-800 text-slate-400 border border-slate-700 inline-flex items-center gap-1">
                                  <span className="w-1.5 h-1.5 rounded-full bg-slate-500" />
                                  OFF (Confirmed)
                                </span>
                              ) : (
                                <div className="space-y-0.5">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 inline-flex items-center gap-1">
                                    <AlertTriangle className="w-3 h-3" />
                                    Status Unavailable
                                  </span>
                                  <span className="text-[9px] text-slate-400 block">{a.unavailableReason || 'Gateway unlinked'}</span>
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono font-bold text-cyan-400">
                              {a.status === 'on' ? `${((a.powerWatts || 0) / 1000).toFixed(2)} kW` : '0.00 kW'}
                            </td>
                            <td className="px-3 py-2.5 text-right font-mono text-slate-300">
                              {a.todayKwh || 0} kWh
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* TAB 3: SENSORS & METERS */}
              {modalTab === 'sensors' && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs text-slate-400 pb-1">
                    <span>Modbus RS-485 Power Meters & IoT Nodes:</span>
                    <span className="font-mono text-cyan-400">{(selectedFacilityForDetails.devices || []).filter((d: any) => d.status === 'online').length} Online</span>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(selectedFacilityForDetails.devices || []).map((d: any) => (
                      <div key={d.id} className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 space-y-2 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white flex items-center gap-1.5">
                            <Cpu className="w-3.5 h-3.5 text-cyan-400" />
                            {d.name}
                          </span>
                          <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                            d.status === 'online' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30' : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          }`}>
                            {d.status.toUpperCase()}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 space-y-0.5">
                          <div>Meter ID: <span className="font-mono text-slate-300">{d.id}</span></div>
                          <div>Bus Protocol: <span className="font-mono text-slate-300">{d.busType || 'RS-485 Modbus RTU / ESP32 WiFi'}</span></div>
                          <div>Sampling Frequency: <span className="font-mono text-slate-300">15 seconds</span></div>
                          <div>Last Telemetry Timestamp: <span className="font-mono text-cyan-400">{d.lastSeen ? new Date(d.lastSeen).toLocaleTimeString() : 'Active'}</span></div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* TAB 4: MAINTENANCE & ALERTS */}
              {modalTab === 'orders' && (
                <div className="space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Scheduled Work Orders & Operational Checks</h4>
                  <div className="space-y-2">
                    {(selectedFacilityForDetails.maintenanceWorkOrders || []).map((wo: any) => (
                      <div key={wo.id} className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 space-y-1 text-xs">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white">{wo.title}</span>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30 uppercase">
                            {wo.status.replace('_', ' ')}
                          </span>
                        </div>
                        <p className="text-[11px] text-slate-400">{wo.description}</p>
                        <span className="text-[10px] text-slate-500 block pt-1">Scheduled for: {wo.scheduledFor}</span>
                      </div>
                    ))}
                  </div>

                  <h4 className="text-xs font-bold text-white uppercase tracking-wider pt-2">Active Alerts for this Facility</h4>
                  {(selectedFacilityForDetails.alerts || []).length > 0 ? (
                    <div className="space-y-2">
                      {(selectedFacilityForDetails.alerts || []).map((a: any) => (
                        <div key={a.id} className="p-2.5 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center justify-between">
                          <div>
                            <span className="font-bold block">{a.title || a.message}</span>
                            <span className="text-[10px] text-slate-400">{a.roomName || a.roomId} • {new Date(a.timestamp).toLocaleTimeString()}</span>
                          </div>
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-rose-600 text-white">
                            {a.severity}
                          </span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-300 text-xs flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>All electrical circuits in {selectedFacilityForDetails.name} are operating nominally with zero active emergency alerts.</span>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-700 bg-[#0A0F1D] flex justify-between items-center text-xs">
              <span className="text-slate-400 font-mono text-[11px]">
                Facility Code: {selectedFacilityForDetails.code} • MITS Campus Gwalior
              </span>
              <button
                onClick={() => setSelectedFacilityForDetails(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold transition-colors"
              >
                Close Inspector
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
