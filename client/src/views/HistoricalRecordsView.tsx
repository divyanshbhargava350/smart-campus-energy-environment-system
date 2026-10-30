import React, { useState, useEffect } from 'react';
import { BarChart3, Calendar } from 'lucide-react';
import { AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../services/api.js';

export const HistoricalRecordsView: React.FC<{ hourlyCurve: any[] }> = ({ hourlyCurve }) => {
  const [weeklyData, setWeeklyData] = useState<any[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);
  const [activeChart, setActiveChart] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  useEffect(() => {
    api.reportWeekly(1, 2024).then(res => { if (res.success) setWeeklyData(res.data.days || []); });
    api.reportMonthly(1, 2024).then(res => { if (res.success) setMonthlyData(res.data.days || []); });
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-cyan-500" /> Historical Records
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">Energy consumption trends over time</p>
        </div>
        <div className="flex gap-1">
          {(['daily', 'weekly', 'monthly'] as const).map(t => (
            <button key={t} onClick={() => setActiveChart(t)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeChart === t ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
              }`}>{t.charAt(0).toUpperCase() + t.slice(1)}</button>
          ))}
        </div>
      </div>

      <span className="badge-simulated">SIMULATED HISTORICAL DATA</span>

      {/* Daily 24-Hour Chart */}
      {activeChart === 'daily' && hourlyCurve.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Today's 24-Hour Profile</h3>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={hourlyCurve}>
              <defs>
                <linearGradient id="hSolar" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} /><stop offset="100%" stopColor="#F59E0B" stopOpacity={0} /></linearGradient>
                <linearGradient id="hLoad" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2} /><stop offset="100%" stopColor="#06B6D4" stopOpacity={0} /></linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10 }} interval={2} />
              <YAxis tick={{ fontSize: 10 }} unit=" kW" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="solarGenKw" name="Solar" stroke="#F59E0B" fill="url(#hSolar)" strokeWidth={2} />
              <Area type="monotone" dataKey="campusLoadKw" name="Campus Load" stroke="#06B6D4" fill="url(#hLoad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Weekly Chart */}
      {activeChart === 'weekly' && weeklyData.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Last 7 Days Consumption</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={weeklyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="dayName" tick={{ fontSize: 10 }} />
              <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="kwh" name="Consumption (kWh)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Monthly Chart */}
      {activeChart === 'monthly' && monthlyData.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Last 30 Days Consumption</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={monthlyData}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="date" tick={{ fontSize: 9 }} interval={4} />
              <YAxis tick={{ fontSize: 10 }} unit=" kWh" />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="kwh" name="kWh" fill="#10B981" radius={[2, 2, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Historical data table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)]">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">
            {activeChart === 'daily' ? 'Hourly Readings' : activeChart === 'weekly' ? 'Daily Records' : 'Monthly Records'}
          </h3>
        </div>
        <div className="overflow-x-auto max-h-64">
          <table className="w-full text-xs">
            <thead className="sticky top-0 bg-[var(--bg-secondary)]">
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2">Time/Date</th>
                <th className="text-right px-4 py-2">Consumption</th>
                <th className="text-right px-4 py-2">Est. Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {(activeChart === 'daily' ? hourlyCurve.map(h => ({ label: h.timeLabel, kwh: h.campusLoadKw, cost: Math.round(h.campusLoadKw * 7.6) }))
                : activeChart === 'weekly' ? weeklyData.map(d => ({ label: `${d.dayName} (${d.date})`, kwh: d.kwh, cost: d.cost }))
                : monthlyData.map(d => ({ label: d.date, kwh: d.kwh, cost: d.cost }))
              ).map((row: any, i: number) => (
                <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]">
                  <td className="px-4 py-1.5 text-[var(--text-primary)]">{row.label}</td>
                  <td className="px-4 py-1.5 text-right font-mono">{row.kwh} {activeChart === 'daily' ? 'kW' : 'kWh'}</td>
                  <td className="px-4 py-1.5 text-right font-mono text-amber-500">₹{row.cost?.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
