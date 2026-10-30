import React, { useState } from 'react';
import { Box, Map, Eye, Layers, Compass, Sliders, ChevronRight } from 'lucide-react';
import { MITSCampus3DViewer } from '../components/campus3d/MITSCampus3DViewer.js';
import { MITSCampusMapsView } from './MITSCampusMapsView.js';

interface DigitalTwin3DViewProps {
  buildings: any[];
  rooms: any[];
  alerts?: any[];
  onRefreshAlerts?: () => void;
  selectedBuildingId: string | null;
  onSelectBuilding: (id: string | null) => void;
  onNavigateToTab: (tab: any) => void;
  onNavigateToRoomControl?: (roomId: string, buildingId: string) => void;
}

export const DigitalTwin3DView: React.FC<DigitalTwin3DViewProps> = ({
  buildings,
  rooms,
  alerts = [],
  onRefreshAlerts,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateToTab,
  onNavigateToRoomControl
}) => {
  const [viewMode, setViewMode] = useState<'3d' | '2d'>('3d');

  const selectedBuilding = buildings.find(b => b.id === selectedBuildingId);
  const buildingRooms = selectedBuilding ? rooms.filter(r => r.buildingId === selectedBuilding.id) : [];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* View Header with 3D / 2D Toggle */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-cyan-400 animate-pulse" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Interactive 3D Campus View
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Spatial 3D campus infrastructure & blueprint overlay for Madhav Institute of Technology & Science
          </p>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex bg-[var(--bg-tertiary)] border border-[var(--border-color)] p-1 rounded-xl">
            <button
              onClick={() => setViewMode('3d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '3d'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Box className="w-3.5 h-3.5" /> 3D Campus View
            </button>
            <button
              onClick={() => setViewMode('2d')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                viewMode === '2d'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-[var(--text-secondary)] hover:text-white'
              }`}
            >
              <Map className="w-3.5 h-3.5" /> 2D Blueprint Maps
            </button>
          </div>
        </div>
      </div>

      {/* Breadcrumb Hierarchy Navigation */}
      <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-[var(--bg-secondary)] border border-[var(--border-color)] text-xs text-[var(--text-secondary)]">
        <span className="text-cyan-400 font-semibold cursor-pointer" onClick={() => onSelectBuilding(null)}>
          MITS Gwalior Campus
        </span>
        <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
        {selectedBuilding ? (
          <>
            <span className="font-semibold text-[var(--text-primary)]">{selectedBuilding.name}</span>
            <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
            <span className="text-cyan-400 font-mono">{buildingRooms.length} Monitored Rooms</span>
          </>
        ) : (
          <span className="text-[var(--text-muted)]">Select any building to inspect spatial load</span>
        )}
      </div>

      {/* 3D Scene View or 2D Map View */}
      {viewMode === '3d' ? (
        <div className="space-y-4">
          <MITSCampus3DViewer
            buildings={buildings}
            rooms={rooms}
            alerts={alerts}
            onRefreshAlerts={onRefreshAlerts}
            selectedBuildingId={selectedBuildingId}
            onSelectBuilding={onSelectBuilding}
            onNavigateToRoomControl={onNavigateToRoomControl}
          />

          {/* Building Inspection Tray */}
          {selectedBuilding && (
            <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm animate-fadeIn">
              <div className="flex justify-between items-center pb-2 border-b border-[var(--border-color)]">
                <div>
                  <h3 className="text-sm font-bold text-[var(--text-primary)]">
                    {selectedBuilding.name} — Spatial Hierarchy
                  </h3>
                  <p className="text-xs text-[var(--text-muted)]">
                    {selectedBuilding.categoryLabel} • {selectedBuilding.totalFloors} Floors • Area: {selectedBuilding.floorAreaSqM} m²
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onNavigateToRoomControl && buildingRooms.length > 0) {
                        onNavigateToRoomControl(buildingRooms[0].id, selectedBuilding.id);
                      } else {
                        onNavigateToTab('room-control');
                      }
                    }}
                    className="text-xs px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold flex items-center gap-1 shadow-sm transition-all"
                  >
                    Open Room Energy Control Panel →
                  </button>
                  <button
                    onClick={() => onNavigateToTab('buildings')}
                    className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
                  >
                    View Room Table
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2.5 mt-3">
                {buildingRooms.slice(0, 8).map(r => (
                  <div
                    key={r.id}
                    onClick={() => onNavigateToRoomControl?.(r.id, selectedBuilding.id)}
                    className="p-2.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] hover:border-cyan-500/50 cursor-pointer text-xs transition-all group"
                  >
                    <div className="flex justify-between items-center">
                      <span className="font-mono font-bold text-cyan-400 group-hover:text-cyan-300">{r.roomNumber}</span>
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.status === 'high_usage' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{r.status === 'high_usage' ? 'HIGH' : 'NORMAL'}</span>
                    </div>
                    <span className="text-[11px] text-[var(--text-primary)] font-medium block truncate mt-1">{r.name}</span>
                    <div className="flex justify-between items-center mt-1">
                      <span className="text-[10px] text-cyan-300 font-mono">{r.currentPowerKw} kW • {r.todayKwh} kWh</span>
                      <span className="text-[9px] text-emerald-400 font-semibold group-hover:underline">Control →</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      ) : (
        <MITSCampusMapsView
          buildings={buildings}
          rooms={rooms}
          onSelectBuilding={onSelectBuilding}
          onNavigateToTab={onNavigateToTab}
        />
      )}
    </div>
  );
};
