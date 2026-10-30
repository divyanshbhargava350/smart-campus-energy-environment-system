import React, { useState, useEffect } from 'react';
import { Gauge, Building2, Zap } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Cell } from 'recharts';
import { api } from '../services/api.js';

export const EnergyMonitoringView: React.FC<{ buildings: any[]; rooms: any[]; balance: any }> = ({ buildings, rooms, balance }) => {
  const [comparison, setComparison] = useState<any[]>([]);

  useEffect(() => {
    api.buildingComparison().then(res => { if (res.success) setComparison(res.data); });
  }, []);

  const colors = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Gauge className="w-5 h-5 text-cyan-500" /> Energy Monitoring
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Building-wise and room-wise energy consumption details</p>
        <span className="badge-simulated mt-2 inline-block">SIMULATED DATA</span>
      </div>

      {/* Live Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Total Demand</span>
          <span className="text-xl font-bold font-mono text-cyan-500 block">{balance?.totalCampusDemandKw || 0} kW</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Today Consumption</span>
          <span className="text-xl font-bold font-mono text-[var(--text-primary)] block">{(balance?.totalCampusTodayKwh || 0).toLocaleString()} kWh</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Solar Offset</span>
          <span className="text-xl font-bold font-mono text-emerald-500 block">{balance?.solarOffsetPercentage || 0}%</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Grid Import</span>
          <span className="text-xl font-bold font-mono text-amber-500 block">{balance?.gridElectricityUsedKw || 0} kW</span>
        </div>
      </div>

      {/* Building Comparison Chart */}
      {comparison.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Building-wise Today's Consumption (kWh)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={comparison} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="code" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit=" kWh" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="todayEnergyKwh" name="Today (kWh)" radius={[4, 4, 0, 0]}>
                {comparison.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Top Consuming Rooms */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Top Consuming Rooms</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Room</th>
                <th className="text-left px-4 py-2">Department</th>
                <th className="text-right px-4 py-2">Power (kW)</th>
                <th className="text-right px-4 py-2">Today (kWh)</th>
                <th className="text-right px-4 py-2">Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {[...rooms].sort((a: any, b: any) => b.todayKwh - a.todayKwh).slice(0, 10).map((r: any, i: number) => (
                <tr key={r.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]">
                  <td className="px-4 py-2 font-bold text-[var(--text-muted)]">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{r.roomNumber} — {r.name}</td>
                  <td className="px-4 py-2 text-[var(--text-muted)]">{r.departmentName || '—'}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-cyan-500">{r.currentPowerKw}</td>
                  <td className="px-4 py-2 text-right font-mono">{r.todayKwh}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-500">₹{Math.round(r.todayKwh * 7.6)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
