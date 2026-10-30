import React, { useState, useEffect } from 'react';
import { 
  Award, CheckCircle2, TrendingDown, DollarSign, Leaf, 
  FileCheck, Shield, Download, Plus 
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { api } from '../services/api.js';

export const SavingsVerificationView: React.FC = () => {
  const [verifications, setVerifications] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedStage, setSelectedStage] = useState<'all' | 'verified' | 'measured' | 'estimated'>('all');

  useEffect(() => {
    api.savingsVerifications().then(res => {
      if (res.success) setVerifications(res.data || []);
      setLoading(false);
    });
  }, []);

  const filtered = selectedStage === 'all'
    ? verifications
    : verifications.filter(v => v.stage === selectedStage);

  const totalVerifiedKwh = verifications
    .filter(v => v.stage === 'verified')
    .reduce((sum, v) => sum + v.savingsKwh, 0);

  const totalVerifiedCost = verifications
    .filter(v => v.stage === 'verified')
    .reduce((sum, v) => sum + v.costSavingsINR, 0);

  const totalVerifiedCO2 = verifications
    .filter(v => v.stage === 'verified')
    .reduce((sum, v) => sum + v.co2ReductionKg, 0);

  const chartData = verifications.map(v => ({
    name: v.title.split(' ')[0] + ' ' + (v.title.split(' ')[1] || ''),
    Baseline: v.baselineKwh,
    PostOptimized: v.postOptimizationKwh,
    Savings: v.savingsKwh
  }));

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Award className="w-5 h-5 text-emerald-400" /> Energy Savings Proof & Verification (M&V)
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Transparent Measurement & Verification separating Estimated, Measured, and Verified energy savings
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-simulated">IPMVP COMPLIANT PROTOCOL</span>
        </div>
      </div>

      {/* 3-Tier Explanatory Alert Banner */}
      <div className="p-3.5 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] space-y-1">
        <strong className="text-[var(--text-primary)] block">Rigorous 3-Tier Savings Hierarchy:</strong>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1 text-[11px]">
          <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <span className="font-bold text-amber-400 block">1. Estimated Savings:</span>
            <span>Modeled pre-retrofit before implementation.</span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <span className="font-bold text-cyan-400 block">2. Measured Savings:</span>
            <span>Recorded from empirical post-retrofit sub-meter data.</span>
          </div>
          <div className="p-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
            <span className="font-bold text-emerald-400 block">3. Verified Savings:</span>
            <span>Reviewed & formally approved under IPMVP Option B methodology.</span>
          </div>
        </div>
      </div>

      {/* Verified Savings Counters */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-emerald-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
            <span>TOTAL VERIFIED SAVINGS</span>
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
              {totalVerifiedKwh.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-emerald-400">kWh</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">Formally signed off by Department & Facility heads</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-amber-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs text-amber-400 font-semibold">
            <span>VERIFIED COST SAVINGS</span>
            <DollarSign className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
              ₹{totalVerifiedCost.toLocaleString()}
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">Calculated at ₹7.60/kWh MPPKVVCL commercial tariff</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-cyan-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs text-cyan-400 font-semibold">
            <span>VERIFIED CO₂ ABATEMENT</span>
            <Leaf className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-1 mt-2">
            <span className="text-3xl font-mono font-bold text-[var(--text-primary)]">
              {totalVerifiedCO2.toLocaleString()}
            </span>
            <span className="text-sm font-bold text-cyan-400">kg CO₂</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">Calculated with 0.82 kg CO₂/kWh grid emission factor</span>
        </div>
      </div>

      {/* Comparison Chart */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)]">
          Pre vs Post-Optimization Measurement Comparison
        </h3>

        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
            <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} />
            <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit=" kWh" width={65} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--bg-secondary)',
                border: '1px solid var(--border-color)',
                borderRadius: '8px',
                fontSize: '11px'
              }}
            />
            <Legend wrapperStyle={{ fontSize: '11px' }} />
            <Bar dataKey="Baseline" name="Pre-Retrofit Baseline (kWh)" fill="#64748B" radius={[4, 4, 0, 0]} />
            <Bar dataKey="PostOptimized" name="Measured Post-Optimization (kWh)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            <Bar dataKey="Savings" name="Energy Savings (kWh)" fill="#10B981" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Verification Records List */}
      <div className="space-y-3">
        <div className="flex justify-between items-center">
          <h3 className="text-sm font-bold text-[var(--text-primary)]">Documented Verification Records</h3>
          <div className="flex gap-1.5">
            {(['all', 'verified', 'measured', 'estimated'] as const).map(stage => (
              <button
                key={stage}
                onClick={() => setSelectedStage(stage)}
                className={`px-3 py-1 rounded-lg text-xs font-semibold capitalize transition-all ${
                  selectedStage === stage
                    ? 'bg-cyan-600 text-white shadow-sm'
                    : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)]'
                }`}
              >
                {stage}
              </button>
            ))}
          </div>
        </div>

        {filtered.map(rec => (
          <div
            key={rec.id}
            className={`p-4 rounded-xl border bg-[var(--bg-secondary)] space-y-2 ${
              rec.stage === 'verified'
                ? 'border-emerald-500/40 shadow-sm'
                : rec.stage === 'measured'
                ? 'border-cyan-500/40'
                : 'border-amber-500/40'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-2 border-b border-[var(--border-color)] gap-1">
              <div>
                <span className="font-bold text-sm text-[var(--text-primary)]">{rec.title}</span>
                <span className="text-xs text-[var(--text-muted)] block">{rec.facilityName}</span>
              </div>
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-bold uppercase self-start sm:self-auto ${
                  rec.stage === 'verified'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : rec.stage === 'measured'
                    ? 'bg-cyan-500/10 text-cyan-400 border border-cyan-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                Stage: {rec.stage}
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Savings (kWh)</span>
                <strong className="text-emerald-400 font-mono text-sm">{rec.savingsKwh} kWh</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Cost Avoidance</span>
                <strong className="text-amber-400 font-mono text-sm">₹{rec.costSavingsINR?.toLocaleString()}</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">CO₂ Reduced</span>
                <strong className="text-cyan-400 font-mono text-sm">{rec.co2ReductionKg} kg</strong>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">Methodology</span>
                <span className="text-[11px] text-[var(--text-secondary)] font-medium">{rec.methodology}</span>
              </div>
            </div>

            <p className="text-[11px] text-[var(--text-muted)] italic pt-1">
              Evidence: {rec.evidenceNotes}
            </p>

            {rec.approvedBy && (
              <div className="pt-2 border-t border-[var(--border-color)] flex items-center justify-between text-[10px] text-emerald-400">
                <span className="flex items-center gap-1 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Approved by {rec.approvedBy}
                </span>
                <span className="text-[var(--text-muted)] font-mono">
                  {new Date(rec.approvedAt).toLocaleDateString()}
                </span>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};
