import React from 'react';
import {
  Sun, Zap, Power, BatteryCharging, Building2, BookOpen, Cpu, Bell,
  ArrowRight, TrendingUp, DollarSign, Leaf, Activity, AlertTriangle
} from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts';

interface OverviewProps {
  balance: any;
  buildings: any[];
  departments: any[];
  rooms: any[];
  hourlyCurve: any[];
  alerts: any[];
  tariff: any;
  onSelectBuilding: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const MITSOverviewView: React.FC<OverviewProps> = ({
  balance = {} as any,
  buildings = [],
  departments = [],
  rooms = [],
  hourlyCurve = [],
  alerts = [],
  tariff = { ratePerKwh: 7.60 },
  onSelectBuilding,
  onNavigateToTab
}) => {
  const totalRooms = rooms.length || buildings.reduce((s, b) => s + b.totalRooms, 0);
  const activeAlerts = alerts.filter((a: any) => a.status !== 'resolved').length;
  const todayExpense = (balance.totalCampusTodayKwh || 0) * (tariff?.ratePerKwh || 7.60);
  const co2Saved = ((balance.solarUsedTodayKwh || 0) * 0.82).toFixed(0); // kg CO2 per kWh
  const gridCost = ((balance.gridElectricityTodayKwh || 0) * (tariff?.ratePerKwh || 7.60));

  return (
    <div className="space-y-5 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-tight">
              MITS Gwalior — Energy Dashboard
            </h1>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Real-Time Solar Generation, Grid Import & Campus Energy Monitoring
          </p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <span className="badge-simulated">SIMULATED DATA</span>
          <button
            onClick={() => onNavigateToTab('maps')}
            className="px-3 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold shadow-sm transition-colors"
          >
            Campus Map →
          </button>
        </div>
      </div>

      {/* Quick Stats Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-6 gap-3">
        {[
          { label: 'Buildings', value: buildings.length, icon: <Building2 className="w-4 h-4" />, color: 'text-cyan-500' },
          { label: 'Data Sources', value: 16, icon: <Activity className="w-4 h-4" />, color: 'text-indigo-400' },
          { label: 'Rooms', value: totalRooms, icon: <Building2 className="w-4 h-4" />, color: 'text-emerald-400' },
          { label: 'IoT Devices', value: buildings.length * 3, icon: <Cpu className="w-4 h-4" />, color: 'text-amber-400' },
          { label: 'Alerts', value: activeAlerts, icon: <Bell className="w-4 h-4" />, color: activeAlerts > 0 ? 'text-rose-400' : 'text-slate-400' },
          { label: 'CO₂ Saved', value: `${co2Saved} kg`, icon: <Leaf className="w-4 h-4" />, color: 'text-emerald-400' },
        ].map((stat, i) => (
          <div key={i} className={`bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg p-3 animate-fadeIn stagger-${i + 1}`}>
            <div className={`flex items-center gap-1.5 text-[10px] font-semibold ${stat.color} mb-1`}>
              {stat.icon}
              {stat.label}
            </div>
            <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{stat.value}</span>
          </div>
        ))}
      </div>

      {/* 4 Core Energy Balance Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Solar Generated */}
        <div className="bg-[var(--bg-secondary)] border-2 border-amber-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-amber-500 flex items-center gap-1.5">
              <Sun className="w-4 h-4" /> Solar Generated
            </span>
            <span className="px-1.5 py-0.5 rounded bg-amber-500/10 text-amber-500 font-mono text-[9px] font-bold">
              350 kWp
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-[var(--text-primary)]">
              {balance.solarGeneratedKw || 0}
            </span>
            <span className="text-sm font-bold text-amber-500 ml-1">kW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Today</span>
            <span className="font-mono font-bold text-amber-500">{(balance.solarGeneratedTodayKwh || 0).toLocaleString()} kWh</span>
          </div>
        </div>

        {/* Solar Used on Campus */}
        <div className="bg-[var(--bg-secondary)] border-2 border-emerald-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-emerald-500 flex items-center gap-1.5">
              <BatteryCharging className="w-4 h-4" /> Solar Used
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[9px] font-bold">
              SELF-USE
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-[var(--text-primary)]">
              {balance.solarUsedCampusKw || 0}
            </span>
            <span className="text-sm font-bold text-emerald-500 ml-1">kW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Today</span>
            <span className="font-mono font-bold text-emerald-500">{(balance.solarUsedTodayKwh || 0).toLocaleString()} kWh</span>
          </div>
        </div>

        {/* Grid Electricity Used */}
        <div className="bg-[var(--bg-secondary)] border-2 border-cyan-500/30 rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-cyan-500 flex items-center gap-1.5">
              <Zap className="w-4 h-4" /> Grid Import
            </span>
            <span className="px-1.5 py-0.5 rounded bg-cyan-500/10 text-cyan-500 font-mono text-[9px] font-bold">
              MPPKVVCL
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-[var(--text-primary)]">
              {balance.gridElectricityUsedKw || 0}
            </span>
            <span className="text-sm font-bold text-cyan-500 ml-1">kW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Today</span>
            <span className="font-mono font-bold text-cyan-500">{(balance.gridElectricityTodayKwh || 0).toLocaleString()} kWh</span>
          </div>
        </div>

        {/* Total Campus Demand */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 card-hover">
          <div className="flex items-center justify-between text-xs">
            <span className="font-bold text-[var(--text-secondary)] flex items-center gap-1.5">
              <Power className="w-4 h-4" /> Total Demand
            </span>
            <span className="px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-500 font-mono text-[9px] font-bold">
              {balance.solarOffsetPercentage || 0}% GREEN
            </span>
          </div>
          <div className="mt-2">
            <span className="text-2xl font-extrabold font-mono text-[var(--text-primary)]">
              {balance.totalCampusDemandKw || 0}
            </span>
            <span className="text-sm font-bold text-[var(--text-secondary)] ml-1">kW</span>
          </div>
          <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between text-[11px]">
            <span className="text-[var(--text-muted)]">Est. Cost Today</span>
            <span className="font-mono font-bold text-[var(--text-primary)]">₹{gridCost.toLocaleString(undefined, {maximumFractionDigits: 0})}</span>
          </div>
        </div>
      </div>

      {/* Power Flow Diagram */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-1">Campus Power Flow</h3>
        <p className="text-[11px] text-[var(--text-muted)] mb-3">Solar + Grid → Campus Buildings</p>
        <div className="flex flex-col md:flex-row items-center justify-between gap-3 text-xs font-semibold">
          {/* Solar Source */}
          <div className="flex-1 text-center p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 w-full">
            <Sun className="w-5 h-5 text-amber-500 mx-auto mb-1" />
            <span className="text-amber-500 block text-[10px]">SOLAR PLANT</span>
            <span className="text-xl font-mono text-[var(--text-primary)] font-extrabold block">{balance.solarGeneratedKw || 0} kW</span>
          </div>
          
          <div className="text-center shrink-0">
            <ArrowRight className="w-5 h-5 text-emerald-400 mx-auto hidden md:block" />
            <span className="text-emerald-500 text-[10px] font-mono">+{balance.solarUsedCampusKw || 0} kW</span>
          </div>

          {/* Campus Load */}
          <div className="flex-1 text-center p-4 rounded-xl bg-[var(--bg-tertiary)] border-2 border-cyan-500/30 w-full shadow-sm">
            <span className="text-cyan-500 block text-xs font-bold">🏫 MITS Campus</span>
            <span className="text-2xl font-mono text-[var(--text-primary)] font-extrabold block my-1">{balance.totalCampusDemandKw || 0} kW</span>
            <span className="text-[10px] text-[var(--text-muted)]">{(balance.totalCampusTodayKwh || 0).toLocaleString()} kWh today</span>
          </div>

          <div className="text-center shrink-0">
            <ArrowRight className="w-5 h-5 text-cyan-400 mx-auto rotate-180 hidden md:block" />
            <span className="text-cyan-500 text-[10px] font-mono">+{balance.gridElectricityUsedKw || 0} kW</span>
          </div>

          {/* Grid Source */}
          <div className="flex-1 text-center p-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20 w-full">
            <Zap className="w-5 h-5 text-cyan-500 mx-auto mb-1" />
            <span className="text-cyan-500 block text-[10px]">GRID (MPPKVVCL)</span>
            <span className="text-xl font-mono text-[var(--text-primary)] font-extrabold block">{balance.gridElectricityUsedKw || 0} kW</span>
          </div>
        </div>
      </div>

      {/* 24-Hour Chart */}
      {hourlyCurve.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">24-Hour Energy Profile</h3>
              <p className="text-[11px] text-[var(--text-muted)]">Solar generation vs campus demand</p>
            </div>
            <span className="badge-simulated">SIMULATED</span>
          </div>
          <ResponsiveContainer width="100%" height={280}>
            <AreaChart data={hourlyCurve} margin={{ top: 5, right: 5, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="solarGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#F59E0B" stopOpacity={0.3} />
                  <stop offset="100%" stopColor="#F59E0B" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="loadGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.2} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gridGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#6366F1" stopOpacity={0.15} />
                  <stop offset="100%" stopColor="#6366F1" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="timeLabel" tick={{ fontSize: 10, fill: 'var(--text-muted)' }} interval={2} />
              <YAxis tick={{ fontSize: 10, fill: 'var(--text-muted)' }} unit=" kW" width={55} />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--bg-secondary)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  fontSize: '11px',
                  color: 'var(--text-primary)'
                }}
              />
              <Legend wrapperStyle={{ fontSize: '11px' }} />
              <Area type="monotone" dataKey="solarGenKw" name="Solar Output" stroke="#F59E0B" fill="url(#solarGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="campusLoadKw" name="Campus Load" stroke="#06B6D4" fill="url(#loadGrad)" strokeWidth={2} />
              <Area type="monotone" dataKey="gridUsedKw" name="Grid Import" stroke="#6366F1" fill="url(#gridGrad)" strokeWidth={2} />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Buildings Grid */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Campus Buildings</h3>
            <p className="text-[11px] text-[var(--text-muted)]">Click any building to view rooms & equipment</p>
          </div>
          <span className="text-xs text-[var(--text-muted)] font-mono">{buildings.length} Buildings</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {buildings.map((b: any) => (
            <div
              key={b.id}
              onClick={() => onSelectBuilding(b.id)}
              className="p-3 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] card-hover cursor-pointer"
            >
              <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
                <span className="font-bold text-[var(--text-primary)] text-xs truncate pr-2">{b.name}</span>
                <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                  b.status === 'high_usage' ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30' :
                  b.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30' :
                  'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                }`}>
                  {b.code}
                </span>
              </div>
              <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
                <div>
                  <span className="text-[var(--text-muted)] text-[10px] block">LOAD</span>
                  <span className="font-mono font-bold text-cyan-500">{b.currentPowerKw} kW</span>
                </div>
                <div>
                  <span className="text-[var(--text-muted)] text-[10px] block">TODAY</span>
                  <span className="font-mono font-bold text-[var(--text-primary)]">{b.todayEnergyKwh} kWh</span>
                </div>
              </div>
              <div className="mt-2 pt-2 border-t border-[var(--border-color)] flex justify-between text-[10px] text-[var(--text-muted)]">
                <span>{b.totalFloors} Floors • {b.totalRooms} Rooms</span>
                <span className="text-cyan-500 font-medium">Details →</span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
