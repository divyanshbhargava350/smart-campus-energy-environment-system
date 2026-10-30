import React, { useState } from 'react';
import { BookOpen, Users, Zap, ChevronRight } from 'lucide-react';

interface DepartmentsViewProps {
  departments: any[];
  rooms: any[];
  currentUser: any;
}

export const MITSDepartmentsView: React.FC<DepartmentsViewProps> = ({
  departments = [], rooms = [], currentUser
}) => {
  const [selectedDeptId, setSelectedDeptId] = useState<string | null>(null);
  const selectedDept = departments.find((d: any) => d.id === selectedDeptId);
  const deptRooms = selectedDept ? rooms.filter((r: any) => r.departmentName === selectedDept.name) : [];

  return (
    <div className="space-y-4 animate-fadeIn">
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4">
        <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
          <BookOpen className="w-5 h-5 text-indigo-400" /> Academic Departments
        </h2>
        <p className="text-xs text-[var(--text-muted)] mt-0.5">{departments.length} departments monitored</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {departments.map((d: any) => (
          <div key={d.id} onClick={() => setSelectedDeptId(selectedDeptId === d.id ? null : d.id)}
            className={`bg-[var(--bg-secondary)] border rounded-xl p-4 card-hover cursor-pointer ${
              selectedDeptId === d.id ? 'border-cyan-500' : 'border-[var(--border-color)]'
            }`}>
            <div className="flex items-center justify-between pb-2 border-b border-[var(--border-color)]">
              <span className="font-bold text-[var(--text-primary)] text-sm">{d.name}</span>
              <span className="px-1.5 py-0.5 rounded text-[9px] font-mono font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">{d.code}</span>
            </div>
            <div className="mt-2 space-y-1.5 text-[11px]">
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">HOD</span>
                <span className="text-[var(--text-primary)] font-medium">{d.hodName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Building</span>
                <span className="text-[var(--text-secondary)]">{d.buildingName}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-[var(--text-muted)]">Rooms</span>
                <span className="text-[var(--text-primary)] font-mono">{d.roomsCount}</span>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-3 pt-2 border-t border-[var(--border-color)]">
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">LOAD</span>
                <span className="font-mono font-bold text-cyan-500 text-sm">{d.currentPowerKw} kW</span>
              </div>
              <div>
                <span className="text-[10px] text-[var(--text-muted)] block">TODAY</span>
                <span className="font-mono font-bold text-[var(--text-primary)] text-sm">{d.todayKwh} kWh</span>
              </div>
            </div>
            <div className="mt-2 text-right">
              <span className="text-[10px] text-amber-500 font-mono">₹{d.todayCost.toLocaleString()}</span>
            </div>
          </div>
        ))}
      </div>

      {/* Department Rooms */}
      {selectedDept && deptRooms.length > 0 && (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl overflow-hidden animate-fadeIn">
          <div className="px-4 py-3 border-b border-[var(--border-color)]">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">{selectedDept.name} — Rooms ({deptRooms.length})</h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)]">
                  <th className="text-left px-4 py-2">Room</th>
                  <th className="text-left px-4 py-2">Name</th>
                  <th className="text-left px-4 py-2">Floor</th>
                  <th className="text-right px-4 py-2">Power</th>
                  <th className="text-right px-4 py-2">Today</th>
                  <th className="text-center px-4 py-2">Status</th>
                </tr>
              </thead>
              <tbody>
                {deptRooms.map((r: any) => (
                  <tr key={r.id} className="border-b border-[var(--border-color)] hover:bg-[var(--bg-tertiary)]">
                    <td className="px-4 py-2 font-mono font-bold text-cyan-500">{r.roomNumber}</td>
                    <td className="px-4 py-2 text-[var(--text-primary)]">{r.name}</td>
                    <td className="px-4 py-2 text-[var(--text-muted)]">{r.floor}</td>
                    <td className="px-4 py-2 text-right font-mono font-bold">{r.currentPowerKw} kW</td>
                    <td className="px-4 py-2 text-right font-mono">{r.todayKwh} kWh</td>
                    <td className="px-4 py-2 text-center">
                      <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold ${
                        r.status === 'high_usage' ? 'bg-rose-500/10 text-rose-400' : 'bg-emerald-500/10 text-emerald-400'
                      }`}>{r.status === 'high_usage' ? 'HIGH' : 'OK'}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};
