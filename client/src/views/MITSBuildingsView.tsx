import React, { useState } from 'react';
import { Building2, ChevronRight, Zap, Activity, AlertTriangle, ArrowLeft } from 'lucide-react';

interface BuildingsViewProps {
  buildings: any[];
  rooms: any[];
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string | null) => void;
  onNavigateToRoomControl?: (roomId: string, buildingId: string) => void;
}

export const MITSBuildingsView: React.FC<BuildingsViewProps> = ({
  buildings = [], rooms = [], selectedBuildingId, onSelectBuilding, onNavigateToRoomControl
}) => {
  const selectedBuilding = buildings.find((b: any) => b.id === selectedBuildingId);
  const buildingRooms = selectedBuilding ? rooms.filter((r: any) => r.buildingId === selectedBuilding.id) : [];

  if (selectedBuilding) {
    return (
      <div className="space-y-4 animate-fadeIn">
        <button onClick={() => onSelectBuilding(null)} className="flex items-center gap-1.5 text-xs text-cyan-500 hover:text-cyan-400 font-semibold">
          <ArrowLeft className="w-4 h-4" /> Back to All Buildings
        </button>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">{selectedBuilding.name}</h2>
              <p className="text-xs text-[var(--text-muted)] mt-0.5">{selectedBuilding.categoryLabel} • {selectedBuilding.totalFloors} Floors • {selectedBuilding.totalRooms} Rooms</p>
            </div>
            <span className={`px-2 py-1 rounded text-[10px] font-bold ${
              selectedBuilding.status === 'high_usage' ? 'bg-rose-500/10 text-rose-400' :
              selectedBuilding.status === 'warning' ? 'bg-amber-500/10 text-amber-400' : 'bg-emerald-500/10 text-emerald-400'
            }`}>{selectedBuilding.status.toUpperCase()}</span>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
              <span className="text-[10px] text-[var(--text-muted)]">Current Load</span>
              <span className="text-lg font-bold font-mono text-cyan-500 block">{selectedBuilding.currentPowerKw} kW</span>
            </div>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
              <span className="text-[10px] text-[var(--text-muted)]">Today Energy</span>
              <span className="text-lg font-bold font-mono text-[var(--text-primary)] block">{selectedBuilding.todayEnergyKwh} kWh</span>
            </div>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
              <span className="text-[10px] text-[var(--text-muted)]">Monthly</span>
              <span className="text-lg font-bold font-mono text-[var(--text-primary)] block">{selectedBuilding.monthEnergyKwh.toLocaleString()} kWh</span>
            </div>
            <div className="bg-[var(--bg-tertiary)] rounded-lg p-3">
              <span className="text-[10px] text-[var(--text-muted)]">Today Cost</span>
              <span className="text-lg font-bold font-mono text-amber-500 block">₹{selectedBuilding.todayCost.toLocaleString()}</span>
            </div>
          </div>
        </div>

        {/* Rooms Table */}
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">Rooms ({buildingRooms.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2 font-semibold">Room</th>
                  <th className="text-left px-4 py-2 font-semibold">Name</th>
                  <th className="text-left px-4 py-2 font-semibold">Dept</th>
                  <th className="text-right px-4 py-2 font-semibold">Power (kW)</th>
                  <th className="text-right px-4 py-2 font-semibold">Today (kWh)</th>
                  <th className="text-center px-4 py-2 font-semibold">Status</th>
                  <th className="text-left px-4 py-2 font-semibold">Equipment</th>
                  <th className="text-right px-4 py-2 font-semibold">Action</th>
                </tr>
              </thead>
              <tbody>
                {buildingRooms.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)] transition-colors">
                    <td className="px-4 py-2.5 font-mono font-bold text-cyan-500">{r.roomNumber}</td>
                    <td className="px-4 py-2.5 text-[var(--text-primary)] font-medium">{r.name}</td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)]">{r.departmentName || '—'}</td>
                    <td className="px-4 py-2.5 text-right font-mono font-bold text-[var(--text-primary)]">{r.currentPowerKw}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-[var(--text-secondary)]">{r.todayKwh}</td>
                    <td className="px-4 py-2.5 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.status === 'high_usage' ? 'bg-rose-500/10 text-rose-400' :
                        r.status === 'off' ? 'bg-slate-500/10 text-slate-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{r.status === 'high_usage' ? 'HIGH' : r.status === 'off' ? 'OFF' : 'OK'}</span>
                    </td>
                    <td className="px-4 py-2.5 text-[var(--text-muted)] text-[10px] max-w-[200px] truncate">{r.equipmentInfo}</td>
                    <td className="px-4 py-2.5 text-right">
                      <button
                        onClick={() => onNavigateToRoomControl?.(r.id, selectedBuilding.id)}
                        className="px-2.5 py-1 rounded bg-cyan-600/20 hover:bg-cyan-600 hover:text-white text-cyan-400 text-[10px] font-bold transition-all"
                      >
                        Control →
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Building2 className="w-5 h-5 text-cyan-500" /> Campus Buildings
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">Select a building to view room-level monitoring</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {buildings.map((b: any) => (
          <div key={b.id} onClick={() => onSelectBuilding(b.id)}
            className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 card-hover cursor-pointer">
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <span className="font-bold text-[var(--text-primary)] text-sm">{b.name}</span>
              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                b.status === 'warning' ? 'bg-amber-500/10 text-amber-400 border border-amber-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
              }`}>{b.code}</span>
            </div>
            <p className="text-[10px] text-[var(--text-muted)] mt-2">{b.categoryLabel}</p>
            <div className="grid grid-cols-2 gap-3 mt-3">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">CURRENT</span>
                <span className="font-mono font-bold text-cyan-500 text-sm">{b.currentPowerKw} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">TODAY</span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{b.todayEnergyKwh} kWh</span>
              </div>
            </div>
            <div className="mt-3 pt-2 border-t border-[var(--border-color)] flex justify-between text-[10px] text-[var(--text-muted)]">
              <span>{b.totalFloors} Floors • {b.totalRooms} Rooms</span>
              <span className="text-cyan-500 font-semibold flex items-center gap-0.5">View <ChevronRight className="w-3 h-3" /></span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
