import React, { useState, useEffect } from 'react';
import { TrendingUp, ArrowUp, ArrowDown, Minus } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../services/api.js';

export const ComparisonView: React.FC<{ buildings: any[]; departments: any[] }> = ({ buildings, departments }) => {
  const [compareType, setCompareType] = useState<'buildings' | 'departments'>('buildings');
  const [buildingData, setBuildingData] = useState<any[]>([]);
  const [deptData, setDeptData] = useState<any[]>([]);

  useEffect(() => {
    api.buildingComparison().then(r => { if (r.success) setBuildingData(r.data); });
    api.departmentComparison().then(r => { if (r.success) setDeptData(r.data); });
  }, []);

  const data = compareType === 'buildings' ? buildingData : deptData;

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-cyan-500" /> Energy Comparison
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Compare buildings and departments</p>
        </div>
        <div className="flex gap-1">
          <button onClick={() => setCompareType('buildings')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${compareType === 'buildings' ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Buildings</button>
          <button onClick={() => setCompareType('departments')} className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${compareType === 'departments' ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>Departments</button>
        </div>
      </div>

      <span className="badge-simulated">SIMULATED COMPARISON</span>

      {data.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">
            {compareType === 'buildings' ? 'Building' : 'Department'} Consumption Comparison
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={data} layout="vertical" margin={{ left: 10 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 10 }} unit=" kWh" />
              <YAxis dataKey={compareType === 'buildings' ? 'code' : 'code'} type="category" tick={{ fontSize: 10 }} width={60} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey={compareType === 'buildings' ? 'todayEnergyKwh' : 'todayKwh'} name="Today (kWh)" fill="#06B6D4" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Comparison Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2">#</th>
                <th className="text-left px-4 py-2">Name</th>
                <th className="text-right px-4 py-2">Current (kW)</th>
                <th className="text-right px-4 py-2">Today (kWh)</th>
                <th className="text-right px-4 py-2">Cost (₹)</th>
                <th className="text-right px-4 py-2">kWh/Room</th>
              </tr>
            </thead>
            <tbody>
              {data.map((item: any, i: number) => (
                <tr key={item.id || i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]">
                  <td className="px-4 py-2 font-bold text-[var(--text-muted)]">{i + 1}</td>
                  <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{item.name}</td>
                  <td className="px-4 py-2 text-right font-mono text-cyan-500">{item.currentPowerKw}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold">{(item.todayEnergyKwh || item.todayKwh || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-500">₹{(item.todayCost || 0).toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-[var(--text-muted)]">{item.kwhPerRoom || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
