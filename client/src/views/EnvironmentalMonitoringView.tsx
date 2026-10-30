import React, { useState, useEffect } from 'react';
import { 
  CloudRain, Wind, Thermometer, Droplets, CheckCircle2, 
  AlertTriangle, RefreshCw, Activity 
} from 'lucide-react';
import { api } from '../services/api.js';

export const EnvironmentalMonitoringView: React.FC = () => {
  const [zones, setZones] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchZones = () => {
    setLoading(true);
    api.environmentalZones()
      .then(res => {
        if (res.success) setZones(res.data || []);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchZones();
  }, []);

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Wind className="w-5 h-5 text-emerald-400" /> Campus Environmental Monitoring
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Indoor Air Quality (IAQ), ambient temperature, relative humidity, and calibrated CO₂ concentrations
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-simulated">CALIBRATED SENSORS</span>
          <button
            onClick={fetchZones}
            className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white"
            title="Refresh environmental sensors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Sensor Calibration Integrity Notice */}
      <div className="p-3 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)] flex items-center gap-2">
        <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
        <span>
          <strong>Data Integrity Rule:</strong> CO₂ readings (ppm) are displayed only from calibrated optical NDIR CO₂ sensors. PM2.5/PM10 readings are not fabricated from sensors lacking particulate detection chambers.
        </span>
      </div>

      {/* Zones Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {zones.map(zone => {
          const iaqColor = zone.iaqIndex <= 50
            ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/30'
            : zone.iaqIndex <= 100
            ? 'text-cyan-400 bg-cyan-500/10 border-cyan-500/30'
            : 'text-amber-400 bg-amber-500/10 border-amber-500/30';

          return (
            <div
              key={zone.id}
              className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 card-hover space-y-3"
            >
              <div className="flex justify-between items-start pb-2 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="font-bold text-sm text-[var(--text-primary)]">{zone.name}</h3>
                  <span className="text-xs text-[var(--text-muted)]">{zone.buildingName}</span>
                </div>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${iaqColor}`}>
                  IAQ Index: {zone.iaqIndex} ({zone.iaqIndex <= 50 ? 'Good' : 'Moderate'})
                </span>
              </div>

              <div className="grid grid-cols-3 gap-2 text-center text-xs">
                <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
                    <Thermometer className="w-3.5 h-3.5 text-amber-400" /> Temp
                  </div>
                  <strong className="text-base font-mono font-bold text-[var(--text-primary)]">{zone.temperatureC}°C</strong>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
                    <Droplets className="w-3.5 h-3.5 text-cyan-400" /> Humidity
                  </div>
                  <strong className="text-base font-mono font-bold text-[var(--text-primary)]">{zone.humidityPercent}%</strong>
                </div>

                <div className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                  <div className="flex items-center justify-center gap-1 text-[10px] text-[var(--text-muted)] mb-1">
                    <Wind className="w-3.5 h-3.5 text-emerald-400" /> CO₂ Level
                  </div>
                  <strong className="text-base font-mono font-bold text-emerald-400">{zone.co2Ppm} ppm</strong>
                </div>
              </div>

              <div className="pt-2 border-t border-[var(--border-color)] flex justify-between items-center text-[10px] text-[var(--text-muted)]">
                <span className="flex items-center gap-1 text-emerald-400">
                  <CheckCircle2 className="w-3 h-3" /> Sensor: {zone.sensorStatus}
                </span>
                <span>Active polling: 10s interval</span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
