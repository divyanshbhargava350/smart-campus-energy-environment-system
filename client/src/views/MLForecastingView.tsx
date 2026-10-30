import React, { useState, useEffect } from 'react';
import { 
  TrendingUp, Cpu, Activity, AlertCircle, CheckCircle2, 
  Calendar, ArrowUpRight, ShieldCheck, RefreshCw 
} from 'lucide-react';
import { 
  AreaChart, Area, BarChart, Bar, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend 
} from 'recharts';
import { api } from '../services/api.js';

export const MLForecastingView: React.FC = () => {
  const [forecastData, setForecastData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'hourly' | 'weekly' | 'validation'>('hourly');

  const fetchForecast = () => {
    setLoading(true);
    api.mlForecast()
      .then(res => {
        if (res.success) setForecastData(res.data);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchForecast();
  }, []);

  if (loading || !forecastData) {
    return <div className="p-8 text-center text-sm text-[var(--text-muted)]">Loading XGBoost model inference...</div>;
  }

  const { metrics, next24HourForecast, sevenDayForecast, testComparison, modelName, trainingDataset } = forecastData;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Model A: XGBoost Energy Demand Forecaster
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Chronologically validated gradient boosted regression trained on {trainingDataset}
          </p>
        </div>

        <div className="flex items-center gap-2 self-start sm:self-auto">
          <span className="badge-simulated">MODEL INFERENCE</span>
          <button
            onClick={fetchForecast}
            className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
            title="Refresh forecast"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Model Performance Metrics Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 card-hover">
          <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Mean Absolute Error (MAE)</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-cyan-400">{metrics?.maeKwh}</span>
            <span className="text-xs text-[var(--text-muted)]">kWh</span>
          </div>
          <span className="text-[10px] text-emerald-400 block mt-1">Evaluated on test split</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 card-hover">
          <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Root Mean Squared Error</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-indigo-400">{metrics?.rmseKwh}</span>
            <span className="text-xs text-[var(--text-muted)]">kWh</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">Penalizes large deviations</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 card-hover">
          <span className="text-[10px] text-[var(--text-muted)] block font-semibold">MAPE Error Rate</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-amber-400">{metrics?.mapePercent}%</span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] block mt-1">Percentage accuracy</span>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3.5 card-hover">
          <span className="text-[10px] text-[var(--text-muted)] block font-semibold">Coefficient of Determination</span>
          <div className="flex items-baseline gap-1 mt-1">
            <span className="text-2xl font-mono font-bold text-emerald-400">R² {metrics?.r2Score}</span>
          </div>
          <span className="text-[10px] text-emerald-400 block mt-1">Fit score</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-1 gap-1">
        <button
          onClick={() => setActiveTab('hourly')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'hourly'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          Next 24-Hour Diurnal Forecast
        </button>
        <button
          onClick={() => setActiveTab('weekly')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'weekly'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          7-Day Campus Energy Forecast
        </button>
        <button
          onClick={() => setActiveTab('validation')}
          className={`flex-1 py-2 rounded-lg text-xs font-semibold transition-all ${
            activeTab === 'validation'
              ? 'bg-cyan-600 text-white shadow-sm'
              : 'text-[var(--text-secondary)] hover:text-white'
          }`}
        >
          Actual vs Predicted Test Validation
        </button>
      </div>

      {/* Tab 1: 24-Hour Diurnal Demand Forecast */}
      {activeTab === 'hourly' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex flex-col sm:flex-row justify-between sm:items-center pb-2 border-b border-[var(--border-color)] gap-1">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Next-Day 24-Hour Load Demand Curve with 95% Confidence Band
              </h3>
              <p className="text-xs text-[var(--text-muted)]">
                Shaded band indicates prediction intervals (±1.96 × residual standard deviation)
              </p>
            </div>
            <div className="flex items-center gap-2 text-xs">
              <span className="flex items-center gap-1 text-cyan-400 font-mono text-[11px]">
                <span className="w-2.5 h-2.5 rounded-full bg-cyan-400" /> Forecast Demand (kW)
              </span>
              <span className="flex items-center gap-1 text-amber-400 font-mono text-[11px]">
                <span className="w-2 h-2 rounded bg-amber-400" /> Peak Hours (10:00 - 16:00)
              </span>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <AreaChart data={next24HourForecast} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="bandGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#06B6D4" stopOpacity={0.25} />
                  <stop offset="100%" stopColor="#06B6D4" stopOpacity={0.02} />
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
              <Area type="monotone" dataKey="upperBoundKw" name="Upper 95% Bound" stroke="#38BDF8" fill="url(#bandGrad)" strokeDasharray="3 3" />
              <Area type="monotone" dataKey="forecastDemandKw" name="Forecast Demand (kW)" stroke="#06B6D4" fill="none" strokeWidth={2.5} />
              <Area type="monotone" dataKey="lowerBoundKw" name="Lower 95% Bound" stroke="#38BDF8" fill="none" strokeDasharray="3 3" />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* Tab 2: 7-Day Campus Energy Forecast */}
      {activeTab === 'weekly' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm space-y-3">
          <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                7-Day Projected Energy Demand (kWh / Day)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Building multi-variate breakdown across the upcoming week</p>
            </div>
          </div>

          <ResponsiveContainer width="100%" height={320}>
            <BarChart data={sevenDayForecast} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border-color)" />
              <XAxis dataKey="dayName" tick={{ fontSize: 11, fill: 'var(--text-muted)' }} />
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
              <Bar dataKey="totalForecastKwh" name="Total Campus Forecast (kWh)" fill="#06B6D4" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          {/* Table summary */}
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2 pt-2">
            {sevenDayForecast.map((day: any) => (
              <div key={day.date} className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-center">
                <span className="text-[10px] text-cyan-400 font-bold block">{day.dayName} ({day.date.slice(5)})</span>
                <span className="text-sm font-mono font-bold text-[var(--text-primary)] block mt-0.5">{day.totalForecastKwh} kWh</span>
                <span className="text-[10px] text-[var(--text-muted)] block">Peak: {day.peakDemandKw} kW</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Tab 3: Actual vs Predicted Test Validation */}
      {activeTab === 'validation' && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden shadow-sm">
          <div className="px-4 py-3 border-b border-[var(--border-color)] flex justify-between items-center">
            <div>
              <h3 className="text-sm font-bold text-[var(--text-primary)]">
                Holdout Test Set Validation (Actual vs XGBoost Prediction)
              </h3>
              <p className="text-xs text-[var(--text-muted)]">Verified chronologically on unseen test samples</p>
            </div>
            <span className="text-[10px] font-mono text-emerald-400 font-semibold">20% Holdout Split</span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2 font-semibold">Observation Date</th>
                  <th className="text-left px-4 py-2 font-semibold">Building</th>
                  <th className="text-right px-4 py-2 font-semibold">Actual Metered (kWh)</th>
                  <th className="text-right px-4 py-2 font-semibold">XGBoost Predicted</th>
                  <th className="text-right px-4 py-2 font-semibold">Abs Error</th>
                  <th className="text-right px-4 py-2 font-semibold">95% Prediction Range</th>
                </tr>
              </thead>
              <tbody>
                {testComparison.slice(-15).map((row: any, i: number) => {
                  const error = Math.abs(row.actualKwh - row.predictedKwh).toFixed(1);
                  return (
                    <tr key={i} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                      <td className="px-4 py-2 font-mono text-[var(--text-secondary)]">{row.date}</td>
                      <td className="px-4 py-2 font-medium text-[var(--text-primary)]">{row.building}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-[var(--text-primary)]">{row.actualKwh}</td>
                      <td className="px-4 py-2 text-right font-mono font-bold text-cyan-400">{row.predictedKwh}</td>
                      <td className="px-4 py-2 text-right font-mono text-amber-400">±{error} kWh</td>
                      <td className="px-4 py-2 text-right font-mono text-[10px] text-[var(--text-muted)]">
                        [{row.lowerBound} – {row.upperBound}]
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
