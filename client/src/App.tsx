import React, { useState, useEffect } from 'react';
import { 
  User, Building, Room, DepartmentInfo, SolarGridEnergyBalance 
} from '../../shared/types.js';
import { LoginPage } from './components/auth/LoginPage.js';
import { Navbar } from './components/layout/Navbar.js';
import { Sidebar, MITSTabId } from './components/layout/Sidebar.js';
import { MITSOverviewView } from './views/MITSOverviewView.js';
import { DigitalTwin3DView } from './views/DigitalTwin3DView.js';
import { MITSCampusMapsView } from './views/MITSCampusMapsView.js';
import { MITSBuildingsView } from './views/MITSBuildingsView.js';
import { RoomControlPanelView } from './views/RoomControlPanelView.js';
import { SolarMonitoringView } from './views/SolarMonitoringView.js';
import { DataPipelineStatusView } from './views/DataPipelineStatusView.js';
import { MITSDepartmentsView } from './views/MITSDepartmentsView.js';
import { MLForecastingView } from './views/MLForecastingView.js';
import { AnomalyDetectionView } from './views/AnomalyDetectionView.js';
import { AIAssistantView } from './views/AIAssistantView.js';
import { DatasetPipelineView } from './views/DatasetPipelineView.js';
import { SavingsVerificationView } from './views/SavingsVerificationView.js';
import { EnvironmentalMonitoringView } from './views/EnvironmentalMonitoringView.js';
import { EnergyMonitoringView } from './views/EnergyMonitoringView.js';
import { HistoricalRecordsView } from './views/HistoricalRecordsView.js';
import { ComparisonView } from './views/ComparisonView.js';
import { BillingExpensesView } from './views/BillingExpensesView.js';
import { FacilityModulesView } from './views/FacilityModulesView.js';
import { SmartAlertsView } from './views/SmartAlertsView.js';
import { WastageRankingView } from './views/WastageRankingView.js';
import { DeviceManagementView } from './views/DeviceManagementView.js';
import { ReportsView } from './views/ReportsView.js';
import { AdministrationView } from './views/AdministrationView.js';
import { AboutProjectView } from './views/AboutProjectView.js';
import { api } from './services/api.js';

