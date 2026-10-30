import React from 'react';
import { 
  LayoutDashboard, Box, Map, Building2, BookOpen, BarChart3, Receipt, 
  Bell, Cpu, Settings, FileText, Info, Gauge, TrendingUp,
  Wrench, MapPin, Sun, Moon, Sparkles, AlertTriangle, Award, 
  Database, Wind, ShieldAlert, Power, Activity
} from 'lucide-react';
import { UserRole } from '../../../../shared/types.js';

export type MITSTabId = 
  | 'overview'
  | '3d-digital-twin'
  | 'maps'
  | 'buildings'
  | 'room-control'
  | 'solar'
  | 'departments'
  | 'ml-forecast'
  | 'anomalies'
  | 'ai-assistant'
  | 'datasets'
  | 'data-pipeline'
  | 'savings-proof'
  | 'environmental'
  | 'energy-monitoring'
  | 'historical'
  | 'comparison'
  | 'billing'
  | 'facilities'
  | 'alerts'
  | 'wastage'
  | 'devices'
  | 'reports'
  | 'admin'
  | 'about';

interface SidebarProps {
  activeTab: MITSTabId;
  onSelectTab: (tab: MITSTabId) => void;
  userRole: UserRole;
  userName: string;
  isDarkMode: boolean;
  onToggleTheme: () => void;
}

interface MenuItem {
  id: MITSTabId;
  label: string;
  icon: React.ReactNode;
  section?: string;
  adminOnly?: boolean;
  facilityOnly?: boolean;
}

export const Sidebar: React.FC<SidebarProps> = ({
  activeTab,
  onSelectTab,
  userRole,
  userName,
  isDarkMode,
  onToggleTheme
}) => {
  const menuItems: MenuItem[] = [
    // PRIMARY NAVIGATION
    { id: 'overview', label: 'Overview / Dashboard', icon: <LayoutDashboard className="w-4 h-4" />, section: 'CAMPUS INTELLIGENCE' },
    { id: '3d-digital-twin', label: '3D Campus View', icon: <Box className="w-4 h-4 text-cyan-400" /> },
    { id: 'buildings', label: 'Buildings & Rooms', icon: <Building2 className="w-4 h-4" /> },
    { id: 'room-control', label: 'Room Energy & Control', icon: <Power className="w-4 h-4 text-emerald-400" /> },
    { id: 'ml-forecast', label: 'Energy Analytics & ML', icon: <TrendingUp className="w-4 h-4 text-indigo-400" /> },
    { id: 'solar', label: 'Solar Monitoring & PV', icon: <Sun className="w-4 h-4 text-amber-400" /> },
    { id: 'alerts', label: 'Live Alerts Center', icon: <Bell className="w-4 h-4 text-rose-400" /> },
    { id: 'data-pipeline', label: 'Data Pipeline & Sources', icon: <Activity className="w-4 h-4 text-cyan-300" /> },
    { id: 'facilities', label: 'Facility Operations', icon: <Wrench className="w-4 h-4" /> },

    // ADVANCED ANALYTICS & TOOLS
    { id: 'maps', label: '2D Blueprints Map', icon: <Map className="w-4 h-4" />, section: 'DIAGNOSTICS & AUDITING' },
    { id: 'anomalies', label: 'Isolation Forest Anomalies', icon: <AlertTriangle className="w-4 h-4" /> },
    { id: 'ai-assistant', label: 'AI Energy Assistant', icon: <Sparkles className="w-4 h-4 text-cyan-400" /> },
    { id: 'datasets', label: 'Dataset Pipelines', icon: <Database className="w-4 h-4" /> },
    { id: 'savings-proof', label: 'Savings Proof & M&V', icon: <Award className="w-4 h-4 text-emerald-400" /> },
    { id: 'environmental', label: 'Environmental Quality', icon: <Wind className="w-4 h-4" /> },
    { id: 'wastage', label: 'Wastage Ranking', icon: <BarChart3 className="w-4 h-4" /> },
    { id: 'billing', label: 'Billing & Tariffs', icon: <Receipt className="w-4 h-4" /> },
    { id: 'devices', label: 'IoT Fleet (ESP32)', icon: <Cpu className="w-4 h-4" /> },
    { id: 'reports', label: 'Compliance Reports', icon: <FileText className="w-4 h-4" /> },
    
    // SYSTEM
    { id: 'admin', label: 'Administration', icon: <Settings className="w-4 h-4" />, section: 'SYSTEM CONFIGURATION', adminOnly: true },
    { id: 'about', label: 'About Project', icon: <Info className="w-4 h-4" /> },
  ];

  const filteredItems = menuItems.filter(item => {
    if (item.adminOnly && userRole !== 'super_admin') return false;
    if (item.facilityOnly && userRole !== 'super_admin' && userRole !== 'facility_manager') return false;
    return true;
  });

  let currentSection = '';

  return (
    <aside className="w-60 bg-[var(--bg-secondary)] border-r border-[var(--border-color)] flex flex-col justify-between shrink-0 overflow-y-auto" aria-label="Sidebar Navigation">
      <div className="p-2.5">
        <nav className="space-y-0.5" aria-label="Campus Sections">
          {filteredItems.map((item) => {
            const isActive = activeTab === item.id;
            const showSection = item.section && item.section !== currentSection;
            if (item.section) currentSection = item.section;

            return (
              <React.Fragment key={item.id}>
                {showSection && (
                  <div className="px-3 pt-3.5 pb-1 text-[9px] font-bold text-[var(--text-muted)] uppercase tracking-wider">
                    {item.section}
                  </div>
                )}
                <button
                  onClick={() => onSelectTab(item.id)}
                  className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-left transition-all text-xs ${
                    isActive
                      ? 'bg-cyan-600 text-white shadow-sm font-semibold'
                      : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)]'
                  }`}
                >
                  <span className={isActive ? 'text-white' : 'text-cyan-400'}>
                    {item.icon}
                  </span>
                  <span className="truncate">{item.label}</span>
                </button>
              </React.Fragment>
            );
          })}
        </nav>
      </div>

      {/* Bottom Section */}
      <div className="p-3 space-y-2 border-t border-[var(--border-color)]">
        {/* Dark/Light Theme Toggle */}
        <button
          onClick={onToggleTheme}
          aria-label={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          title={isDarkMode ? "Switch to light theme" : "Switch to dark theme"}
          className="w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-tertiary)] transition-all focus:outline-none focus:ring-1 focus:ring-cyan-400"
        >
          {isDarkMode ? <Sun className="w-4 h-4 text-amber-400" /> : <Moon className="w-4 h-4 text-indigo-400" />}
          <span>{isDarkMode ? 'Light Mode' : 'Dark Mode'}</span>
        </button>

        {/* Location & User Badge */}
        <div className="p-2.5 rounded-xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[10px] text-[var(--text-muted)]">
          <div className="flex items-center gap-1.5 text-cyan-400 font-bold text-[11px]">
            <MapPin className="w-3.5 h-3.5" />
            MITS Gwalior
          </div>
          <p className="mt-1 leading-tight text-slate-400">Gola Ka Mandir, Gwalior (M.P.)</p>
          <div className="mt-1.5 pt-1.5 border-t border-[var(--border-color)] flex justify-between items-center text-[10px]">
            <span className="text-[var(--text-secondary)] truncate">{userName}</span>
            <span className="font-mono text-cyan-400 font-bold uppercase">{userRole}</span>
          </div>
        </div>
      </div>
    </aside>
  );
};
