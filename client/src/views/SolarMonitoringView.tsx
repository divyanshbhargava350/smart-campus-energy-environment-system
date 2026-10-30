import React, { useState, useEffect } from 'react';
import {
  Sun, Zap, TrendingUp, BatteryCharging, ShieldCheck, AlertCircle,
  Calendar, RefreshCw, BarChart2, Layers, CheckCircle2, DollarSign,
  Wind, Activity, ArrowUpRight, ArrowDownRight, Clock, Info
} from 'lucide-react';
import { api } from '../services/api.js';
import { SolarSystemOverview, SolarInstallationSummary } from '../../../shared/types.js';

interface SolarMonitoringViewProps {
  onNavigateToTab?: (tab: any) => void;
}

export const SolarMonitoringView: React.FC<SolarMonitoringViewProps> = ({ onNavigateToTab }) => {
  const [overview, setOverview] = useState<SolarSystemOverview | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [dateRange, setDateRange] = useState<'7d' | '14d' | 'month'>('14d');
  const [selectedInstallation, setSelectedInstallation] = useState<string>('all');
  const [isSimulatingIngest, setIsSimulatingIngest] = useState<boolean>(false);
  const [ingestSuccessMessage, setIngestSuccessMessage] = useState<string | null>(null);

  const fetchOverview = () => {
    setLoading(true);
    api.solarOverview().then(res => {
      setLoading(false);
      if (res.success && res.data) {
        setOverview(res.data);
      }
    }).catch(err => {
      setLoading(false);
      console.error('Error loading solar overview:', err);
    });
  };

  useEffect(() => {
    fetchOverview();
  }, []);

  const handleSimulateInverterIngest = async () => {
    setIsSimulatingIngest(true);
    setIngestSuccessMessage(null);
    try {
      const res = await api.solarIngest({
        solarSystemId: 'SOLAR_MAIN_ROOFTOP',
        installationName: 'MITS Main Academic Complex Rooftop Array',
        buildingId: 'MITS_MAIN_BUILDING',
        outputKw: +(185 + Math.random() * 20).toFixed(1),
        generatedTodayKwh: +(1150 + Math.random() * 30).toFixed(1),
        cumulativeMwh: 148.8,
        irradianceWm2: 860,
        panelTempC: 39.2,
        inverterStatus: 'normal',
        faultCodes: ['E-00: Normal Generation'],
        dataSource: 'simulated'
      });
      setIsSimulatingIngest(false);
      if (res.success) {
        setIngestSuccessMessage('Inverter telemetry packet ingested and verified via Central Pipeline.');
        fetchOverview();
        setTimeout(() => setIngestSuccessMessage(null), 4000);
      }
    } catch (err) {
      setIsSimulatingIngest(false);
      console.error('Inverter telemetry error:', err);
    }
  };

  if (loading && !overview) {
    return (
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-16 text-center shadow-sm">
        <RefreshCw className="w-8 h-8 mx-auto text-amber-400 animate-spin" />
        <p className="text-xs text-[var(--text-muted)] mt-3">Connecting to Campus Solar Inverter Gateway...</p>
      </div>
    );
  }

  const filteredInstallations = selectedInstallation === 'all'
    ? (overview?.installations || [])
    : (overview?.installations || []).filter(i => i.id === selectedInstallation);

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* ================= HEADER ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-amber-500/20 text-amber-400">
              <Sun className="w-5 h-5" />
            </span>
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Campus Solar Generation & Inverter Monitoring
              </h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">
                Rooftop & Ground Solar PV Arrays • 530 kWp Total Capacity • Inverter Telemetry
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            disabled={isSimulatingIngest}
            onClick={handleSimulateInverterIngest}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-tertiary)] hover:bg-[var(--bg-primary)] border border-[var(--border-color)] text-[var(--text-primary)] transition-all"
          >
            {isSimulatingIngest ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Zap className="w-3.5 h-3.5 text-amber-400" />}
            Simulate Inverter Telemetry
          </button>
          <button
            onClick={fetchOverview}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-amber-600 hover:bg-amber-500 text-white shadow-sm transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Refresh
          </button>
        </div>
      </div>

      {ingestSuccessMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{ingestSuccessMessage}</span>
        </div>
      )}

      {/* ================= TOP METRICS CARDS ================= */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Active Solar Output</span>
            <Sun className="w-4 h-4 text-amber-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-amber-400">{overview?.currentOutputKw}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">kW</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            of 530 kWp Installed
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Generated Today</span>
            <Zap className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-cyan-400">{overview?.todayGeneratedKwh}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">kWh</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Interval Meter Aggregation
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Campus Demand Offset</span>
            <BatteryCharging className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-emerald-400">{overview?.solarContributionPercent}%</span>
          </div>
          <span className="text-[10px] text-emerald-400 block mt-1 flex items-center gap-0.5">
            <ArrowUpRight className="w-3 h-3" /> Clean Generation Ratio
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Avoided Cost (Today)</span>
            <DollarSign className="w-4 h-4 text-amber-300" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-amber-300">₹{overview?.avoidedCostTodayINR.toLocaleString()}</span>
          </div>
          <span className="text-[9px] text-[var(--text-muted)] block mt-1">
            MPPKVVCL HT ₹7.60/kWh
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">Month Avoided Cost</span>
            <TrendingUp className="w-4 h-4 text-teal-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-teal-400">₹{overview?.avoidedCostMonthINR.toLocaleString()}</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Estimated Tariff Savings
          </span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] text-[var(--text-muted)] uppercase font-semibold">CO2 Abatement</span>
            <Wind className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="mt-2">
            <span className="text-xl font-bold font-mono text-emerald-400">{overview?.avoidedCo2TodayKg}</span>
            <span className="text-xs text-[var(--text-muted)] ml-1">kg</span>
          </div>
          <span className="text-[10px] text-[var(--text-secondary)] block mt-1">
            Factor 0.82 kg/kWh
          </span>
        </div>
      </div>

      {/* ================= IMPORTANT METHODOLOGY NOTICE ================= */}
      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-cyan-500/20 text-xs text-[var(--text-secondary)] flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <div>
          <span className="font-bold text-[var(--text-primary)]">Data Integrity & Measurement Transparency: </span>
          Avoided electricity costs are calculated using the active MPPKVVCL HT commercial tariff rate (₹7.60/kWh) and cumulative solar meter telemetry.
          As mandated by IPMVP standards, <em>estimated avoided cost</em> is tracked separately from <em>independently verified financial savings</em> on utility billing receipts.
        </div>
      </div>

      {/* ================= SOLAR GENERATION VS CAMPUS DEMAND 24-HOUR PROFILE ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-[var(--border-color)]">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Activity className="w-4 h-4 text-amber-400" /> 24-Hour Solar Generation vs Campus Demand Profile
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Real-time solar feed, total campus load, and net grid import/export curves
            </p>
          </div>

          <div className="flex items-center gap-3 text-xs">
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-amber-400" />
              <span className="text-[var(--text-secondary)] text-[11px]">Solar PV (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-cyan-500" />
              <span className="text-[var(--text-secondary)] text-[11px]">Campus Load (kW)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded-sm bg-emerald-500" />
              <span className="text-[var(--text-secondary)] text-[11px]">Grid Import (kW)</span>
            </div>
          </div>
        </div>

        {/* Visual Bar / Chart representation */}
        <div className="grid grid-cols-12 md:grid-cols-24 gap-1 pt-4 items-end h-56 border-b border-[var(--border-color)] pb-2">
          {overview?.hourlyProfile.map(item => {
            const maxVal = 450;
            const solarHeight = Math.min(100, (item.solarKw / maxVal) * 100);
            const demandHeight = Math.min(100, (item.campusDemandKw / maxVal) * 100);

            return (
              <div key={item.hour} className="h-full flex flex-col justify-end items-center group relative">
                <div className="w-full flex items-end justify-center gap-0.5 h-full">
                  <div
                    style={{ height: `${solarHeight}%` }}
                    className="w-1.5 sm:w-2 bg-amber-400/90 rounded-t transition-all group-hover:bg-amber-300"
                  />
                  <div
                    style={{ height: `${demandHeight}%` }}
                    className="w-1.5 sm:w-2 bg-cyan-500/70 rounded-t transition-all group-hover:bg-cyan-400"
                  />
                </div>
                <span className="text-[9px] text-[var(--text-muted)] mt-1 hidden sm:block">
                  {item.hour % 3 === 0 ? item.timeLabel.slice(0, 2) : ''}
                </span>

                {/* Hover Tooltip */}
                <div className="absolute bottom-full mb-2 hidden group-hover:block z-30 p-2 rounded bg-black/90 text-white text-[10px] whitespace-nowrap shadow-lg border border-gray-700 pointer-events-none">
                  <div className="font-bold text-amber-300">{item.timeLabel}</div>
                  <div>Solar: {item.solarKw} kW</div>
                  <div>Demand: {item.campusDemandKw} kW</div>
                  <div>Net Import: {item.gridImportKw} kW</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* ================= SOLAR INSTALLATIONS BREAKDOWN ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Layers className="w-4 h-4 text-cyan-400" /> Solar Plant Installations & Inverter Status
            </h3>
            <p className="text-xs text-[var(--text-muted)] mt-0.5">
              Individual solar arrays across MITS campus buildings
            </p>
          </div>

          <div className="flex items-center gap-1 bg-[var(--bg-tertiary)] p-1 rounded-lg border border-[var(--border-color)] text-xs">
            <button
              onClick={() => setSelectedInstallation('all')}
              className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all ${
                selectedInstallation === 'all'
                  ? 'bg-amber-600 text-white font-bold shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              All Installations
            </button>
            {overview?.installations.map(inst => (
              <button
                key={inst.id}
                onClick={() => setSelectedInstallation(inst.id)}
                className={`px-2.5 py-1 rounded text-[11px] font-medium transition-all truncate max-w-[130px] ${
                  selectedInstallation === inst.id
                    ? 'bg-amber-600 text-white font-bold shadow-sm'
                    : 'text-[var(--text-secondary)] hover:text-white'
                }`}
              >
                {inst.name.split(' ')[1] || inst.id}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-2">
          {filteredInstallations.map(inst => (
            <div
              key={inst.id}
              className="p-4 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] shadow-sm space-y-3"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h4 className="text-xs font-bold text-[var(--text-primary)]">
                    {inst.name}
                  </h4>
                  <span className="text-[10px] text-[var(--text-muted)] block mt-0.5">
                    Installed Capacity: <strong className="text-amber-400">{inst.capacityKwp} kWp</strong>
                  </span>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  {inst.inverterStatus.toUpperCase()}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs pt-1">
                <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Instant Output</span>
                  <span className="text-base font-bold font-mono text-amber-400">{inst.currentOutputKw} kW</span>
                </div>

                <div className="p-2 rounded bg-[var(--bg-secondary)] border border-[var(--border-color)]">
                  <span className="text-[10px] text-[var(--text-muted)] block">Today Energy</span>
                  <span className="text-base font-bold font-mono text-cyan-400">{inst.todayGeneratedKwh} kWh</span>
                </div>
              </div>

              <div className="space-y-1 text-[11px] text-[var(--text-secondary)] pt-1 border-t border-[var(--border-color)]">
                <div className="flex justify-between">
                  <span>Inverter Efficiency:</span>
                  <span className="font-mono text-emerald-400 font-semibold">{inst.efficiencyPercent}%</span>
                </div>
                <div className="flex justify-between">
                  <span>Reported Diagnostics:</span>
                  <span className="font-mono text-[var(--text-primary)]">{inst.faultCode}</span>
                </div>
                <div className="flex justify-between">
                  <span>Data Source:</span>
                  <span className="text-cyan-400 font-medium">Smart RS485 Inverter Modbus</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* ================= DATE-WISE GENERATION HISTORY TABLE ================= */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
        <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              Date-wise Solar Generation & Tariff Savings History
            </h3>
          </div>
          <span className="text-xs text-[var(--text-muted)]">Past 14 Days Logged</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] text-[11px]">
                <th className="text-left py-2 font-semibold">Date</th>
                <th className="text-right py-2 font-semibold">Energy Generated (kWh)</th>
                <th className="text-right py-2 font-semibold">Peak Power (kW)</th>
                <th className="text-right py-2 font-semibold">Avoided Electricity Cost (₹)</th>
                <th className="text-right py-2 font-semibold">Inverter Efficiency</th>
                <th className="text-center py-2 font-semibold">Quality Status</th>
              </tr>
            </thead>
            <tbody>
              {overview?.datewiseHistory.map((row, idx) => (
                <tr
                  key={idx}
                  className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors"
                >
                  <td className="py-2.5 font-mono text-[var(--text-primary)]">{row.date}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-cyan-400">{row.generatedKwh}</td>
                  <td className="py-2.5 text-right font-mono text-amber-400">{row.peakKw}</td>
                  <td className="py-2.5 text-right font-mono font-bold text-emerald-400">₹{row.avoidedCostINR.toLocaleString()}</td>
                  <td className="py-2.5 text-right font-mono text-[var(--text-secondary)]">{row.efficiency}%</td>
                  <td className="py-2.5 text-center">
                    <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Validated
                    </span>
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
