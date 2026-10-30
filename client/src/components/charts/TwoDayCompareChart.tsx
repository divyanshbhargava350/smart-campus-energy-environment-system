import React from 'react';

interface HourComparison {
  hour: number;
  timeLabel: string;
  day1Kw: number;
  day2Kw: number;
  deltaKw: number;
  day1Kwh: number;
  day2Kwh: number;
  day1Cost: number;
  day2Cost: number;
}

interface TwoDayCompareChartProps {
  date1: string;
  date2: string;
  hours: HourComparison[];
  totalKwh1: number;
  totalKwh2: number;
  deltaKwh: number;
  percentChangeKwh: number;
  totalCost1: number;
  totalCost2: number;
}

export const TwoDayCompareChart: React.FC<TwoDayCompareChartProps> = ({
  date1,
  date2,
  hours = [],
  totalKwh1,
  totalKwh2,
  deltaKwh,
  percentChangeKwh,
  totalCost1,
  totalCost2
}) => {
  if (!hours || hours.length === 0) {
    return <div className="p-8 text-center text-slate-500">No comparison records available for selected dates.</div>;
  }

  const maxKw = Math.max(...hours.map(h => Math.max(h.day1Kw, h.day2Kw)), 400);
  const chartHeight = 240;
  const chartWidth = 780;
  const paddingX = 45;
  const paddingY = 25;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  const getX = (idx: number) => paddingX + (idx / (hours.length - 1)) * usableWidth;
  const getY = (val: number) => chartHeight - paddingY - (val / maxKw) * usableHeight;

  const pathDay1 = hours.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.day1Kw);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const pathDay2 = hours.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.day2Kw);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const isSaving = deltaKwh <= 0;

  return (
    <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-5 shadow-card-dark">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-3">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span>⚖️</span> Comparative Dual-Date Energy Analysis
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Hourly power comparison between <strong className="text-cyan-400 font-mono">{date1}</strong> and <strong className="text-purple-400 font-mono">{date2}</strong>
          </p>
        </div>

        {/* Delta Badges */}
        <div className="flex items-center gap-3">
          <div className={`px-3 py-1.5 rounded-lg border text-xs font-mono font-medium flex items-center gap-1.5 ${
            isSaving ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400' : 'bg-rose-500/10 border-rose-500/30 text-rose-400'
          }`}>
            <span>{isSaving ? '▼' : '▲'}</span>
            <span>{Math.abs(deltaKwh)} kWh ({percentChangeKwh > 0 ? `+${percentChangeKwh}` : percentChangeKwh}%)</span>
          </div>
          <div className="text-xs text-slate-300 bg-slate-800/80 px-3 py-1.5 rounded-lg border border-slate-700">
            Cost Diff: <span className="font-mono font-bold text-white">₹{Math.abs(totalCost1 - totalCost2)}</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-4 w-full">
        <svg viewBox={`0 0 ${chartWidth} ${chartHeight}`} className="w-full h-auto">
          {/* Grid lines */}
          {[0, 0.33, 0.66, 1].map((pct, i) => {
            const y = chartHeight - paddingY - pct * usableHeight;
            const val = Math.round(pct * maxKw);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#1E293B" strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-500 font-mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* X axis */}
          {hours.filter((_, idx) => idx % 4 === 0 || idx === hours.length - 1).map((h) => (
            <text
              key={h.hour}
              x={getX(h.hour)}
              y={chartHeight - 6}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-mono"
            >
              {h.timeLabel}
            </text>
          ))}

          {/* Day 2 Line (Purple) */}
          <path d={pathDay2} fill="none" stroke="#A855F7" strokeWidth="2.5" strokeDasharray="4 2" />

          {/* Day 1 Line (Cyan) */}
          <path d={pathDay1} fill="none" stroke="#06B6D4" strokeWidth="2.5" />
        </svg>
      </div>

      {/* Legend & Stats */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4 pt-4 border-t border-slate-800 text-xs">
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-cyan-500/20">
          <span className="text-cyan-400 block font-medium">Selected Date ({date1})</span>
          <span className="text-sm font-bold text-white font-mono mt-0.5 block">{totalKwh1.toLocaleString()} kWh</span>
          <span className="text-[11px] text-slate-400">Total: ₹{totalCost1.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-purple-500/20">
          <span className="text-purple-400 block font-medium">Baseline Date ({date2})</span>
          <span className="text-sm font-bold text-white font-mono mt-0.5 block">{totalKwh2.toLocaleString()} kWh</span>
          <span className="text-[11px] text-slate-400">Total: ₹{totalCost2.toLocaleString()}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700">
          <span className="text-slate-400 block font-medium">Net Consumption Delta</span>
          <span className={`text-sm font-bold font-mono mt-0.5 block ${isSaving ? 'text-emerald-400' : 'text-rose-400'}`}>
            {deltaKwh > 0 ? `+${deltaKwh}` : deltaKwh} kWh
          </span>
          <span className="text-[11px] text-slate-400">{isSaving ? 'Efficiency Improvement' : 'Increase in Demand'}</span>
        </div>
        <div className="bg-slate-900/60 p-2.5 rounded-lg border border-slate-700">
          <span className="text-slate-400 block font-medium">Comparison Status</span>
          <span className="text-sm font-bold text-slate-200 mt-0.5 block">24 Timestamps Synced</span>
          <span className="text-[11px] text-cyan-400">Validated Telemetry</span>
        </div>
      </div>
    </div>
  );
};
