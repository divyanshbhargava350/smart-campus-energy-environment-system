import React, { useState, useEffect } from 'react';
import { Receipt, Building2, Download } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';
import { api } from '../services/api.js';

export const BillingExpensesView: React.FC = () => {
  const [billingData, setBillingData] = useState<any>(null);
  const [view, setView] = useState<'overview' | 'daily' | 'monthly'>('overview');

  useEffect(() => {
    api.billingOverview().then(r => { if (r.success) setBillingData(r.data); });
  }, []);

  if (!billingData) return <div className="text-center py-12 text-[var(--text-muted)]">Loading billing data...</div>;

  const pieColors = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#EF4444'];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Receipt className="w-5 h-5 text-amber-500" /> Billing & Expenses
          </h2>
          <p className="text-xs text-[var(--text-muted)]">Electricity cost tracking — ₹{billingData.tariff.ratePerKwh}/kWh (MPPKVVCL)</p>
        </div>
        <div className="flex items-center gap-2">
          <span className="badge-simulated">ESTIMATED</span>
          {(['overview', 'daily', 'monthly'] as const).map(v => (
            <button key={v} onClick={() => setView(v)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold ${view === v ? 'bg-cyan-600 text-white' : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)]'}`}>
              {v.charAt(0).toUpperCase() + v.slice(1)}
            </button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Today Grid Cost</span>
          <span className="text-xl font-bold font-mono text-amber-500 block">₹{billingData.todayGridCost?.toLocaleString()}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Month Estimate</span>
          <span className="text-xl font-bold font-mono text-[var(--text-primary)] block">₹{billingData.monthEstimatedCost?.toLocaleString()}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Solar Savings Today</span>
          <span className="text-xl font-bold font-mono text-emerald-500 block">₹{billingData.solarSavingsToday?.toLocaleString()}</span>
        </div>
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3">
          <span className="text-[10px] text-[var(--text-muted)]">Tariff Rate</span>
          <span className="text-xl font-bold font-mono text-cyan-500 block">₹{billingData.tariff.ratePerKwh}/kWh</span>
        </div>
      </div>

      {/* Building Expense Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Building-wise Expenses</h3>
          <ResponsiveContainer width="100%" height={250}>
            <PieChart>
              <Pie data={billingData.buildingExpenses} dataKey="todayCost" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={({ name, value }: any) => `${name.split(' ')[0]}: ₹${value}`} labelLine={false}>
                {billingData.buildingExpenses.map((_: any, i: number) => <Cell key={i} fill={pieColors[i % pieColors.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3">Department-wise Cost</h3>
          <ResponsiveContainer width="100%" height={250}>
            <BarChart data={billingData.deptExpenses} layout="vertical">
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis type="number" tick={{ fontSize: 10 }} />
              <YAxis dataKey="name" type="category" tick={{ fontSize: 9 }} width={80} />
              <Tooltip contentStyle={{ backgroundColor: 'var(--bg-secondary)', border: '1px solid var(--border-color)', borderRadius: '8px', fontSize: '11px' }} />
              <Bar dataKey="todayCost" name="₹ Today" fill="#F59E0B" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Expense Table */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Building Expense Details</h3>
          <span className="text-[10px] text-[var(--text-muted)]">All costs are estimates based on ₹{billingData.tariff.ratePerKwh}/kWh</span>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                <th className="text-left px-4 py-2">Building</th>
                <th className="text-right px-4 py-2">Today (kWh)</th>
                <th className="text-right px-4 py-2">Today Cost</th>
                <th className="text-right px-4 py-2">Month (kWh)</th>
                <th className="text-right px-4 py-2">Month Cost</th>
              </tr>
            </thead>
            <tbody>
              {billingData.buildingExpenses.map((b: any) => (
                <tr key={b.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]">
                  <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{b.name}</td>
                  <td className="px-4 py-2 text-right font-mono">{b.todayKwh.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono text-amber-500">₹{b.todayCost.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono">{b.monthKwh.toLocaleString()}</td>
                  <td className="px-4 py-2 text-right font-mono font-bold text-amber-500">₹{b.monthCost.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
