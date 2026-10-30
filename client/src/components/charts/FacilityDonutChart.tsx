import React from 'react';

interface FacilityExpense {
  buildingId: string;
  buildingName: string;
  category: string;
  todayKwh: number;
  todayCost: number;
  monthKwh: number;
  monthCost: number;
}

interface FacilityDonutChartProps {
  facilities: FacilityExpense[];
}

export const FacilityDonutChart: React.FC<FacilityDonutChartProps> = ({ facilities = [] }) => {
  // Aggregate by facility category
  const categoryMap: { [key: string]: { label: string; cost: number; color: string; icon: string } } = {
    hostel: { label: 'Hostels (Residential)', cost: 0, color: '#10B981', icon: '🛏️' },
    academic: { label: 'Academic & Classrooms', cost: 0, color: '#3B82F6', icon: '📚' },
    laboratory: { label: 'Research & Science Labs', cost: 0, color: '#06B6D4', icon: '🔬' },
    dining: { label: 'Dining & Food Court', cost: 0, color: '#F59E0B', icon: '🍽️' },
    library: { label: 'Central Library', cost: 0, color: '#8B5CF6', icon: '📖' },
    administrative: { label: 'Administration & IT', cost: 0, color: '#EC4899', icon: '🏛️' },
    infrastructure: { label: 'Water & Utilities', cost: 0, color: '#0284C7', icon: '💧' },
    athletics: { label: 'Sports & Gymnasium', cost: 0, color: '#EF4444', icon: '🏀' }
  };

  let totalCost = 0;
  facilities.forEach(f => {
    if (f.category !== 'infrastructure' || f.buildingId === 'BUILDING_WATER_PUMP_STATION') {
      const cat = categoryMap[f.category];
      if (cat && f.todayCost > 0) {
        cat.cost += f.todayCost;
        totalCost += f.todayCost;
      }
    }
  });

  const categories = Object.values(categoryMap).filter(c => c.cost > 0);

  // Calculate donut slices (strokeDasharray)
  const radius = 70;
  const circumference = 2 * Math.PI * radius;
  let accumulatedPercent = 0;

  return (
    <div className="bg-[#111827] border border-[#1F2E4D] rounded-xl p-5 shadow-card-dark">
      <div className="pb-3 border-b border-slate-800">
        <h3 className="text-base font-semibold text-slate-100 flex items-center gap-2">
          <span>📊</span> Campus Cost & Energy Allocation by Facility
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Proportional daily expenditure across campus zones</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-center mt-4">
        {/* SVG Donut */}
        <div className="relative flex items-center justify-center">
          <svg width="220" height="220" viewBox="0 0 200 200" className="transform -rotate-90">
            {categories.map((cat, i) => {
              const percent = cat.cost / (totalCost || 1);
              const strokeLength = percent * circumference;
              const strokeOffset = circumference - accumulatedPercent * circumference;
              accumulatedPercent += percent;

              return (
                <circle
                  key={i}
                  cx="100"
                  cy="100"
                  r={radius}
                  fill="transparent"
                  stroke={cat.color}
                  strokeWidth="24"
                  strokeDasharray={`${strokeLength} ${circumference - strokeLength}`}
                  strokeDashoffset={- (accumulatedPercent - percent) * circumference}
                  className="transition-all duration-500 hover:stroke-width-28 cursor-pointer"
                />
              );
            })}
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center pointer-events-none">
            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">TOTAL DAILY</span>
            <span className="text-xl font-bold font-mono text-white mt-0.5">₹{Math.round(totalCost).toLocaleString()}</span>
            <span className="text-[10px] text-cyan-400">100% Traceable</span>
          </div>
        </div>

        {/* Legend table */}
        <div className="space-y-2 text-xs">
          {categories.map((cat, idx) => {
            const pct = Math.round((cat.cost / (totalCost || 1)) * 100);
            return (
              <div key={idx} className="flex items-center justify-between p-2 rounded-lg bg-slate-900/40 hover:bg-slate-800/60 transition-colors">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: cat.color }}></span>
                  <span className="text-slate-200 font-medium">{cat.label}</span>
                </div>
                <div className="flex items-center gap-3 font-mono">
                  <span className="text-white font-semibold">₹{Math.round(cat.cost).toLocaleString()}</span>
                  <span className="text-slate-400 w-8 text-right font-medium">{pct}%</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
