import React, { useState, useEffect } from 'react';
import { 
  Zap, Sun, Power, LogOut, Bell, Search, Menu, X, ChevronDown, 
  Building2, Shield, CheckCircle2 
} from 'lucide-react';
import { api } from '../../services/api.js';

interface NavbarProps {
  currentUser: any;
  onLogout: () => void;
  balance?: any;
  alertCount?: number;
  onToggleMobileSidebar?: () => void;
  onNavigateToTab?: (tab: string) => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  onLogout,
  balance,
  alertCount = 0,
  onToggleMobileSidebar,
  onNavigateToTab
}) => {
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [campuses, setCampuses] = useState<any[]>([]);
  const [activeCampusId, setActiveCampusId] = useState<string>('CAMPUS_MITS_GWALIOR');

  useEffect(() => {
    api.campuses().then(res => {
      if (res.success && res.campuses) {
        setCampuses(res.campuses);
        setActiveCampusId(res.activeCampusId);
      }
    });
  }, []);

  const handleSwitchCampus = async (cId: string) => {
    setActiveCampusId(cId);
    await api.switchCampus(cId);
  };

  const getRoleBadge = (role: string) => {
    switch (role) {
      case 'super_admin':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">SUPER ADMIN</span>;
      case 'facility_manager':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-amber-500/10 text-amber-400 border border-amber-500/30">FACILITY MGR</span>;
      case 'department_hod':
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-indigo-500/10 text-indigo-400 border border-indigo-500/30">DEPT HOD</span>;
      default:
        return <span className="px-2 py-0.5 rounded text-[9px] font-bold bg-slate-500/10 text-slate-400 border border-slate-500/30">VIEWER</span>;
    }
  };

  return (
    <header className="h-16 bg-[var(--bg-secondary)] border-b border-[var(--border-color)] px-4 flex items-center justify-between z-30 sticky top-0 shadow-sm">
      {/* Left: Brand Identity & Campus Selector */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleMobileSidebar}
          className="md:hidden p-1.5 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)]"
        >
          <Menu className="w-5 h-5" />
        </button>

        <img 
          src="/mits-logo.jpg" 
          alt="MITS" 
          className="w-10 h-10 rounded-full border border-[var(--border-color)] object-cover shadow-sm shrink-0"
          onError={(e) => {
            const el = e.target as HTMLImageElement;
            el.style.display = 'none';
          }}
        />

        <div className="hidden sm:block">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[var(--text-primary)] text-sm tracking-tight">MITS Gwalior</span>
            <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold hidden lg:inline">
              ENERGY & ENVIRONMENT
            </span>
          </div>
          <span className="text-[10px] text-[var(--text-muted)] hidden lg:block leading-tight">
            Smart Campus Energy and Environment System
          </span>
        </div>

        {/* Global Campus Selector */}
        {campuses.length > 0 && (
          <div className="hidden xl:flex items-center gap-1.5 ml-2 pl-3 border-l border-[var(--border-color)]">
            <Building2 className="w-3.5 h-3.5 text-cyan-400" />
            <select
              value={activeCampusId}
              onChange={e => handleSwitchCampus(e.target.value)}
              className="bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-lg px-2.5 py-1 text-xs text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
            >
              {campuses.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Center: Live Power Balance Telemetry Ticker */}
      {balance && (
        <div className="hidden lg:flex items-center gap-2 text-xs font-mono">
          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-amber-500/20 text-amber-400">
            <Sun className="w-3.5 h-3.5" />
            <span className="text-[var(--text-muted)] text-[10px]">Solar</span>
            <span className="font-bold text-[var(--text-primary)]">{balance.solarGeneratedKw} kW</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-cyan-500/20 text-cyan-400">
            <Zap className="w-3.5 h-3.5" />
            <span className="text-[var(--text-muted)] text-[10px]">Grid</span>
            <span className="font-bold text-[var(--text-primary)]">{balance.gridElectricityUsedKw} kW</span>
          </div>

          <div className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-[var(--bg-tertiary)] border border-emerald-500/20 text-emerald-400">
            <Power className="w-3.5 h-3.5" />
            <span className="text-[var(--text-muted)] text-[10px]">Demand</span>
            <span className="font-bold text-[var(--text-primary)]">{balance.totalCampusDemandKw} kW</span>
          </div>
        </div>
      )}

      {/* Right: Notifications & User Profile */}
      <div className="flex items-center gap-2">
        {/* Alerts Bell */}
        <button 
          onClick={() => onNavigateToTab && onNavigateToTab('alerts')}
          className="relative p-2 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-secondary)] transition-colors"
          title="Active Alerts"
        >
          <Bell className="w-4 h-4" />
          {alertCount > 0 && (
            <span className="absolute -top-0.5 -right-0.5 w-4 h-4 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center">
              {alertCount > 9 ? '9+' : alertCount}
            </span>
          )}
        </button>

        {/* User Profile */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-2.5 py-1.5 rounded-xl hover:bg-[var(--bg-tertiary)] border border-transparent hover:border-[var(--border-color)] transition-colors"
          >
            <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center text-white text-xs font-bold shadow-sm">
              {currentUser?.name?.charAt(0)?.toUpperCase() || 'U'}
            </div>
            <div className="hidden sm:block text-left">
              <span className="text-xs font-semibold text-[var(--text-primary)] block leading-tight">
                {currentUser?.name}
              </span>
              <div className="mt-0.5">{getRoleBadge(currentUser?.role)}</div>
            </div>
            <ChevronDown className="w-3 h-3 text-[var(--text-muted)] hidden sm:block" />
          </button>

          {/* User Dropdown */}
          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 mt-1 w-56 bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl shadow-xl z-50 py-1 animate-fadeIn">
                <div className="px-3 py-2 border-b border-[var(--border-color)]">
                  <p className="text-xs font-semibold text-[var(--text-primary)]">{currentUser?.name}</p>
                  <p className="text-[10px] text-[var(--text-muted)]">{currentUser?.email}</p>
                  <div className="mt-1">{getRoleBadge(currentUser?.role)}</div>
                  {currentUser?.departmentName && (
                    <p className="text-[10px] text-cyan-400 mt-1 font-medium">{currentUser.departmentName}</p>
                  )}
                </div>

                <button
                  onClick={() => { setShowUserMenu(false); onLogout(); }}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-rose-400 hover:bg-rose-500/10 transition-colors"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  Sign Out
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