export function App() {
  const [currentUser, setCurrentUser] = useState<User | null>(() => {
    try {
      const stored = localStorage.getItem('mits_user');
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  });

  const [activeTab, setActiveTab] = useState<MITSTabId>('overview');
  const [isDarkMode, setIsDarkMode] = useState<boolean>(true);
  const [mobileSidebarOpen, setMobileSidebarOpen] = useState<boolean>(false);

  // MITS Campus Data States
  const [energyBalance, setEnergyBalance] = useState<SolarGridEnergyBalance>({
    solarGeneratedKw: 215.0,
    solarGeneratedTodayKwh: 1420,
    solarUsedCampusKw: 185.0,
    solarUsedTodayKwh: 1180,
    solarExportedGridKw: 30.0,
    solarExportedTodayKwh: 240,
    gridElectricityUsedKw: 214.2,
    gridElectricityTodayKwh: 2340,
    totalCampusDemandKw: 399.2,
    totalCampusTodayKwh: 3520,
    solarOffsetPercentage: 35.2
  });

  const [buildings, setBuildings] = useState<Building[]>([]);
  const [departments, setDepartments] = useState<DepartmentInfo[]>([]);
  const [rooms, setRooms] = useState<Room[]>([]);
  const [hourlyCurve, setHourlyCurve] = useState<any[]>([]);
  const [alerts, setAlerts] = useState<any[]>([]);
  const [tariff, setTariff] = useState<any>({ ratePerKwh: 7.60 });
  const [selectedBuildingId, setSelectedBuildingId] = useState<string | null>(null);
  const [selectedRoomId, setSelectedRoomId] = useState<string | null>(null);

  // Check persistent session on startup
  useEffect(() => {
    const token = localStorage.getItem('mits_token');
    if (token) {
      api.me()
        .then(res => {
          if (res.success && res.user) {
            setCurrentUser(res.user);
          } else {
            localStorage.removeItem('mits_token');
            localStorage.removeItem('mits_user');
            setCurrentUser(null);
          }
        })
        .catch(() => {
          // On network or token decoding failure, safely reset to login
          try {
            localStorage.removeItem('mits_token');
            localStorage.removeItem('mits_user');
          } catch { /* ignore */ }
          setCurrentUser(null);
        });
    }
    const handleAuthLogout = () => {
      setCurrentUser(null);
    };
    window.addEventListener('mits_auth_logout', handleAuthLogout);
    return () => window.removeEventListener('mits_auth_logout', handleAuthLogout);
  }, []);

  // Theme application
  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.remove('theme-light');
    } else {
      document.documentElement.classList.add('theme-light');
    }
  }, [isDarkMode]);

  // Load campus data with department isolation if user is HOD
  const loadData = () => {
    api.overview().then(res => {
      if (res.success && res.energyBalance) {
        setEnergyBalance(res.energyBalance);
        if (res.tariff) setTariff(res.tariff);
      }
    });

    api.buildings().then(res => {
      if (res.success) setBuildings(res.data);
    });

    const deptParams = currentUser?.role === 'department_hod' && currentUser?.departmentId
      ? { departmentId: currentUser.departmentId }
      : undefined;

    api.departments(deptParams).then(res => {
      if (res.success) setDepartments(res.data);
    });

    const roomParams = currentUser?.role === 'department_hod' && currentUser?.departmentId
      ? { departmentId: currentUser.departmentId }
      : undefined;

    api.rooms(roomParams).then(res => {
      if (res.success) setRooms(res.data);
    });

    api.solarGridCurve().then(res => {
      if (res.success) setHourlyCurve(res.data);
    });

    api.alerts().then(res => {
      if (res.success) setAlerts(res.data || []);
    });
  };

  useEffect(() => {
    if (currentUser) {
      loadData();
    }
  }, [currentUser]);

  // WebSocket Live Stream
  useEffect(() => {
    if (!currentUser) return;

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    let ws: WebSocket | null = null;

    try {
      ws = new WebSocket(wsUrl);
      ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data);
          if (msg.type === 'SOLAR_GRID_TICK' && msg.balance) {
            setEnergyBalance(msg.balance);
          } else if (msg.type === 'SNAPSHOT' && msg.data) {
            setEnergyBalance(msg.data);
          }
        } catch {
          // parse ignore
        }
      };
    } catch {
      // ws connect ignore
    }

    return () => {
      if (ws) ws.close();
    };
  }, [currentUser]);

  const handleLogout = () => {
    localStorage.removeItem('mits_token');
    localStorage.removeItem('mits_user');
    setCurrentUser(null);
  };

  // If not logged in, show login page
  if (!currentUser) {
    return (
      <LoginPage
        onLoginSuccess={(user) => {
          setCurrentUser(user);
        }}
      />
    );
  }

  const activeAlertCount = alerts.filter(a => a.status === 'active').length;

  return (
    <div className="min-h-screen flex flex-col font-sans transition-colors duration-200">
      {/* Top Navbar */}
      <Navbar
        currentUser={currentUser}
        onLogout={handleLogout}
        balance={energyBalance}
        alertCount={activeAlertCount}
        onToggleMobileSidebar={() => setMobileSidebarOpen(!mobileSidebarOpen)}
        onNavigateToTab={(tab: any) => setActiveTab(tab)}
      />

      {/* Main Container */}
      <div className="flex-1 flex overflow-hidden">
        {/* Desktop Sidebar */}
        <div className="hidden md:flex">
          <Sidebar
            activeTab={activeTab}
            onSelectTab={(tab) => {
              setActiveTab(tab);
              if (tab !== 'buildings' && tab !== '3d-digital-twin') setSelectedBuildingId(null);
            }}
            userRole={currentUser.role}
            userName={currentUser.name}
            isDarkMode={isDarkMode}
            onToggleTheme={() => setIsDarkMode(!isDarkMode)}
          />
        </div>

        {/* Mobile Sidebar Overlay */}
        {mobileSidebarOpen && (
          <div className="fixed inset-0 z-50 flex md:hidden">
            <div className="fixed inset-0 bg-black/60" onClick={() => setMobileSidebarOpen(false)} />
            <div className="relative z-50 w-64 bg-[var(--bg-secondary)] flex flex-col">
              <Sidebar
                activeTab={activeTab}
                onSelectTab={(tab) => {
                  setActiveTab(tab);
                  setMobileSidebarOpen(false);
                  if (tab !== 'buildings' && tab !== '3d-digital-twin') setSelectedBuildingId(null);
                }}
                userRole={currentUser.role}
                userName={currentUser.name}
                isDarkMode={isDarkMode}
                onToggleTheme={() => setIsDarkMode(!isDarkMode)}
              />
            </div>
          </div>
        )}

        {/* Content Viewport */}
        <main className="flex-1 p-3 sm:p-5 lg:p-6 overflow-y-auto max-w-[1600px] w-full mx-auto">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <MITSOverviewView
              balance={energyBalance}
              buildings={buildings}
              departments={departments}
              rooms={rooms}
              hourlyCurve={hourlyCurve}
              alerts={alerts}
              tariff={tariff}
              onSelectBuilding={(bId) => {
                setSelectedBuildingId(bId);
                setActiveTab('buildings');
              }}
              onNavigateToTab={(tab: any) => setActiveTab(tab)}
            />
          )}

          {/* TAB 2: 3D DIGITAL TWIN */}
          {activeTab === '3d-digital-twin' && (
            <DigitalTwin3DView
              buildings={buildings}
              rooms={rooms}
              alerts={alerts}
              onRefreshAlerts={loadData}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={setSelectedBuildingId}
              onNavigateToTab={setActiveTab}
              onNavigateToRoomControl={(rId, bId) => {
                setSelectedBuildingId(bId);
                setSelectedRoomId(rId);
                setActiveTab('room-control');
              }}
            />
          )}

          {/* TAB 3: 2D BLUEPRINTS MAP */}
          {activeTab === 'maps' && (
            <MITSCampusMapsView
              buildings={buildings}
              rooms={rooms}
              onSelectBuilding={(bId) => setSelectedBuildingId(bId)}
              onNavigateToTab={(tab: any) => setActiveTab(tab)}
            />
          )}

          {/* TAB 4: BUILDINGS & ROOMS */}
          {activeTab === 'buildings' && (
            <MITSBuildingsView
              buildings={buildings}
              rooms={rooms}
              selectedBuildingId={selectedBuildingId}
              onSelectBuilding={setSelectedBuildingId}
              onNavigateToRoomControl={(rId, bId) => {
                setSelectedBuildingId(bId);
                setSelectedRoomId(rId);
                setActiveTab('room-control');
              }}
            />
          )}

          {/* TAB: ROOM ENERGY & EQUIPMENT CONTROL */}
          {activeTab === 'room-control' && (
            <RoomControlPanelView
              buildings={buildings}
              initialBuildingId={selectedBuildingId}
              initialRoomId={selectedRoomId}
              currentUser={currentUser}
              onSelectBuilding={setSelectedBuildingId}
              onBackTo3D={() => setActiveTab('3d-digital-twin')}
            />
          )}

          {/* TAB: SOLAR PV & INVERTER TELEMETRY */}
          {activeTab === 'solar' && (
            <SolarMonitoringView
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* TAB 5: DEPARTMENTS */}
          {activeTab === 'departments' && (
            <MITSDepartmentsView
              departments={departments}
              rooms={rooms}
              currentUser={currentUser}
            />
          )}

          {/* TAB 6: ML XGBOOST FORECASTING */}
          {activeTab === 'ml-forecast' && (
            <MLForecastingView />
          )}

          {/* TAB 7: ISOLATION FOREST ANOMALIES */}
          {activeTab === 'anomalies' && (
            <AnomalyDetectionView
              userRole={currentUser.role}
            />
          )}

          {/* TAB 8: AI ENERGY ASSISTANT */}
          {activeTab === 'ai-assistant' && (
            <AIAssistantView />
          )}

          {/* TAB 9: KAGGLE DATASET PIPELINE */}
          {activeTab === 'datasets' && (
            <DatasetPipelineView />
          )}

          {/* TAB: DATA PIPELINE DIAGNOSTICS & UNUSED EQUIPMENT */}
          {activeTab === 'data-pipeline' && (
            <DataPipelineStatusView
              onNavigateToTab={setActiveTab}
            />
          )}

          {/* TAB 10: SAVINGS PROOF & M&V */}
          {activeTab === 'savings-proof' && (
            <SavingsVerificationView />
          )}

          {/* TAB 11: ENVIRONMENTAL MONITORING */}
          {activeTab === 'environmental' && (
            <EnvironmentalMonitoringView />
          )}

          {/* TAB 12: BILLING & EXPENSES */}
          {activeTab === 'billing' && (
            <BillingExpensesView />
          )}

          {/* TAB 13: FACILITY MODULES */}
          {activeTab === 'facilities' && (
            <FacilityModulesView
              buildings={buildings}
              rooms={rooms}
              userRole={currentUser.role}
              onNavigateToTab={setActiveTab}
              onNavigateToRoomControl={(rId, bId) => {
                setSelectedBuildingId(bId);
                setSelectedRoomId(rId);
                setActiveTab('room-control');
              }}
            />
          )}

          {/* TAB 14: ALERTS CENTER */}
          {activeTab === 'alerts' && (
            <SmartAlertsView
              userRole={currentUser.role}
            />
          )}

          {/* TAB 15: WASTAGE RANKING */}
          {activeTab === 'wastage' && (
            <WastageRankingView />
          )}

          {/* TAB 16: IOT FLEET */}
          {activeTab === 'devices' && (
            <DeviceManagementView
              userRole={currentUser.role}
            />
          )}

          {/* TAB 17: REPORTS & AUDIT */}
          {activeTab === 'reports' && (
            <ReportsView user={currentUser} />
          )}

          {/* TAB 18: ADMINISTRATION */}
          {activeTab === 'admin' && (
            <AdministrationView />
          )}

          {/* TAB 19: ABOUT PROJECT */}
          {activeTab === 'about' && (
            <AboutProjectView />
          )}
        </main>
      </div>
    </div>
  );
}
