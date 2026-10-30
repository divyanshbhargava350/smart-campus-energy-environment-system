import React, { useState, useEffect } from 'react';
import { Cpu, Wifi, WifiOff, Plus, RefreshCw, CheckCircle, ShieldAlert } from 'lucide-react';
import { api } from '../services/api.js';

interface DeviceManagementViewProps {
  userRole: string;
}

export const DeviceManagementView: React.FC<DeviceManagementViewProps> = ({ userRole }) => {
  const [devices, setDevices] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'online' | 'offline'>('all');

  const fetchDevices = () => {
    setLoading(true);
    const params: any = {};
    if (statusFilter !== 'all') params.status = statusFilter;
    api.devices(params)
      .then(res => {
        if (res.success) setDevices(res.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchDevices();
  }, [statusFilter]);

  const onlineCount = devices.filter(d => d.status === 'online').length;
  const offlineCount = devices.filter(d => d.status === 'offline').length;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-5 h-5 text-cyan-400" /> Device & IoT Fleet Management
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Smart meters, energy sensors, and IoT gateways across campus
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-simulated">SIMULATED FLEET</span>
          <button
            onClick={fetchDevices}
            className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
            title="Refresh devices"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Total Connected Devices</span>
          <span className="text-xl font-bold font-mono text-[var(--text-primary)] block">{devices.length}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Online Meters</span>
          <span className="text-xl font-bold font-mono text-emerald-400 block">{onlineCount}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Offline / Unreachable</span>
          <span className="text-xl font-bold font-mono text-rose-400 block">{offlineCount}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Telemetry Protocol</span>
          <span className="text-xs font-semibold text-cyan-400 block mt-1">MQTT / Modbus RTU / HTTP</span>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2">
        {(['all', 'online', 'offline'] as const).map(filter => (
          <button
            key={filter}
            onClick={() => setStatusFilter(filter)}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
              statusFilter === filter
                ? 'bg-cyan-600 text-white'
                : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
            }`}
          >
            {filter} ({filter === 'all' ? devices.length : filter === 'online' ? onlineCount : offlineCount})
          </button>
        ))}
      </div>

      {/* Device Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Configured Fleet Inventory</h3>
          <span className="text-[11px] text-[var(--text-muted)]">ESP32 / Modbus Energy Meters</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2 font-semibold">Status</th>
                <th className="text-left px-4 py-2 font-semibold">Device Name & ID</th>
                <th className="text-left px-4 py-2 font-semibold">Type</th>
                <th className="text-left px-4 py-2 font-semibold">Assigned Building</th>
                <th className="text-right px-4 py-2 font-semibold">Last Power (kW)</th>
                <th className="text-left px-4 py-2 font-semibold">Firmware</th>
                <th className="text-right px-4 py-2 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {devices.map((device) => (
                <tr key={device.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-2.5">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold ${
                      device.status === 'online'
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                        : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                    }`}>
                      {device.status === 'online' ? <Wifi className="w-3 h-3" /> : <WifiOff className="w-3 h-3" />}
                      {device.status.toUpperCase()}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <div className="font-semibold text-[var(--text-primary)]">{device.name}</div>
                    <div className="text-[10px] text-cyan-400 font-mono">{device.id}</div>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] capitalize font-mono text-[11px]">
                    {device.type.replace('_', ' ')}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-secondary)] font-medium">
                    {device.buildingName}
                  </td>
                  <td className="px-4 py-2.5 text-right font-mono font-bold text-cyan-400">
                    {device.lastReading != null ? `${device.lastReading} kW` : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)] font-mono text-[11px]">
                    {device.firmwareVersion || 'v1.0.0'}
                  </td>
                  <td className="px-4 py-2.5 text-right text-[10px] text-[var(--text-muted)]">
                    {new Date(device.lastSeen).toLocaleTimeString()}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
