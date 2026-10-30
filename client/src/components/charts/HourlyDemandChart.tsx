import React, { useState } from 'react';

interface HourlyDataPoint {
  hour: number;
  timeLabel: string;
  powerDemandKw: number;
  solarGenerationKw?: number;
  netGridDemandKw?: number;
  energyKwh: number;
  cost: number;
  tariffRate: number;
  isPeakHour?: boolean;
  isSpikePeriod?: boolean;
}

interface HourlyDemandChartProps {
  data: HourlyDataPoint[];
  title?: string;
  subtitle?: string;
  currencySymbol?: string;
  showSolar?: boolean;
}

export const HourlyDemandChart: React.FC<HourlyDemandChartProps> = ({
  data = [],
  title = "24-Hour Active Power Demand (kW) & Solar Offset Profile",
  subtitle = "Instantaneous demand curve with 4 PM peak spike callout & time-of-day tariff band",
  currencySymbol = "₹",
  showSolar = true
}) => {
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return <div className="p-8 text-center text-slate-500">No telemetry data recorded for this time interval.</div>;
  }

  const maxVal = Math.max(...data.map(d => Math.max(d.powerDemandKw, d.solarGenerationKw || 0)), 500);
  const chartHeight = 260;
  const chartWidth = 800;
  const paddingX = 50;
  const paddingY = 30;
  const usableWidth = chartWidth - paddingX * 2;
  const usableHeight = chartHeight - paddingY * 2;

  // Coordinate mapping
  const getX = (index: number) => paddingX + (index / (data.length - 1)) * usableWidth;
  const getY = (val: number) => chartHeight - paddingY - (val / maxVal) * usableHeight;

  // Generate SVG path for Demand
  const demandPath = data.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.powerDemandKw);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const demandAreaPath = `${demandPath} L ${getX(data.length - 1)} ${chartHeight - paddingY} L ${getX(0)} ${chartHeight - paddingY} Z`;

  // Generate SVG path for Solar
  const solarPath = data.reduce((acc, curr, idx) => {
    const x = getX(idx);
    const y = getY(curr.solarGenerationKw || 0);
    return idx === 0 ? `M ${x} ${y}` : `${acc} L ${x} ${y}`;
  }, '');

  const solarAreaPath = `${solarPath} L ${getX(data.length - 1)} ${chartHeight - paddingY} L ${getX(0)} ${chartHeight - paddingY} Z`;

  const hoveredPoint = hoveredIndex !== null ? data[hoveredIndex] : null;

  return (
    <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-5 shadow-card-dark relative">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-800 gap-2">
        <div>
          <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse"></span>
            {title}
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
        </div>
        <div className="flex items-center gap-4 text-xs">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded bg-cyan-500"></span>
            <span className="text-slate-300">Campus Demand (kW)</span>
          </div>
          {showSolar && (
            <div className="flex items-center gap-1.5">
              <span className="w-3 h-3 rounded bg-amber-400"></span>
              <span className="text-slate-300">Solar Yield (kW)</span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-3 rounded border border-rose-500 bg-rose-500/20"></span>
            <span className="text-slate-400">Peak Window (17-22h)</span>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div className="relative mt-4 w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full h-auto cursor-crosshair select-none"
          onMouseLeave={() => setHoveredIndex(null)}
        >
          <defs>
            <linearGradient id="cyanGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#06B6D4" stopOpacity="0.45" />
              <stop offset="100%" stopColor="#06B6D4" stopOpacity="0.0" />
            </linearGradient>
            <linearGradient id="amberGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.4" />
              <stop offset="100%" stopColor="#F59E0B" stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Peak Tariff Window Tint (Hours 17 to 22) */}
          <rect
            x={getX(17)}
            y={paddingY}
            width={getX(22) - getX(17)}
            height={usableHeight}
            fill="#EF4444"
            fillOpacity="0.06"
          />

          {/* Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => {
            const y = chartHeight - paddingY - pct * usableHeight;
            const val = Math.round(pct * maxVal);
            return (
              <g key={i}>
                <line x1={paddingX} y1={y} x2={chartWidth - paddingX} y2={y} stroke="#1E293B" strokeDasharray="3 3" />
                <text x={paddingX - 8} y={y + 4} textAnchor="end" className="text-[10px] fill-slate-500 font-mono">
                  {val}
                </text>
              </g>
            );
          })}

          {/* X-axis labels */}
          {data.filter((_, idx) => idx % 3 === 0 || idx === data.length - 1).map((d) => (
            <text
              key={d.hour}
              x={getX(d.hour)}
              y={chartHeight - 10}
              textAnchor="middle"
              className="text-[10px] fill-slate-400 font-mono"
            >
              {d.timeLabel}
            </text>
          ))}

          {/* Solar Area & Line */}
          {showSolar && (
            <>
              <path d={solarAreaPath} fill="url(#amberGradient)" />
              <path d={solarPath} fill="none" stroke="#F59E0B" strokeWidth="2" strokeDasharray="4 2" />
            </>
          )}

          {/* Demand Area & Line */}
          <path d={demandAreaPath} fill="url(#cyanGradient)" />
          <path d={demandPath} fill="none" stroke="#06B6D4" strokeWidth="2.5" />

          {/* Peak Spike Marker at 16h (4 PM Spike) */}
          {data[16] && (
            <g transform={`translate(${getX(16)}, ${getY(data[16].powerDemandKw)})`}>
              <circle r="7" fill="#EF4444" fillOpacity="0.3" className="animate-ping" />
              <circle r="4.5" fill="#EF4444" stroke="#ffffff" strokeWidth="1.5" />
              <rect x="-42" y="-30" width="84" height="20" rx="4" fill="#1F2937" stroke="#EF4444" strokeWidth="1" />
              <text x="0" y="-16" textAnchor="middle" className="text-[9px] fill-red-400 font-bold">
                ⚡ 4 PM SPIKE
              </text>
            </g>
          )}

          {/* Interactive hover line & dots */}
          {data.map((d, idx) => (
            <rect
              key={idx}
              x={getX(idx) - usableWidth / data.length / 2}
              y={paddingY}
              width={usableWidth / data.length}
              height={usableHeight}
              fill="transparent"
              onMouseEnter={() => setHoveredIndex(idx)}
            />
          ))}

          {hoveredPoint && (
            <g>
              <line
                x1={getX(hoveredPoint.hour)}
                y1={paddingY}
                x2={getX(hoveredPoint.hour)}
                y2={chartHeight - paddingY}
                stroke="#38BDF8"
                strokeWidth="1.5"
                strokeDasharray="2 2"
              />
              <circle
                cx={getX(hoveredPoint.hour)}
                cy={getY(hoveredPoint.powerDemandKw)}
                r="5"
                fill="#06B6D4"
                stroke="#FFFFFF"
                strokeWidth="2"
              />
              {showSolar && hoveredPoint.solarGenerationKw !== undefined && (
                <circle
                  cx={getX(hoveredPoint.hour)}
                  cy={getY(hoveredPoint.solarGenerationKw)}
                  r="4"
                  fill="#F59E0B"
                  stroke="#FFFFFF"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating tooltip */}
        {hoveredPoint && (
          <div
            className="absolute top-4 left-1/2 -translate-x-1/2 bg-slate-900/95 border border-cyan-500/40 backdrop-blur-md px-4 py-2.5 rounded-lg shadow-xl text-xs z-10 flex items-center gap-4 transition-all"
          >
            <div>
              <span className="text-slate-400 block text-[10px]">TIME WINDOW</span>
              <span className="font-mono font-bold text-white text-sm">{hoveredPoint.timeLabel}</span>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-cyan-400 block text-[10px]">POWER DEMAND</span>
              <span className="font-mono font-bold text-cyan-300">{hoveredPoint.powerDemandKw} kW</span>
            </div>
            {showSolar && (
              <div className="border-l border-slate-700 pl-3">
                <span className="text-amber-400 block text-[10px]">SOLAR OFFSET</span>
                <span className="font-mono font-bold text-amber-300">{hoveredPoint.solarGenerationKw || 0} kW</span>
              </div>
            )}
            <div className="border-l border-slate-700 pl-3">
              <span className="text-emerald-400 block text-[10px]">ACCUMULATED</span>
              <span className="font-mono font-bold text-emerald-300">{hoveredPoint.energyKwh} kWh</span>
            </div>
            <div className="border-l border-slate-700 pl-3">
              <span className="text-rose-400 block text-[10px]">EST. HOURLY COST</span>
              <span className="font-mono font-bold text-rose-300">{currencySymbol}{hoveredPoint.cost}</span>
            </div>
          </div>
        )}
      </div>

      <div className="mt-3 flex flex-wrap items-center justify-between text-[11px] text-slate-400 px-2 pt-2 border-t border-slate-800/80">
        <span className="flex items-center gap-1.5">
          <span className="text-amber-400">💡 Notice:</span> Demand spikes daily at 16:00 (4:00 PM) as solar output drops while campus laboratories and chillers operate at peak loads.
        </span>
        <span className="font-mono text-slate-400">Tariff Band: Normal ₹7.80 | Peak ₹11.50</span>
      </div>
    </div>
  );
};
