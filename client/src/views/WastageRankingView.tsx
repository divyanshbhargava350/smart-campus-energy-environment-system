import React, { useState, useEffect } from 'react';
import { BarChart3, TrendingDown, AlertTriangle } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { api } from '../services/api.js';

export const WastageRankingView: React.FC = () => {
  const [data, setData] = useState<any>({ roomRanking: [], buildingRanking: [] });
  const [view, setView] = useState<'rooms' | 'buildings'>('rooms');

  useEffect(() => {
    api.wastageRanking().then(r => { if (r.success) setData(r.data); });
  }, []);

  const ranking = view === 'rooms' ? data.roomRanking : data.buildingRanking;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-rose-400" /> Energy Wastage Ranking
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Highest consuming locations — investigate for optimization</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setView('rooms')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === 'rooms' ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>By Room</button>
          <button onClick={() => setView('buildings')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === 'buildings' ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>By Building</button>
        </div>
      </div>

      <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-[11px] text-amber-400 flex items-start gap-2">
        <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
        <span>High consumption ≠ confirmed wastage. Labs, workshops, and server rooms legitimately consume more. Investigate usage patterns before concluding wastage.</span>
      </div>

      <span className="badge-simulated">SIMULATED DATA</span>

      {/* Top 10 Chart */}
      {ranking.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Top {Math.min(ranking.length, 10)} Consumers (kWh Today)</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={ranking.slice(0, 10)} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit=" kWh" />
              <YAxis dataKey={view === 'rooms' ? 'roomNumber' : 'code'} type="category" tick={{ fontSize: 10 }} width={70} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey={view === 'rooms' ? 'todayKwh' : 'todayEnergyKwh'} name="kWh" radius={[0, 4, 4, 0]}>
                {ranking.slice(0, 10).map((_: any, i: number) => (
                  <Cell key={i} fill={i < 3 ? '#EF4444' : i < 6 ? '#F59E0B' : '#10B981'} />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Ranking Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2">Rank</th>
                <th className="text-left px-4 py-2">{view === 'rooms' ? 'Room' : 'Building'}</th>
                {view === 'rooms' && <th className="text-left px-4 py-2">Department</th>}
                <th className="text-right px-4 py-2">kW</th>
                <th className="text-right px-4 py-2">kWh Today</th>
                <th className="text-right px-4 py-2">Cost (₹)</th>
              </tr>
            </thead>
            <tbody>
              {ranking.map((item: any, i: number) => (
                <tr key={i} className={`border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] ${i < 3 ? 'bg-rose-500/5' : ''}`}>
                  <td className="px-4 py-2 font-bold">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{view === 'rooms' ? `${item.roomNumber} — ${item.roomName}` : item.name}</td>
                  {view === 'rooms' && <td className="px-4 py-2 text-[var(--text-muted)]">{item.departmentName}</td>}
                  <td className="px-4 py-2 text-right font-mono text-cyan-500">{item.currentPowerKw || '—'}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">{(item.todayKwh || item.todayEnergyKwh || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-500">₹{(item.todayCost || 0).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
