import React, { useState, useEffect } from 'react';
import { Settings, Play, Pause, DollarSign, AlertTriangle, Users, Save, CheckCircle2 } from 'lucide-react';
import { api } from '../services/api.js';

export const AdministrationView: React.FC = () => {
  const [simulatorRunning, setSimulatorRunning] = useState<boolean>(true);
  const [tariff, setTariff] = useState<any>({ ratePerKwh: 7.60, solarFeedInTariff: 4.25 });
  const [thresholds, setThresholds] = useState<any>({ highPowerKw: 15, criticalPowerKw: 25, highTempC: 40 });
  const [users, setUsers] = useState<any[]>([]);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  useEffect(() => {
    api.simulatorStatus().then(res => {
      if (res.success && res.data) {
        setSimulatorRunning(res.data.running);
        if (res.data.thresholds) setThresholds(res.data.thresholds);
      }
    });

    api.tariff().then(res => {
      if (res.success && res.data) setTariff(res.data);
    });

    api.adminUsers().then(res => {
      if (res.success && res.data) setUsers(res.data);
    });
  }, []);

  const handleToggleSimulator = async () => {
    const res = await api.toggleSimulator();
    if (res.success && res.data) {
      setSimulatorRunning(res.data.running);
    }
  };

  const handleSaveTariff = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.updateTariff(tariff);
    if (res.success) {
      setSavedMsg('Tariff updated successfully');
      setTimeout(() => setSavedMsg(null), 3000);
    }
  };

  const handleSaveThresholds = async (e: React.FormEvent) => {
    e.preventDefault();
    const res = await api.updateThresholds(thresholds);
    if (res.success) {
      setSavedMsg('Alert thresholds saved successfully');
      setTimeout(() => setSavedMsg(null), 3000);
    }
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Settings className="w-5 h-5 text-cyan-400" /> System Administration & Controls
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Configure campus energy tariffs, peak alert thresholds, telemetry simulation, and user roles
          </p>
        </div>
        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-cyan-600/20 text-cyan-300 border border-cyan-500/40">
          ADMIN ACCESS
        </span>
      </div>

      {savedMsg && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 shrink-0" />
          <span>{savedMsg}</span>
        </div>
      )}

      {/* Simulator Control & Telemetry State */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Telemetry Simulator Engine</h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Controls simulated IoT data generation, solar irradiance diurnal curves, and live fluctuation ticks
            </p>
          </div>
          <button
            onClick={handleToggleSimulator}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all shadow-sm ${
              simulatorRunning
                ? 'bg-amber-600 hover:bg-amber-500 text-white'
                : 'bg-emerald-600 hover:bg-emerald-500 text-white'
            }`}
          >
            {simulatorRunning ? (
              <>
                <Pause className="w-3.5 h-3.5" /> Pause Simulation
              </>
            ) : (
              <>
                <Play className="w-3.5 h-3.5" /> Resume Simulation
              </>
            )}
          </button>
        </div>
        <div className="mt-3 p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] flex items-center justify-between text-xs">
          <div className="flex items-center gap-2">
            <span className={`w-2.5 h-2.5 rounded-full ${simulatorRunning ? 'bg-emerald-400 animate-pulse' : 'bg-amber-400'}`} />
            <span className="text-[var(--text-secondary)] font-medium">
              Simulation Status: <strong className="text-[var(--text-primary)]">{simulatorRunning ? 'RUNNING (Ticks every 3s)' : 'PAUSED'}</strong>
            </span>
          </div>
          <span className="badge-simulated">LABELED SIMULATED</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Tariff Configuration Form */}
        <form onSubmit={handleSaveTariff} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <DollarSign className="w-4 h-4 text-amber-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Electricity Tariff Configuration</h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Set commercial high-tension rate per kWh and solar feed-in credit for MITS campus.
            </p>

            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Grid Commercial Tariff (₹ / kWh)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={tariff.ratePerKwh || ''}
                  onChange={e => setTariff({ ...tariff, ratePerKwh: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Solar Net-Metering Feed-in Tariff (₹ / kWh)
                </label>
                <input
                  type="number"
                  step="0.05"
                  value={tariff.solarFeedInTariff || ''}
                  onChange={e => setTariff({ ...tariff, solarFeedInTariff: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save Tariff Settings
          </button>
        </form>

        {/* Peak Spike & Alert Threshold Form */}
        <form onSubmit={handleSaveThresholds} className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 pb-2 border-b border-[var(--border-color)]">
              <AlertTriangle className="w-4 h-4 text-rose-400" />
              <h3 className="text-sm font-bold text-[var(--text-primary)]">Peak Spikes & Anomaly Thresholds</h3>
            </div>
            <p className="text-[11px] text-[var(--text-muted)] mt-1.5">
              Configure trigger thresholds for automated spike warning alerts.
            </p>

            <div className="space-y-3 mt-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  High Power Warning Threshold (kW / Room)
                </label>
                <input
                  type="number"
                  step="1"
                  value={thresholds.highPowerKw || ''}
                  onChange={e => setThresholds({ ...thresholds, highPowerKw: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Critical Spike Threshold (kW / Room)
                </label>
                <input
                  type="number"
                  step="1"
                  value={thresholds.criticalPowerKw || ''}
                  onChange={e => setThresholds({ ...thresholds, criticalPowerKw: parseFloat(e.target.value) })}
                  className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
                  required
                />
              </div>
            </div>
          </div>

          <button
            type="submit"
            className="mt-4 flex items-center justify-center gap-1.5 w-full py-2 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors"
          >
            <Save className="w-3.5 h-3.5" /> Save Thresholds
          </button>
        </form>
      </div>

      {/* User Accounts Registered in System */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Registered System Users ({users.length})</h3>
          </div>
          <span className="text-[10px] text-[var(--text-muted)]">Persistent Hashed Accounts</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2 font-semibold">Full Name</th>
                <th className="text-left px-4 py-2 font-semibold">Email</th>
                <th className="text-left px-4 py-2 font-semibold">Assigned Role</th>
                <th className="text-left px-4 py-2 font-semibold">Department</th>
                <th className="text-right px-4 py-2 font-semibold">Last Active</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                  <td className="px-4 py-2.5 font-semibold text-[var(--text-primary)]">{u.name}</td>
                  <td className="px-4 py-2.5 font-mono text-[var(--text-secondary)]">{u.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      u.role === 'admin'
                        ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                        : 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/30'
                    }`}>
                      {u.roleTitle || u.role}
                    </span>
                  </td>
                  <td className="px-4 py-2.5 text-[var(--text-muted)]">{u.departmentName || '— All Campus —'}</td>
                  <td className="px-4 py-2.5 text-right font-mono text-[10px] text-[var(--text-muted)]">
                    {u.lastLogin ? new Date(u.lastLogin).toLocaleDateString() : '—'}
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
