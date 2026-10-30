import React from 'react';
import { CampusTelemetryOverview, Building, Alert } from '../../../shared/types.js';
import { HourlyDemandChart } from '../components/charts/HourlyDemandChart.js';
import { 
  Zap, Building2, Cpu, DollarSign, Calendar, TrendingUp, 
  AlertTriangle, Leaf, Gauge, Clock, ShieldCheck, ArrowUpRight
} from 'lucide-react';

interface OverviewDashboardViewProps {
  overview: CampusTelemetryOverview;
  buildings: Building[];
  hourlyData: any[];
  alerts: Alert[];
  onSelectBuilding: (buildingId: string) => void;
  onNavigateToTab: (tabId: any) => void;
}

export const OverviewDashboardView: React.FC<OverviewDashboardViewProps> = ({
  overview,
  buildings = [],
  hourlyData = [],
  alerts = [],
  onSelectBuilding,
  onNavigateToTab
}) => {
  const activeAlerts = alerts.filter(a => a.status === 'active');
  const criticalAlert = activeAlerts.find(a => a.severity === 'critical');

  return (
    <div className="space-y-6">
      {/* Top Banner: Urgent Spikes / Anomaly Alerts */}
      {criticalAlert && (
        <div className="bg-gradient-to-r from-rose-950/40 via-red-900/30 to-slate-900 border border-rose-500/40 p-4 rounded-xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-lg animate-pulse-glow">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-lg bg-rose-500/20 text-rose-400 border border-rose-500/40">
              <AlertTriangle className="w-5 h-5 animate-bounce" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-rose-400 uppercase tracking-wider">CRITICAL ANOMALY DETECTED</span>
                <span className="text-[10px] text-slate-400 font-mono">({criticalAlert.buildingName})</span>
              </div>
              <p className="text-sm font-semibold text-white mt-0.5">{criticalAlert.title}</p>
              <p className="text-xs text-slate-300 mt-0.5 line-clamp-1">{criticalAlert.description}</p>
            </div>
          </div>
          <button
            onClick={() => onNavigateToTab('alerts')}
            className="px-4 py-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold shrink-0 transition-colors shadow-md flex items-center gap-1.5"
          >
            Review Spike & Mitigation
            <ArrowUpRight className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* KPI Stats Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1: Current Power Demand */}
        <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-4 shadow-card-dark relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">CAMPUS MONITORED DEMAND</span>
            <span className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Zap className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline gap-2">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
              {overview.currentCampusDemandKw}
            </span>
            <span className="text-xs font-bold text-cyan-400">kW</span>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span className="flex items-center gap-1 text-emerald-400 font-medium">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping"></span>
              Solar Offset: {overview.solarGenerationNowKw} kW
            </span>
            <span className="font-mono text-slate-500">Net: {overview.gridImportNowKw} kW</span>
          </div>
        </div>

        {/* Metric 2: Today's Accumulated Energy & Cost */}
        <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-4 shadow-card-dark relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">TODAY'S CONSUMPTION & COST</span>
            <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                {overview.todayEnergyKwh.toLocaleString()}
              </span>
              <span className="text-xs font-bold text-emerald-400 ml-1">kWh</span>
            </div>
            <div className="text-right">
              <span className="text-lg font-bold font-mono text-white">
                ₹{overview.todayCost.toLocaleString()}
              </span>
              <span className="text-[10px] text-slate-400 block">Est. Bill Today</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Peak Demand: <strong className="text-white font-mono">{overview.peakDemandTodayKw} kW</strong></span>
            <span className="text-amber-400 font-mono flex items-center gap-1">
              <Clock className="w-3 h-3" /> at {overview.peakDemandTime}
            </span>
          </div>
        </div>

        {/* Metric 3: Month-to-Date & Budget Utilization */}
        <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-4 shadow-card-dark relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">MONTHLY BUDGET STATUS</span>
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <DollarSign className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
              {overview.budgetUtilizationPercent}%
            </span>
            <span className="text-xs text-slate-400 font-mono">
              ₹{(overview.monthCost / 1000).toFixed(0)}k / ₹{(overview.monthlyBudgetCost / 1000).toFixed(0)}k
            </span>
          </div>
          {/* Progress bar */}
          <div className="w-full bg-slate-800 h-2 rounded-full mt-2 overflow-hidden">
            <div
              className={`h-full rounded-full transition-all ${
                overview.budgetUtilizationPercent > 90 ? 'bg-rose-500' :
                overview.budgetUtilizationPercent > 75 ? 'bg-amber-400' : 'bg-cyan-500'
              }`}
              style={{ width: `${Math.min(overview.budgetUtilizationPercent, 100)}%` }}
            />
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-1">
            <span>Month Energy: <strong className="text-slate-200 font-mono">{overview.monthEnergyKwh.toLocaleString()} kWh</strong></span>
            <span className="text-emerald-400">On Track</span>
          </div>
        </div>

        {/* Metric 4: IoT Fleet Health & Green Score */}
        <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-4 shadow-card-dark relative overflow-hidden group hover:border-cyan-500/40 transition-all">
          <div className="flex items-center justify-between text-slate-400 text-xs">
            <span className="font-medium">IOT FLEET & CARBON OFFSET</span>
            <span className="p-1.5 rounded-lg bg-teal-500/10 text-teal-400 border border-teal-500/20">
              <Leaf className="w-4 h-4" />
            </span>
          </div>
          <div className="mt-3 flex items-baseline justify-between">
            <div>
              <span className="text-2xl sm:text-3xl font-extrabold font-mono text-white tracking-tight">
                {overview.onlineDevicesCount}
              </span>
              <span className="text-xs text-slate-400 ml-1">/ {overview.totalIotDevices} Online</span>
            </div>
            <div className="text-right">
              <span className="text-base font-bold font-mono text-emerald-400">
                {overview.treesEquivalentSaved} 🌲
              </span>
              <span className="text-[10px] text-slate-400 block">Trees Eqv. Today</span>
            </div>
          </div>
          <div className="mt-2 flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-800">
            <span>Avg Power Factor: <strong className="text-white font-mono">{overview.averagePowerFactor}</strong></span>
            <span className="text-slate-300">EUI: <strong className="text-cyan-400 font-mono">{overview.campusEui} kWh/m²</strong></span>
          </div>
        </div>
      </div>

      {/* Main 24-Hour Diurnal Demand Curve & Solar Offset Chart */}
      <HourlyDemandChart data={hourlyData} />

      {/* Campus Buildings Live Leaderboard & Quick Drilldown */}
      <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-5 shadow-card-dark">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-3 border-b border-slate-800 gap-2">
          <div>
            <h3 className="text-base font-semibold text-white flex items-center gap-2">
              <Building2 className="w-4 h-4 text-cyan-400" />
              Registered Campus Buildings Telemetry ({buildings.length} Active Facilities)
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Live power demand, accumulated energy, and floor area breakdown across all campus blocks.
            </p>
          </div>
          <button
            onClick={() => onNavigateToTab('3d-twin')}
            className="px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 text-xs font-medium transition-colors flex items-center gap-1.5"
          >
            Open in 3D Campus View
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3.5 mt-4">
          {buildings.map((b) => (
            <div
              key={b.id}
              onClick={() => onSelectBuilding(b.id)}
              className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 hover:border-cyan-500/50 hover:bg-slate-800/40 transition-all cursor-pointer group"
            >
              <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                <div className="flex items-center gap-2">
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-mono bg-slate-800 text-slate-300 border border-slate-700">
                    {b.code}
                  </span>
                  <span className="font-semibold text-white text-xs group-hover:text-cyan-300 transition-colors truncate max-w-[170px]">
                    {b.name}
                  </span>
                </div>
                <span className={`w-2.5 h-2.5 rounded-full ${
                  b.status === 'critical' ? 'bg-rose-500 animate-ping' :
                  b.status === 'warning' ? 'bg-amber-400' : 'bg-emerald-400'
                }`}></span>
              </div>

              <div className="grid grid-cols-2 gap-2 mt-2.5 text-[11px]">
                <div>
                  <span className="text-slate-400 block text-[10px]">CURRENT DEMAND</span>
                  <span className="font-mono font-bold text-cyan-300 text-sm">{b.currentPowerKw} kW</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">TODAY ENERGY</span>
                  <span className="font-mono font-bold text-white text-sm">{b.todayEnergyKwh} kWh</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">EST. TODAY COST</span>
                  <span className="font-mono text-slate-200">₹{b.todayCost}</span>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">OCCUPANCY</span>
                  <span className="text-slate-200">{b.currentOccupancy} / {b.occupancyCapacity}</span>
                </div>
              </div>

              <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[10px] text-slate-400">
                <span>{b.totalFloors} Floors • {b.totalRooms} Rooms</span>
                <span className="text-cyan-400 group-hover:underline">Drilldown &gt;</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
