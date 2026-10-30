import React, { useState } from 'react';
import { Map, Search, Building2, ChevronRight, ZoomIn, ZoomOut, Home } from 'lucide-react';

interface CampusMapsProps {
  buildings: any[];
  rooms: any[];
  onSelectBuilding: (id: string) => void;
  onNavigateToTab: (tab: string) => void;
}

export const MITSCampusMapsView: React.FC<CampusMapsProps> = ({
  buildings = [],
  rooms = [],
  onSelectBuilding,
  onNavigateToTab
}) => {
  const [selectedMap, setSelectedMap] = useState<'campus' | 'main' | 'ai'>('campus');
  const [searchTerm, setSearchTerm] = useState('');
  const [zoom, setZoom] = useState(1);
  const [selectedBuildingOnMap, setSelectedBuildingOnMap] = useState<string | null>(null);

  const maps = [
    { id: 'campus', label: 'Campus Masterplan', src: '/maps/mits_campus_masterplan.png' },
    { id: 'main', label: 'Main Building', src: '/maps/mits_main_building_floorplan.png' },
    { id: 'ai', label: 'AI Building', src: '/maps/mits_ai_building_floorplan.png' }
  ];

  const filteredBuildings = buildings.filter(b =>
    b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    b.code.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const filteredRooms = searchTerm.length > 1
    ? rooms.filter((r: any) =>
        r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        r.roomNumber.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : [];

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Map className="w-5 h-5 text-cyan-500" /> Campus Map & Floor Plans
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Interactive 2D maps of MITS Gwalior campus buildings
          </p>
        </div>
        <span className="badge-simulated">CONFIGURABLE LAYOUT</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Left Panel: Search & Building List */}
        <div className="lg:col-span-1 space-y-3">
          {/* Search */}
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              type="text"
              placeholder="Search buildings, rooms..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-lg pl-9 pr-3 py-2 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-cyan-500 focus:outline-none"
            />
          </div>

          {/* Map Tabs */}
          <div className="space-y-1">
            {maps.map(m => (
              <button
                key={m.id}
                onClick={() => setSelectedMap(m.id as any)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all ${
                  selectedMap === m.id
                    ? 'bg-cyan-600 text-white'
                    : 'bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:border-cyan-500/40'
                }`}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Buildings List */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3 max-h-[400px] overflow-y-auto">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Buildings</h4>
            <div className="space-y-1">
              {filteredBuildings.map(b => (
                <button
                  key={b.id}
                  onClick={() => {
                    setSelectedBuildingOnMap(b.id);
                    onSelectBuilding(b.id);
                    onNavigateToTab('buildings');
                  }}
                  className={`w-full text-left px-2.5 py-2 rounded-lg text-xs transition-all flex items-center justify-between ${
                    selectedBuildingOnMap === b.id
                      ? 'bg-cyan-500/10 border border-cyan-500/30 text-cyan-500'
                      : 'hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]'
                  }`}
                >
                  <div>
                    <span className="font-semibold block text-[var(--text-primary)]">{b.name}</span>
                    <span className="text-[10px] text-[var(--text-muted)]">{b.currentPowerKw} kW • {b.totalRooms} rooms</span>
                  </div>
                  <ChevronRight className="w-3.5 h-3.5 text-[var(--text-muted)]" />
                </button>
              ))}
            </div>

            {/* Room Search Results */}
            {filteredRooms.length > 0 && (
              <>
                <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mt-3 mb-2">Rooms</h4>
                {filteredRooms.slice(0, 10).map((r: any) => (
                  <div key={r.id} className="px-2.5 py-1.5 text-[11px] text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)] rounded-lg cursor-pointer">
                    <span className="font-mono text-cyan-500">{r.roomNumber}</span> — {r.name}
                  </div>
                ))}
              </>
            )}
          </div>

          {/* Legend */}
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-3">
            <h4 className="text-[10px] font-bold text-[var(--text-muted)] uppercase tracking-wider mb-2">Legend</h4>
            <div className="space-y-1.5 text-[11px]">
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-emerald-500/60" />
                <span className="text-[var(--text-secondary)]">Normal usage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-amber-500/60" />
                <span className="text-[var(--text-secondary)]">Elevated usage</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded bg-rose-500/60" />
                <span className="text-[var(--text-secondary)]">High / Critical usage</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right Panel: Map View */}
        <div className="lg:col-span-3">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden">
            {/* Map Controls */}
            <div className="flex items-center justify-between px-4 py-2 border-b border-[var(--border-color)]">
              <span className="text-xs font-semibold text-[var(--text-primary)]">
                {maps.find(m => m.id === selectedMap)?.label}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setZoom(Math.min(zoom + 0.2, 3))} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  <ZoomIn className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(Math.max(zoom - 0.2, 0.5))} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  <ZoomOut className="w-4 h-4" />
                </button>
                <button onClick={() => setZoom(1)} className="p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)]">
                  <Home className="w-4 h-4" />
                </button>
                <span className="text-[10px] font-mono text-[var(--text-muted)] ml-1">{Math.round(zoom * 100)}%</span>
              </div>
            </div>

            {/* Map Image */}
            <div className="overflow-auto bg-[var(--bg-tertiary)] p-4" style={{ maxHeight: '600px' }}>
              <div style={{ transform: `scale(${zoom})`, transformOrigin: 'top left', transition: 'transform 0.2s ease' }}>
                <img
                  src={maps.find(m => m.id === selectedMap)?.src}
                  alt={maps.find(m => m.id === selectedMap)?.label}
                  className="max-w-full rounded-lg border border-[var(--border-color)] shadow-lg"
                  style={{ minWidth: '600px' }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
