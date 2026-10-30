import { db, MITSDatabase } from './db.js';
import { hashPassword } from './auth.js';
import { 
  Building, Room, DepartmentInfo, Device, Alert, RegisteredUser,
  SavingsVerificationRecord, EnvironmentalZone, Appliance, ApplianceSchedule 
} from '../shared/types.js';

export async function seedMITSDatabase(force = false) {
  const existing = db.getData();
  if (!force && existing.users?.length >= 4 && existing.savingsVerifications?.length > 0 && existing.appliances?.length > 0 && existing.unusedEquipmentFindings?.length > 0 && existing.energyReadings?.length > 0) {
    console.log('[Seed] Database already up to date with multi-role accounts, room appliances, solar and pipeline records.');
    return;
  }

  console.log('[Seed] Seeding MITS Gwalior Digital Twin, Multi-floor Rooms & Room Control Appliances...');

  const departments: DepartmentInfo[] = [
    { id: 'DEPT_AI_DS', name: 'Artificial Intelligence & Data Science', code: 'AI-DS', hodName: 'Dr. Manish Dixit', buildingName: 'AI & Data Science Building', roomsCount: 12, currentPowerKw: 48.6, todayKwh: 384.5, todayCost: 2922.20 },
    { id: 'DEPT_CSE', name: 'Computer Science & Engineering', code: 'CSE', hodName: 'Dr. R. K. Gupta', buildingName: 'Main Building', roomsCount: 12, currentPowerKw: 56.2, todayKwh: 442.0, todayCost: 3359.20 },
    { id: 'DEPT_EE', name: 'Electrical Engineering', code: 'EE', hodName: 'Dr. Sulochana Wadhwani', buildingName: 'Main Building', roomsCount: 9, currentPowerKw: 62.4, todayKwh: 498.0, todayCost: 3784.80 },
    { id: 'DEPT_MECH', name: 'Mechanical Engineering', code: 'ME', hodName: 'Dr. M. K. Gaur', buildingName: 'Main Building & Workshop', roomsCount: 14, currentPowerKw: 78.5, todayKwh: 618.0, todayCost: 4696.80 },
    { id: 'DEPT_CHEM', name: 'Chemical Engineering', code: 'CHE', hodName: 'Dr. D. S. Tomar', buildingName: 'Main Building', roomsCount: 6, currentPowerKw: 28.2, todayKwh: 224.0, todayCost: 1702.40 },
    { id: 'DEPT_CIVIL', name: 'Civil Engineering', code: 'CE', hodName: 'Dr. Sanjay Tiwari', buildingName: 'Main Building', roomsCount: 7, currentPowerKw: 24.5, todayKwh: 196.0, todayCost: 1489.60 },
    { id: 'DEPT_ARCH', name: 'Architecture & Planning', code: 'ARCH', hodName: 'Prof. Anjali Patil', buildingName: 'Architecture & Convention Center', roomsCount: 9, currentPowerKw: 36.8, todayKwh: 294.0, todayCost: 2234.40 }
  ];

  const buildings: Building[] = [
    { id: 'MITS_AI_BUILDING', name: 'AI & Data Science Building', code: 'AI-BLOCK', category: 'department', categoryLabel: 'AI & Computing Labs', totalFloors: 2, totalRooms: 12, floorAreaSqM: 3800, monthlyBudgetKwh: 14000, monthlyBudgetCost: 106400, meshName: 'Mesh_AI_Building', centerCoordinates: [0, 8, -40], status: 'normal', currentPowerKw: 48.6, todayEnergyKwh: 384.5, monthEnergyKwh: 11200, todayCost: 2922.20, powerFactor: 0.97 },
    { id: 'MITS_MAIN_BUILDING', name: 'Main Building (Academic & Administrative Complex)', code: 'MAIN-BLDG', category: 'academic', categoryLabel: 'Classrooms, Labs & Governance', totalFloors: 3, totalRooms: 48, floorAreaSqM: 14200, monthlyBudgetKwh: 42000, monthlyBudgetCost: 319200, meshName: 'Mesh_Main_Building', centerCoordinates: [0, 10, 20], status: 'normal', currentPowerKw: 154.2, todayEnergyKwh: 1224.0, monthEnergyKwh: 36800, todayCost: 9302.40, powerFactor: 0.96 },
    { id: 'MITS_WORKSHOP', name: 'Central Mechanical & Production Workshop', code: 'WORKSHOP', category: 'workshop', categoryLabel: 'Heavy Machinery & Production Labs', totalFloors: 1, totalRooms: 6, floorAreaSqM: 2800, monthlyBudgetKwh: 18000, monthlyBudgetCost: 136800, meshName: 'Mesh_Workshop', centerCoordinates: [0, 6, -95], status: 'warning', currentPowerKw: 74.8, todayEnergyKwh: 588.0, monthEnergyKwh: 15200, todayCost: 4468.80, powerFactor: 0.89 },
    { id: 'MITS_LIBRARY', name: 'Central Library', code: 'LIBRARY', category: 'library', categoryLabel: 'Central Knowledge Repository & E-Library', totalFloors: 2, totalRooms: 8, floorAreaSqM: 3200, monthlyBudgetKwh: 9000, monthlyBudgetCost: 68400, meshName: 'Mesh_Library', centerCoordinates: [55, 6, 50], status: 'normal', currentPowerKw: 24.5, todayEnergyKwh: 196.0, monthEnergyKwh: 5880, todayCost: 1489.60, powerFactor: 0.98 },
    { id: 'MITS_ARCH_BUILDING', name: 'Architecture Wing & Convention Center', code: 'ARCH-BLOCK', category: 'architecture', categoryLabel: 'Design Studios & Convention Hall', totalFloors: 2, totalRooms: 14, floorAreaSqM: 4500, monthlyBudgetKwh: 12000, monthlyBudgetCost: 91200, meshName: 'Mesh_Architecture', centerCoordinates: [65, 8, -25], status: 'normal', currentPowerKw: 38.4, todayEnergyKwh: 304.0, monthEnergyKwh: 9120, todayCost: 2310.40, powerFactor: 0.96 },
    { id: 'MITS_HOSTELS', name: 'MITS Student Hostels', code: 'HOSTELS', category: 'hostel', categoryLabel: 'Student Residential Hostels', totalFloors: 3, totalRooms: 96, floorAreaSqM: 6800, monthlyBudgetKwh: 16000, monthlyBudgetCost: 121600, meshName: 'Mesh_Hostels', centerCoordinates: [-85, 8, -10], status: 'normal', currentPowerKw: 58.2, todayEnergyKwh: 462.0, monthEnergyKwh: 13860, todayCost: 3511.20, powerFactor: 0.94 },
    { id: 'MITS_SOLAR_PLANT', name: 'MITS Rooftop Solar Power Plant (350 kWp)', code: 'SOLAR-PV', category: 'solar_plant', categoryLabel: 'Clean Solar Generation & Inverters', totalFloors: 1, totalRooms: 2, floorAreaSqM: 3200, monthlyBudgetKwh: 0, monthlyBudgetCost: 0, meshName: 'Mesh_Solar_Array', centerCoordinates: [0, 16, 20], status: 'normal', currentPowerKw: 215.0, todayEnergyKwh: 1420.0, monthEnergyKwh: 42600, todayCost: -10792.00, powerFactor: 0.99 }
  ];

  const rooms: Room[] = [
    // === AI & Data Science Building ===
    // Ground Floor
    { id: 'ROOM_M001', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M001', name: 'Smart Lecture Hall M001', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 6.8, todayKwh: 54.4, status: 'normal', equipmentInfo: 'Split ACs (x3), Smart Interactive Podium, Projector, LED Panel Lights', occupancy: 42, temperatureC: 23.4, humidityPercent: 48 },
    { id: 'ROOM_M002', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M002', name: 'Classroom M002', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 3.5, todayKwh: 28.0, status: 'normal', equipmentInfo: 'Ceiling Fans (x6), LED Tube Fixtures, Teaching Console', occupancy: 35, temperatureC: 24.8, humidityPercent: 50 },
    { id: 'ROOM_M003', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M003', name: 'Classroom M003', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 3.4, todayKwh: 27.2, status: 'normal', equipmentInfo: 'Ceiling Fans (x6), LED Fixtures, Audio Amplifiers', occupancy: 30, temperatureC: 25.1, humidityPercent: 52 },
    { id: 'ROOM_M004', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M004', name: 'Data Science & Machine Learning Lab M004', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 12.8, todayKwh: 102.4, status: 'high_usage', equipmentInfo: 'GPU Workstations (x35), Inverter ACs (x4), Network Switch Rack', occupancy: 32, temperatureC: 22.0, humidityPercent: 44 },
    { id: 'ROOM_M005', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M005', name: 'Computing Studio M005', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 5.2, todayKwh: 41.6, status: 'normal', equipmentInfo: 'Student Laptops, Projector, AC Units', occupancy: 28, temperatureC: 23.8, humidityPercent: 46 },
    { id: 'ROOM_M007', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'M007', name: 'CIoT Lab (Connected IoT & Embedded Lab)', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 8.6, todayKwh: 68.8, status: 'normal', equipmentInfo: 'IoT Development Benches, Oscilloscopes, ESP32 Testbeds, Workstations', occupancy: 20, temperatureC: 23.0, humidityPercent: 45 },
    { id: 'FAC_AI_01', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'FW-A', name: 'Faculty Cabins (Dr. Manish Dixit, Dr. Aditya Dubey)', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 4.5, todayKwh: 36.0, status: 'normal', equipmentInfo: '1.5 Ton ACs (x3), Desktop PCs, Lighting', occupancy: 3, temperatureC: 22.5, humidityPercent: 47 },
    { id: 'FAC_AI_02', buildingId: 'MITS_AI_BUILDING', floor: 'Ground Floor', roomNumber: 'FW-B', name: 'Faculty Cabins (Dr. Praveen Bansal, Dr. Hemlata Pant)', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 3.8, todayKwh: 30.4, status: 'normal', equipmentInfo: '1.5 Ton ACs (x3), Desktop PCs, Lighting', occupancy: 3, temperatureC: 23.1, humidityPercent: 49 },
    
    // First Floor (AI Building)
    { id: 'ROOM_M101', buildingId: 'MITS_AI_BUILDING', floor: 'First Floor', roomNumber: 'M101', name: 'Cloud Computing & Big Data Lab', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 9.4, todayKwh: 75.2, status: 'normal', equipmentInfo: 'Dell PowerEdge R740 Server Cluster, 30 Thin Clients, Inverter ACs (x3)', occupancy: 26, temperatureC: 21.8, humidityPercent: 42 },
    { id: 'ROOM_M102', buildingId: 'MITS_AI_BUILDING', floor: 'First Floor', roomNumber: 'M102', name: 'AI Capstone & Innovation Project Studio', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 6.2, todayKwh: 49.6, status: 'normal', equipmentInfo: 'Development Pods, Dual Display Stations, Split ACs (x2)', occupancy: 18, temperatureC: 23.2, humidityPercent: 46 },
    { id: 'ROOM_M104', buildingId: 'MITS_AI_BUILDING', floor: 'First Floor', roomNumber: 'M104', name: 'Robotics & Vision Automation Lab', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 7.8, todayKwh: 62.4, status: 'normal', equipmentInfo: 'Robotic Arm Testbed, Stereoscopic Vision Rigs, Workstations', occupancy: 14, temperatureC: 22.8, humidityPercent: 45 },
    { id: 'ROOM_M105', buildingId: 'MITS_AI_BUILDING', floor: 'First Floor', roomNumber: 'M105', name: 'Deep Learning GPU Rack Room', departmentName: 'Artificial Intelligence & Data Science', departmentId: 'DEPT_AI_DS', currentPowerKw: 11.5, todayKwh: 92.0, status: 'high_usage', equipmentInfo: 'NVIDIA DGX A100 Workstation, Precision 24/7 HVAC cooling', occupancy: 2, temperatureC: 19.5, humidityPercent: 40 },

    // === Main Building (Academic Complex) ===
    // Ground Floor
    { id: 'MAIN_DIR_OFFICE', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'ADM-01', name: "Director's Office & Board Room", departmentName: 'Administration', currentPowerKw: 8.4, todayKwh: 67.2, status: 'normal', equipmentInfo: 'Central Cassette ACs (x4), Conference Video Wall, Executive Lighting', occupancy: 8, temperatureC: 22.0, humidityPercent: 48 },
    { id: 'MAIN_ADM_OFFICE', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'ADM-02', name: 'Administrative Office & Accounts Section', departmentName: 'Administration', currentPowerKw: 9.6, todayKwh: 76.8, status: 'normal', equipmentInfo: 'Office Workstations (x16), Printers, Split ACs, Document Scanners', occupancy: 18, temperatureC: 23.5, humidityPercent: 50 },
    { id: 'MAIN_SH_01', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'SH-01', name: 'Seminar Hall - 1', departmentName: 'Electrical Engineering', departmentId: 'DEPT_EE', currentPowerKw: 11.2, todayKwh: 89.6, status: 'normal', equipmentInfo: 'Ductable AC Units (x2), Stage Floodlights, Sound System, 150 Seats', occupancy: 95, temperatureC: 22.8, humidityPercent: 49 },
    { id: 'MAIN_SH_02', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'SH-02', name: 'Seminar Hall - 2', departmentName: 'Computer Science & Engineering', departmentId: 'DEPT_CSE', currentPowerKw: 9.8, todayKwh: 78.4, status: 'normal', equipmentInfo: 'Air Conditioners, Dual Projector Screens, PA System', occupancy: 60, temperatureC: 23.0, humidityPercent: 51 },
    { id: 'MAIN_CONCLAVE', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'CC-01', name: 'Conclave Centre & Main Foyer', departmentName: 'Administration', currentPowerKw: 14.5, todayKwh: 116.0, status: 'normal', equipmentInfo: 'High-bay LED Lighting, Reception Display Screens, ACs', occupancy: 40, temperatureC: 24.0, humidityPercent: 52 },
    { id: 'MAIN_EE_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'E006', name: 'Electrical Engineering Lab (E006) & DEEE Lab', departmentName: 'Electrical Engineering', departmentId: 'DEPT_EE', currentPowerKw: 22.4, todayKwh: 179.2, status: 'high_usage', equipmentInfo: '3-Phase Motor Test Benches, Transformers, Rectifiers, Induction Motors', occupancy: 24, temperatureC: 25.5, humidityPercent: 54 },
    { id: 'MAIN_CHEM_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'E025', name: 'Chemical Engineering Lab (E025) & Environmental Lab', departmentName: 'Chemical Engineering', departmentId: 'DEPT_CHEM', currentPowerKw: 16.8, todayKwh: 134.4, status: 'normal', equipmentInfo: 'Fume Hoods, Distillation Columns, Heating Baths, Stirrers', occupancy: 16, temperatureC: 24.2, humidityPercent: 50 },
    { id: 'MAIN_FM_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'Ground Floor', roomNumber: 'E012', name: 'Fluid Mechanics & Hydraulic Machines Lab', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 14.2, todayKwh: 113.6, status: 'normal', equipmentInfo: 'Pelton Turbine Test Rig, Francis Turbine, Centrifugal Pumps', occupancy: 20, temperatureC: 25.0, humidityPercent: 53 },

    // First Floor (Main Building)
    { id: 'MAIN_SH_03', buildingId: 'MITS_MAIN_BUILDING', floor: 'First Floor', roomNumber: 'SH-03', name: 'Seminar Hall - 3', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 10.5, todayKwh: 84.0, status: 'normal', equipmentInfo: 'Air Conditioners, Projection Setup, 120 Seats', occupancy: 70, temperatureC: 23.1, humidityPercent: 49 },
    { id: 'MAIN_SH_04', buildingId: 'MITS_MAIN_BUILDING', floor: 'First Floor', roomNumber: 'SH-04', name: 'Seminar Hall - 4', departmentName: 'Chemical Engineering', departmentId: 'DEPT_CHEM', currentPowerKw: 8.6, todayKwh: 68.8, status: 'normal', equipmentInfo: 'Split ACs (x3), Audio Podium, Ceiling Fans', occupancy: 45, temperatureC: 23.6, humidityPercent: 51 },
    { id: 'MAIN_CAD_CAM_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'First Floor', roomNumber: 'E014', name: 'CAD/CAM Lab', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 18.5, todayKwh: 148.0, status: 'high_usage', equipmentInfo: 'High-Performance Workstations (x40), CNC Simulator, 3D Printers', occupancy: 38, temperatureC: 22.4, humidityPercent: 46 },
    { id: 'MAIN_CS_LAB1', buildingId: 'MITS_MAIN_BUILDING', floor: 'First Floor', roomNumber: 'E102', name: 'Computer Systems Architecture Lab', departmentName: 'Computer Science & Engineering', departmentId: 'DEPT_CSE', currentPowerKw: 8.2, todayKwh: 65.6, status: 'normal', equipmentInfo: 'Core i7 Workstations (x30), AC Units (x2), Projector', occupancy: 28, temperatureC: 23.5, humidityPercent: 47 },
    { id: 'MAIN_PE_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'First Floor', roomNumber: 'E108', name: 'Power Electronics & Drives Lab', departmentName: 'Electrical Engineering', departmentId: 'DEPT_EE', currentPowerKw: 13.8, todayKwh: 110.4, status: 'normal', equipmentInfo: 'Inverter Benches, Thyristor Drives, Digital Storage Oscilloscopes', occupancy: 18, temperatureC: 24.8, humidityPercent: 50 },

    // Second Floor (Main Building)
    { id: 'MAIN_SH_06', buildingId: 'MITS_MAIN_BUILDING', floor: 'Second Floor', roomNumber: 'SH-06', name: 'Seminar Hall - 6', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 9.2, todayKwh: 73.6, status: 'normal', equipmentInfo: 'AC Units, Stage Lighting, Audio Console', occupancy: 50, temperatureC: 23.4, humidityPercent: 48 },
    { id: 'MAIN_SH_12', buildingId: 'MITS_MAIN_BUILDING', floor: 'Second Floor', roomNumber: 'SH-12', name: 'Seminar Hall - 12', departmentName: 'Civil Engineering', departmentId: 'DEPT_CIVIL', currentPowerKw: 8.5, todayKwh: 68.0, status: 'normal', equipmentInfo: 'Air Conditioners, Projector, 100 Seats', occupancy: 35, temperatureC: 23.8, humidityPercent: 50 },
    { id: 'MAIN_MOOC', buildingId: 'MITS_MAIN_BUILDING', floor: 'Second Floor', roomNumber: 'MOOC-01', name: 'MOOC Center & E-Learning Studio', departmentName: 'Computer Science & Engineering', departmentId: 'DEPT_CSE', currentPowerKw: 6.8, todayKwh: 54.4, status: 'normal', equipmentInfo: 'Studio Recording Lights, Soundproofing HVAC, Video Editing Stations', occupancy: 6, temperatureC: 21.5, humidityPercent: 44 },
    { id: 'MAIN_VLSI_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'Second Floor', roomNumber: 'E204', name: 'VLSI & Embedded Systems Research Lab', departmentName: 'Electrical Engineering', departmentId: 'DEPT_EE', currentPowerKw: 9.8, todayKwh: 78.4, status: 'normal', equipmentInfo: 'Cadence Design Suites, FPGA Boards, Logic Analyzers, ACs', occupancy: 15, temperatureC: 22.6, humidityPercent: 45 },
    { id: 'MAIN_CYBER_LAB', buildingId: 'MITS_MAIN_BUILDING', floor: 'Second Floor', roomNumber: 'E210', name: 'Cyber Security & Network Defense Lab', departmentName: 'Computer Science & Engineering', departmentId: 'DEPT_CSE', currentPowerKw: 11.2, todayKwh: 89.6, status: 'normal', equipmentInfo: 'Network Packet Sniffers, Security Testing Pods, ACs (x3)', occupancy: 24, temperatureC: 22.0, humidityPercent: 43 },

    // === Central Library ===
    // Ground Floor
    { id: 'LIB_G01', buildingId: 'MITS_LIBRARY', floor: 'Ground Floor', roomNumber: 'LIB-G01', name: 'Circulation Desk & Periodicals Section', departmentName: 'Library Services', currentPowerKw: 5.6, todayKwh: 44.8, status: 'normal', equipmentInfo: 'RFID Gates, Catalog Kiosks, High Bay Lights, Split ACs (x2)', occupancy: 35, temperatureC: 24.0, humidityPercent: 49 },
    { id: 'LIB_G02', buildingId: 'MITS_LIBRARY', floor: 'Ground Floor', roomNumber: 'LIB-G02', name: 'Digital E-Library & Internet Lab', departmentName: 'Library Services', currentPowerKw: 8.4, todayKwh: 67.2, status: 'normal', equipmentInfo: 'Desktop Terminals (x40), D-Link Core Switches, AC Units (x2)', occupancy: 28, temperatureC: 23.1, humidityPercent: 47 },
    // First Floor
    { id: 'LIB_F01', buildingId: 'MITS_LIBRARY', floor: 'First Floor', roomNumber: 'LIB-F01', name: 'Central Reference & Research Thesis Section', departmentName: 'Library Services', currentPowerKw: 4.8, todayKwh: 38.4, status: 'normal', equipmentInfo: 'Energy Efficient LED Tubes, Silent Ceiling Fans (x8), Research Terminals', occupancy: 20, temperatureC: 24.5, humidityPercent: 50 },
    { id: 'LIB_F02', buildingId: 'MITS_LIBRARY', floor: 'First Floor', roomNumber: 'LIB-F02', name: 'Quiet Study Hall & Scholar Carrels', departmentName: 'Library Services', currentPowerKw: 5.7, todayKwh: 45.6, status: 'normal', equipmentInfo: 'Individual Reading Lamp Fixtures, Split ACs (x2)', occupancy: 45, temperatureC: 23.5, humidityPercent: 48 },

    // === Central Mechanical Workshop ===
    // Ground Floor
    { id: 'WS_01', buildingId: 'MITS_WORKSHOP', floor: 'Ground Floor', roomNumber: 'WS-01', name: 'Machine Shop (Heavy Lathes & Shapers)', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 32.5, todayKwh: 260.0, status: 'high_usage', equipmentInfo: 'Center Lathes (x12), Universal Milling Machine, Heavy Exhaust', occupancy: 30, temperatureC: 28.5, humidityPercent: 45 },
    { id: 'WS_02', buildingId: 'MITS_WORKSHOP', floor: 'Ground Floor', roomNumber: 'WS-02', name: 'Welding & Foundry Section', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 24.8, todayKwh: 198.4, status: 'normal', equipmentInfo: 'TIG/MIG Arc Welders, Induction Melting Crucible, Exhaust Fans', occupancy: 18, temperatureC: 30.2, humidityPercent: 42 },
    { id: 'WS_03', buildingId: 'MITS_WORKSHOP', floor: 'Ground Floor', roomNumber: 'WS-03', name: 'CNC Fabrication & Rapid Prototyping Cell', departmentName: 'Mechanical Engineering', departmentId: 'DEPT_MECH', currentPowerKw: 17.5, todayKwh: 140.0, status: 'normal', equipmentInfo: 'CNC Wire EDM, 4-Axis CNC Turning Center, Air Compressor', occupancy: 12, temperatureC: 24.0, humidityPercent: 48 },

    // === Architecture Wing & Convention Center ===
    // Ground Floor
    { id: 'ARCH_EXHIBITION', buildingId: 'MITS_ARCH_BUILDING', floor: 'Ground Floor', roomNumber: 'EXH-01', name: 'Architecture Exhibition Centre & Convention Hall', departmentName: 'Architecture & Planning', departmentId: 'DEPT_ARCH', currentPowerKw: 15.2, todayKwh: 121.6, status: 'normal', equipmentInfo: 'Spotlight Display Arrays, Central Air Conditioning, AV Rig', occupancy: 50, temperatureC: 23.0, humidityPercent: 48 },
    { id: 'ARCH_CANTEEN', buildingId: 'MITS_ARCH_BUILDING', floor: 'Ground Floor', roomNumber: 'CANTEEN', name: 'Campus Dining & Food Court', departmentName: 'Administration', currentPowerKw: 14.7, todayKwh: 117.6, status: 'normal', equipmentInfo: 'Refrigeration, Exhaust Blowers, Induction Cookers, Dining Hall Lighting', occupancy: 85, temperatureC: 26.5, humidityPercent: 55 },
    // First Floor
    { id: 'ARCH_STUDIO_01', buildingId: 'MITS_ARCH_BUILDING', floor: 'First Floor', roomNumber: 'STUDIO-1', name: 'Architecture Design Studio 1 & 2', departmentName: 'Architecture & Planning', departmentId: 'DEPT_ARCH', currentPowerKw: 8.5, todayKwh: 68.0, status: 'normal', equipmentInfo: 'Drafting Table Task Lights, Workstations, Ceiling Fans', occupancy: 35, temperatureC: 24.2, humidityPercent: 50 },

    // === Hostels ===
    // Ground Floor
    { id: 'HST_G01', buildingId: 'MITS_HOSTELS', floor: 'Ground Floor', roomNumber: 'HST-MESS', name: 'Hostel Dining Hall & Mess', departmentName: 'Student Hostels', currentPowerKw: 18.2, todayKwh: 145.6, status: 'normal', equipmentInfo: 'Commercial Refrigerators, High-Speed Ceiling Fans, Lighting', occupancy: 110, temperatureC: 26.0, humidityPercent: 53 },
    // First Floor
    { id: 'HST_F01', buildingId: 'MITS_HOSTELS', floor: 'First Floor', roomNumber: 'HST-W1', name: 'Boys Hostel Wing A (Rooms 101-125)', departmentName: 'Student Hostels', currentPowerKw: 21.4, todayKwh: 171.2, status: 'normal', equipmentInfo: 'Student Room Fans, Study Lamps, Corridor Lighting', occupancy: 75, temperatureC: 25.4, humidityPercent: 51 },
    // Second Floor
    { id: 'HST_S01', buildingId: 'MITS_HOSTELS', floor: 'Second Floor', roomNumber: 'HST-W2', name: 'Boys Hostel Wing B (Rooms 201-225)', departmentName: 'Student Hostels', currentPowerKw: 18.6, todayKwh: 148.8, status: 'normal', equipmentInfo: 'Student Room Fans, Common Room TV & Inverter backup', occupancy: 68, temperatureC: 25.8, humidityPercent: 52 }
  ];

  // ======================== APPLIANCES SEED GENERATION ========================
  const appliances: Appliance[] = [];
  const schedules: ApplianceSchedule[] = [];

  rooms.forEach(r => {
    const b = buildings.find(bld => bld.id === r.buildingId);
    const buildingName = b?.name || 'MITS Building';

    if (r.id === 'ROOM_M004') {
      // Data Science & ML Lab M004 (Detailed Granular Appliances)
      appliances.push(
        {
          id: 'APP_M004_AC1',
          name: '2.0 Ton Inverter AC #1 (North Window)',
          code: 'AC-M004-01',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1850,
          nominalWatts: 1850,
          voltage: 232,
          currentAmps: 8.0,
          runtimeHoursToday: 6.4,
          todayKwh: 11.84,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-RLY1',
          lastCommandTime: new Date(Date.now() - 3600000).toISOString(),
          lastCommandStatus: 'success',
          lastCommandUser: 'facility@mits.ac.in'
        },
        {
          id: 'APP_M004_AC2',
          name: '2.0 Ton Inverter AC #2 (South Window)',
          code: 'AC-M004-02',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1850,
          nominalWatts: 1850,
          voltage: 231,
          currentAmps: 8.0,
          runtimeHoursToday: 6.4,
          todayKwh: 11.84,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-RLY2',
          lastCommandTime: new Date(Date.now() - 3600000).toISOString(),
          lastCommandStatus: 'success'
        },
        {
          id: 'APP_M004_AC3',
          name: '2.0 Ton Inverter AC #3 (Center)',
          code: 'AC-M004-03',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1800,
          nominalWatts: 1800,
          voltage: 230,
          currentAmps: 7.8,
          runtimeHoursToday: 6.2,
          todayKwh: 11.16,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-RLY3'
        },
        {
          id: 'APP_M004_AC4',
          name: '2.0 Ton Inverter AC #4 (Rear Cluster)',
          code: 'AC-M004-04',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1900,
          nominalWatts: 1900,
          voltage: 231,
          currentAmps: 8.2,
          runtimeHoursToday: 6.4,
          todayKwh: 12.16,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-RLY4'
        },
        {
          id: 'APP_M004_GPU1',
          name: 'NVIDIA RTX Workstation Cluster A (18 Units)',
          code: 'PC-M004-GPUA',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'computer',
          status: 'on',
          powerWatts: 2700,
          nominalWatts: 2700,
          voltage: 230,
          currentAmps: 11.7,
          runtimeHoursToday: 5.8,
          todayKwh: 15.66,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-PDU-M004-BANK1'
        },
        {
          id: 'APP_M004_GPU2',
          name: 'NVIDIA RTX Workstation Cluster B (17 Units)',
          code: 'PC-M004-GPUB',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'computer',
          status: 'on',
          powerWatts: 2124,
          nominalWatts: 2124,
          voltage: 230,
          currentAmps: 9.2,
          runtimeHoursToday: 5.8,
          todayKwh: 12.32,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-PDU-M004-BANK2'
        },
        {
          id: 'APP_M004_LIGHTS',
          name: 'Dimmable Recessed LED Panels (16x 36W)',
          code: 'LT-M004-ALL',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'light',
          status: 'on',
          powerWatts: 576,
          nominalWatts: 576,
          voltage: 230,
          currentAmps: 2.5,
          runtimeHoursToday: 7.2,
          todayKwh: 4.15,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-DIM'
        },
        {
          id: 'APP_M004_PROJ',
          name: 'Interactive Laser 4K Projector',
          code: 'PRJ-M004-01',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'projector',
          status: 'off',
          powerWatts: 0,
          nominalWatts: 380,
          voltage: 230,
          currentAmps: 0,
          runtimeHoursToday: 2.1,
          todayKwh: 0.80,
          isControllable: true,
          connectionStatus: 'standby',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M004-PRJ'
        }
      );

      // Add a schedule for M004
      schedules.push({
        id: 'SCHED_M004_NIGHT',
        name: 'Auto Lab Idle Cutoff (Night)',
        applianceId: 'APP_M004_AC1',
        applianceName: '2.0 Ton Inverter AC #1',
        roomId: r.id,
        roomNumber: r.roomNumber,
        buildingId: r.buildingId,
        buildingName,
        startTime: '20:30',
        endTime: '07:30',
        daysOfWeek: [1, 2, 3, 4, 5, 6],
        action: 'auto_power_cut',
        targetState: 'off',
        isActive: true,
        lastTriggered: 'Yesterday at 20:30'
      });
    } else if (r.id === 'ROOM_M001') {
      // Smart Lecture Hall M001
      appliances.push(
        {
          id: 'APP_M001_AC1',
          name: '1.5 Ton Split AC #1 (Stage)',
          code: 'AC-M001-01',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1500,
          nominalWatts: 1500,
          voltage: 230,
          currentAmps: 6.5,
          runtimeHoursToday: 5.5,
          todayKwh: 8.25,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-AC1'
        },
        {
          id: 'APP_M001_AC2',
          name: '1.5 Ton Split AC #2 (Center)',
          code: 'AC-M001-02',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1500,
          nominalWatts: 1500,
          voltage: 230,
          currentAmps: 6.5,
          runtimeHoursToday: 5.5,
          todayKwh: 8.25,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-AC2'
        },
        {
          id: 'APP_M001_AC3',
          name: '1.5 Ton Split AC #3 (Rear)',
          code: 'AC-M001-03',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'ac',
          status: 'on',
          powerWatts: 1500,
          nominalWatts: 1500,
          voltage: 230,
          currentAmps: 6.5,
          runtimeHoursToday: 5.5,
          todayKwh: 8.25,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-AC3'
        },
        {
          id: 'APP_M001_FANS',
          name: 'Ceiling Fan Array (6x 75W BLDC)',
          code: 'FAN-M001-ALL',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'fan',
          status: 'on',
          powerWatts: 450,
          nominalWatts: 450,
          voltage: 230,
          currentAmps: 2.0,
          runtimeHoursToday: 6.0,
          todayKwh: 2.70,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-FAN'
        },
        {
          id: 'APP_M001_PROJ',
          name: 'Smart Interactive Podium Projector',
          code: 'PRJ-M001-01',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'projector',
          status: 'on',
          powerWatts: 420,
          nominalWatts: 420,
          voltage: 230,
          currentAmps: 1.8,
          runtimeHoursToday: 4.5,
          todayKwh: 1.89,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-PRJ'
        },
        {
          id: 'APP_M001_LIGHTS',
          name: 'Lecture Hall LED Light Arrays (12x 36W)',
          code: 'LT-M001-ALL',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'light',
          status: 'on',
          powerWatts: 432,
          nominalWatts: 432,
          voltage: 230,
          currentAmps: 1.9,
          runtimeHoursToday: 6.0,
          todayKwh: 2.59,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-LT'
        },
        {
          id: 'APP_M001_PODIUM',
          name: 'Smart Teacher Console & PA Amplifier',
          code: 'PC-M001-POD',
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'computer',
          status: 'on',
          powerWatts: 350,
          nominalWatts: 350,
          voltage: 230,
          currentAmps: 1.5,
          runtimeHoursToday: 5.0,
          todayKwh: 1.75,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: 'MITS-ESP32-M001-POD'
        }
      );
    } else {
      // Standard room equipment generation based on room name/type
      const isLab = r.name.toLowerCase().includes('lab') || r.name.toLowerCase().includes('studio');
      const isAuditorium = r.name.toLowerCase().includes('seminar') || r.name.toLowerCase().includes('hall') || r.name.toLowerCase().includes('conclave');
      const isWorkshop = r.buildingId === 'MITS_WORKSHOP';

      // 1. Air Conditioning / Cooling
      if (!isWorkshop) {
        const acCount = isAuditorium ? 3 : isLab ? 2 : 1;
        for (let i = 1; i <= acCount; i++) {
          const power = isAuditorium ? 2200 : 1600;
          const status = r.status === 'off' ? 'off' : (i <= 2 ? 'on' : 'off');
          appliances.push({
            id: `APP_${r.id}_AC_${i}`,
            name: `${isAuditorium ? 'Ductable Packaged AC' : '1.5 Ton Split AC'} #${i}`,
            code: `AC-${r.roomNumber}-${i}`,
            roomId: r.id,
            roomNumber: r.roomNumber,
            buildingId: r.buildingId,
            buildingName,
            floor: r.floor,
            departmentId: r.departmentId,
            departmentName: r.departmentName,
            type: 'ac',
            status,
            powerWatts: status === 'on' ? power : 0,
            nominalWatts: power,
            voltage: 230,
            currentAmps: status === 'on' ? +(power / 230).toFixed(1) : 0,
            runtimeHoursToday: status === 'on' ? +(4 + Math.random() * 3).toFixed(1) : 1.2,
            todayKwh: +(power * 5 / 1000).toFixed(1),
            isControllable: true,
            connectionStatus: 'online',
            isSimulated: true,
            hardwareDeviceId: `MITS-ESP32-${r.roomNumber}-AC${i}`
          });
        }
      }

      // 2. Lighting
      const lightWatts = isAuditorium ? 650 : isLab ? 480 : 320;
      appliances.push({
        id: `APP_${r.id}_LIGHT`,
        name: `${r.name} - Overhead LED Panels`,
        code: `LT-${r.roomNumber}`,
        roomId: r.id,
        roomNumber: r.roomNumber,
        buildingId: r.buildingId,
        buildingName,
        floor: r.floor,
        departmentId: r.departmentId,
        departmentName: r.departmentName,
        type: 'light',
        status: r.status === 'off' ? 'off' : 'on',
        powerWatts: r.status === 'off' ? 0 : lightWatts,
        nominalWatts: lightWatts,
        voltage: 230,
        currentAmps: +(lightWatts / 230).toFixed(1),
        runtimeHoursToday: 6.5,
        todayKwh: +(lightWatts * 6.5 / 1000).toFixed(1),
        isControllable: true,
        connectionStatus: 'online',
        isSimulated: true,
        hardwareDeviceId: `MITS-ESP32-${r.roomNumber}-LT`
      });

      // 3. Ceiling Fans
      const fanWatts = 75 * 4; // 300W
      appliances.push({
        id: `APP_${r.id}_FANS`,
        name: `Ceiling Fan Bank (4x 75W)`,
        code: `FAN-${r.roomNumber}`,
        roomId: r.id,
        roomNumber: r.roomNumber,
        buildingId: r.buildingId,
        buildingName,
        floor: r.floor,
        departmentId: r.departmentId,
        departmentName: r.departmentName,
        type: 'fan',
        status: 'on',
        powerWatts: fanWatts,
        nominalWatts: fanWatts,
        voltage: 230,
        currentAmps: +(fanWatts / 230).toFixed(1),
        runtimeHoursToday: 7.0,
        todayKwh: +(fanWatts * 7 / 1000).toFixed(1),
        isControllable: true,
        connectionStatus: 'online',
        isSimulated: true,
        hardwareDeviceId: `MITS-ESP32-${r.roomNumber}-FAN`
      });

      // 4. Projector or Presentation System
      if (isAuditorium || isLab || r.name.toLowerCase().includes('classroom') || r.name.toLowerCase().includes('hall')) {
        appliances.push({
          id: `APP_${r.id}_PRJ`,
          name: isAuditorium ? 'High-Lumen Presentation Projector' : 'Classroom Projector Unit',
          code: `PRJ-${r.roomNumber}`,
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'projector',
          status: 'off',
          powerWatts: 0,
          nominalWatts: 380,
          voltage: 230,
          currentAmps: 0,
          runtimeHoursToday: 2.5,
          todayKwh: 0.95,
          isControllable: true,
          connectionStatus: 'standby',
          isSimulated: true,
          hardwareDeviceId: `MITS-ESP32-${r.roomNumber}-PRJ`
        });
      }

      // 5. Workstations / Lab Computers / Heavy Machinery
      if (isWorkshop) {
        appliances.push({
          id: `APP_${r.id}_MACH`,
          name: 'Heavy Industrial Motor & Machine Feeder',
          code: `MC-${r.roomNumber}`,
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'machinery',
          status: 'on',
          powerWatts: 18500,
          nominalWatts: 25000,
          voltage: 415,
          currentAmps: 28.5,
          runtimeHoursToday: 5.2,
          todayKwh: 96.2,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: `MITS-MCCB-${r.roomNumber}-FEEDER`
        });
      } else if (isLab) {
        appliances.push({
          id: `APP_${r.id}_COMP`,
          name: 'Student Computing Stations Array',
          code: `PC-${r.roomNumber}`,
          roomId: r.id,
          roomNumber: r.roomNumber,
          buildingId: r.buildingId,
          buildingName,
          floor: r.floor,
          departmentId: r.departmentId,
          departmentName: r.departmentName,
          type: 'computer',
          status: 'on',
          powerWatts: 2400,
          nominalWatts: 3000,
          voltage: 230,
          currentAmps: 10.4,
          runtimeHoursToday: 5.5,
          todayKwh: 13.2,
          isControllable: true,
          connectionStatus: 'online',
          isSimulated: true,
          hardwareDeviceId: `MITS-PDU-${r.roomNumber}-BANK`
        });
      }
    }
  });

  // Devices
  const devices: Device[] = [];
  const now = new Date().toISOString();
  buildings.forEach(b => {
    if (b.category === 'solar_plant') {
      devices.push({ id: `DEV_${b.code}_INVERTER`, name: `${b.name} - Solar Inverter`, type: 'power_analyzer', buildingId: b.id, buildingName: b.name, status: 'online', lastSeen: now, lastReading: b.currentPowerKw, firmwareVersion: 'v3.2.1', isSimulated: true });
    } else {
      devices.push({ id: `DEV_${b.code}_METER`, name: `${b.name} - Main Feeder Meter`, type: 'smart_meter', buildingId: b.id, buildingName: b.name, status: 'online', lastSeen: now, lastReading: b.currentPowerKw, firmwareVersion: 'v2.1.0', isSimulated: true });
      devices.push({ id: `DEV_${b.code}_ENV`, name: `${b.name} - Ambient Sensor Unit`, type: 'env_sensor', buildingId: b.id, buildingName: b.name, status: 'online', lastSeen: now, firmwareVersion: 'v1.4.2', isSimulated: true });
    }
  });

  // Alerts
  const alerts: Alert[] = [
    { id: 'ALERT_001', type: 'high_consumption', severity: 'warning', status: 'active', title: 'High Power in CAD/CAM Lab', description: 'Room E014 consuming 18.5 kW — above 15 kW threshold', buildingId: 'MITS_MAIN_BUILDING', buildingName: 'Main Building', roomId: 'MAIN_CAD_CAM_LAB', roomName: 'CAD/CAM Lab', value: 18.5, threshold: 15, timestamp: new Date(Date.now() - 3600000).toISOString(), isSimulated: true },
    { id: 'ALERT_002', type: 'high_consumption', severity: 'critical', status: 'active', title: 'Critical Load in EE Lab', description: 'Electrical Engineering Lab drawing 22.4 kW — 3-phase motor benches running simultaneously', buildingId: 'MITS_MAIN_BUILDING', buildingName: 'Main Building', roomId: 'MAIN_EE_LAB', roomName: 'EE Lab E006', value: 22.4, threshold: 20, timestamp: new Date(Date.now() - 1800000).toISOString(), isSimulated: true },
    { id: 'ALERT_003', type: 'power_factor', severity: 'warning', status: 'acknowledged', title: 'Low Power Factor — Workshop', description: 'Workshop power factor at 0.89 — heavy inductive loads detected', buildingId: 'MITS_WORKSHOP', buildingName: 'Workshop', value: 0.89, threshold: 0.92, timestamp: new Date(Date.now() - 7200000).toISOString(), acknowledgedAt: new Date(Date.now() - 5400000).toISOString(), isSimulated: true },
    { id: 'ALERT_004', type: 'high_consumption', severity: 'warning', status: 'active', title: 'Unoccupied Room Energy Wastage', description: 'Room M004 consuming 12.8 kW with all 4 ACs & GPU stations running while occupancy is 0 during recess', buildingId: 'MITS_AI_BUILDING', buildingName: 'AI Building', roomId: 'ROOM_M004', roomName: 'Data Science & Machine Learning Lab M004', value: 12.8, threshold: 8.0, timestamp: new Date(Date.now() - 900000).toISOString(), isSimulated: true }
  ];

  // Measurement & Verification (M&V) Optimization Records
  const savingsVerifications: SavingsVerificationRecord[] = [
    {
      id: 'SAV_VERIF_001',
      title: 'AI Department Smart Occupancy & Inverter HVAC Retrofit',
      facilityName: 'AI & Data Science Building (M001-M007)',
      buildingId: 'MITS_AI_BUILDING',
      stage: 'verified',
      baselinePeriod: 'August – September 2025 (Pre-retrofit)',
      baselineKwh: 14800,
      postOptimizationKwh: 11200,
      savingsKwh: 3600,
      costSavingsINR: 27360,
      co2ReductionKg: 2952,
      methodology: 'IPMVP Option B (Sub-metering isolation with weather normalization)',
      approvedBy: 'Dr. Manish Dixit (Head, AI & DS)',
      approvedAt: '2025-11-15T10:30:00Z',
      status: 'verified',
      evidenceNotes: 'Verified against 60-day sub-meter logs. Dual split-AC schedules enforced via IoT timers.'
    },
    {
      id: 'SAV_VERIF_002',
      title: 'Central Library E-Learning Floor LED Relamping & Motion Triggers',
      facilityName: 'Central Library E-Reading Hall',
      buildingId: 'MITS_LIBRARY',
      stage: 'measured',
      baselinePeriod: 'October 2025',
      baselineKwh: 7400,
      postOptimizationKwh: 5880,
      savingsKwh: 1520,
      costSavingsINR: 11552,
      co2ReductionKg: 1246,
      methodology: 'IPMVP Option A (Partially measured lighting retrofit)',
      approvedBy: 'Facility Maintenance Officer',
      approvedAt: '2025-12-01T14:00:00Z',
      status: 'under_review',
      evidenceNotes: 'Replacement of 72W fluorescent tubes with 28W smart dimmable LED fixtures. Post-installation logging active.'
    },
    {
      id: 'SAV_VERIF_003',
      title: 'Mechanical Workshop APFC Automatic Capacitor Bank Balancing',
      facilityName: 'Central Workshop Machine Shop',
      buildingId: 'MITS_WORKSHOP',
      stage: 'estimated',
      baselinePeriod: 'Current Active Baseline (Nov 2025)',
      baselineKwh: 15200,
      postOptimizationKwh: 13380,
      savingsKwh: 1820,
      costSavingsINR: 13832,
      co2ReductionKg: 1492,
      methodology: 'Power Factor Correction Simulation (Target PF 0.98)',
      status: 'active',
      evidenceNotes: 'Projected reduction in kVAh reactive energy penalties under MPPKVVCL HT tariff clause 4.2.'
    }
  ];

  // Environmental Zones
  const environmentalZones: EnvironmentalZone[] = [
    {
      id: 'ENV_ZONE_01',
      name: 'AI High Performance GPU Lab (M004)',
      buildingName: 'AI & Data Science Building',
      temperatureC: 22.1,
      humidityPercent: 44.5,
      co2Ppm: 520,
      iaqIndex: 42,
      sensorStatus: 'calibrated',
      lastReadingTime: now
    },
    {
      id: 'ENV_ZONE_02',
      name: 'Central Library Reading Hall (First Floor)',
      buildingName: 'Central Library',
      temperatureC: 24.3,
      humidityPercent: 48.0,
      co2Ppm: 460,
      iaqIndex: 35,
      sensorStatus: 'calibrated',
      lastReadingTime: now
    },
    {
      id: 'ENV_ZONE_03',
      name: 'Seminar Hall 1 Foyer',
      buildingName: 'Main Building Complex',
      temperatureC: 25.0,
      humidityPercent: 51.2,
      co2Ppm: 680,
      iaqIndex: 65,
      sensorStatus: 'calibrated',
      lastReadingTime: now
    },
    {
      id: 'ENV_ZONE_04',
      name: 'Mechanical Workshop Production Floor',
      buildingName: 'Central Workshop',
      temperatureC: 28.6,
      humidityPercent: 42.0,
      co2Ppm: 590,
      iaqIndex: 88,
      sensorStatus: 'calibrated',
      lastReadingTime: now
    }
  ];

  // 4 Pre-Configured Seed Users for the 4 Roles
  const adminHash = await hashPassword('Admin@123');
  const facilityHash = await hashPassword('Facility@123');
  const hodHash = await hashPassword('Hod@123');
  const viewerHash = await hashPassword('Viewer@123');

  const users: RegisteredUser[] = [
    {
      id: 'USER_SUPER_ADMIN_001',
      name: 'Prof. R. S. Jadon (Super Admin)',
      email: 'admin@mits.ac.in',
      passwordHash: adminHash,
      role: 'super_admin',
      roleTitle: 'Super Administrator',
      campusId: 'CAMPUS_MITS_GWALIOR',
      createdAt: now,
      lastLogin: now
    },
    {
      id: 'USER_FACILITY_001',
      name: 'Er. Rajesh Sharma (Facility Manager)',
      email: 'facility@mits.ac.in',
      passwordHash: facilityHash,
      role: 'facility_manager',
      roleTitle: 'Chief Campus Facility Manager',
      campusId: 'CAMPUS_MITS_GWALIOR',
      createdAt: now,
      lastLogin: now
    },
    {
      id: 'USER_HOD_AIDS_001',
      name: 'Dr. Manish Dixit (Head, AI & DS)',
      email: 'hod.aids@mits.ac.in',
      passwordHash: hodHash,
      role: 'department_hod',
      roleTitle: 'Head of Department — AI & Data Science',
      departmentId: 'DEPT_AI_DS',
      departmentName: 'Artificial Intelligence & Data Science',
      campusId: 'CAMPUS_MITS_GWALIOR',
      createdAt: now,
      lastLogin: now
    },
    {
      id: 'USER_VIEWER_001',
      name: 'Academic Auditor / Student Viewer',
      email: 'viewer@mits.ac.in',
      passwordHash: viewerHash,
      role: 'viewer',
      roleTitle: 'Authorized Campus Viewer',
      campusId: 'CAMPUS_MITS_GWALIOR',
      createdAt: now,
      lastLogin: now
    }
  ];

  const seedData: MITSDatabase = {
    collegeName: 'Madhav Institute of Technology & Science (MITS), Gwalior',
    campusLocation: 'Gola Ka Mandir, Gwalior, Madhya Pradesh - 474005',
    organizations: [
      {
        id: 'ORG_MITS',
        name: 'Scindia Engineering College Society',
        code: 'SECS',
        campuses: []
      }
    ],
    campuses: [
      {
        id: 'CAMPUS_MITS_GWALIOR',
        organizationId: 'ORG_MITS',
        name: 'MITS Gwalior Main Campus',
        code: 'MITS-MAIN',
        location: 'Gola Ka Mandir, Gwalior (M.P.)',
        totalAreaSqM: 185000,
        contractedDemandKva: 500,
        solarCapacityKwp: 350,
        isDefault: true
      },
      {
        id: 'CAMPUS_TECH_PARK',
        organizationId: 'ORG_MITS',
        name: 'MITS Innovation & Research Park',
        code: 'MITS-IRP',
        location: 'Industrial Area, Malanpur (M.P.)',
        totalAreaSqM: 92000,
        contractedDemandKva: 300,
        solarCapacityKwp: 180,
        isDefault: false
      }
    ],
    activeCampusId: 'CAMPUS_MITS_GWALIOR',
    users,
    buildings,
    rooms,
    appliances,
    schedules,
    energyReadings: [
      {
        id: 'ER_SEED_01',
        meterId: 'DEV_MAIN-BLDG_METER',
        meterName: 'Main Academic Block Primary HT Feeder',
        buildingId: 'MITS_MAIN_BUILDING',
        buildingName: 'Main Building',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        powerKw: 154.2,
        energyKwh: 1224.0,
        voltage: 415.2,
        currentAmps: 214.5,
        powerFactor: 0.96,
        frequencyHz: 50.0,
        dataSource: 'sensor',
        qualityStatus: 'valid',
        validationNotes: 'Feeder Class 0.2S Verified'
      },
      {
        id: 'ER_SEED_02',
        meterId: 'DEV_AI-BLOCK_METER',
        meterName: 'AI & Data Science Sub-station Meter',
        buildingId: 'MITS_AI_BUILDING',
        buildingName: 'AI & Data Science Building',
        timestamp: new Date(Date.now() - 300000).toISOString(),
        powerKw: 48.6,
        energyKwh: 384.5,
        voltage: 231.8,
        currentAmps: 209.6,
        powerFactor: 0.97,
        frequencyHz: 50.1,
        dataSource: 'sensor',
        qualityStatus: 'valid'
      },
      {
        id: 'ER_SEED_03',
        meterId: 'DEV_WORKSHOP_METER',
        meterName: 'Central Workshop 3-Phase Bus Meter',
        buildingId: 'MITS_WORKSHOP',
        buildingName: 'Central Workshop',
        timestamp: new Date(Date.now() - 600000).toISOString(),
        powerKw: 74.8,
        energyKwh: 588.0,
        voltage: 412.0,
        currentAmps: 104.8,
        powerFactor: 0.89,
        frequencyHz: 49.9,
        dataSource: 'sensor',
        qualityStatus: 'valid',
        validationNotes: 'Inductive Load Detected'
      }
    ],
    solarRecords: [
      {
        id: 'SOLAR_SEED_01',
        solarSystemId: 'SOLAR_MAIN_ROOFTOP',
        installationName: 'MITS Main Academic Complex Rooftop Array',
        buildingId: 'MITS_MAIN_BUILDING',
        buildingName: 'Main Building',
        timestamp: new Date().toISOString(),
        outputKw: 182.5,
        generatedTodayKwh: 1120.4,
        cumulativeMwh: 148.62,
        irradianceWm2: 840,
        panelTempC: 38.4,
        inverterStatus: 'normal',
        faultCodes: ['E-00: Normal Generation'],
        avoidedCostTodayINR: 8515,
        avoidedCo2Kg: 918.7,
        dataSource: 'sensor',
        qualityStatus: 'valid'
      },
      {
        id: 'SOLAR_SEED_02',
        solarSystemId: 'SOLAR_AI_ROOFTOP',
        installationName: 'AI & Data Science Block Rooftop Array',
        buildingId: 'MITS_AI_BUILDING',
        buildingName: 'AI & Data Science Building',
        timestamp: new Date().toISOString(),
        outputKw: 72.8,
        generatedTodayKwh: 448.2,
        cumulativeMwh: 62.15,
        irradianceWm2: 855,
        panelTempC: 37.9,
        inverterStatus: 'normal',
        faultCodes: ['E-00: Normal Generation'],
        avoidedCostTodayINR: 3406,
        avoidedCo2Kg: 367.5,
        dataSource: 'sensor',
        qualityStatus: 'valid'
      }
    ],
    unusedEquipmentFindings: [
      {
        id: 'UNUSE_01',
        deviceId: 'APP_M004_AC1',
        deviceName: 'Inverter AC Units #1-#4 in ML Lab M004',
        deviceType: 'ac',
        roomId: 'ROOM_M004',
        roomNumber: 'M004',
        buildingId: 'MITS_AI_BUILDING',
        buildingName: 'AI & Data Science Building',
        floor: 'Ground Floor',
        observationPeriod: 'Recess Intermission (13:00 – 14:15)',
        detectedAt: new Date(Date.now() - 1800000).toISOString(),
        observedPowerKw: 7.4,
        baselinePowerKw: 1.2,
        avoidableKwh: 9.25,
        costImpactINR: 70.30,
        reasonFlag: 'Zero Occupancy with Full HVAC Active',
        evidencePoints: [
          'Occupancy count: 0 detected via motion sensors',
          '4x 2.0 Ton Inverter ACs running continuously',
          'Room temperature setpoint 21°C reached 45 mins ago',
          'Class schedule shows recess period until 14:30'
        ],
        recommendedAction: 'Apply remote eco-power cut to AC #1, #2, #3 while retaining baseline server cooling',
        confidenceLevel: 'high',
        dataLimitations: 'Occupancy inference from PIR motion detectors and timetable cross-referencing',
        status: 'active'
      },
      {
        id: 'UNUSE_02',
        deviceId: 'APP_MAIN_CAD_CAM_LAB_COMP',
        deviceName: 'CAD/CAM Student Workstations (x25)',
        deviceType: 'computer',
        roomId: 'MAIN_CAD_CAM_LAB',
        roomNumber: 'E014',
        buildingId: 'MITS_MAIN_BUILDING',
        buildingName: 'Main Academic Building',
        floor: 'First Floor',
        observationPeriod: 'Post-Lab Hours (18:00 – 21:00)',
        detectedAt: new Date(Date.now() - 3600000).toISOString(),
        observedPowerKw: 5.8,
        baselinePowerKw: 0.6,
        avoidableKwh: 15.6,
        costImpactINR: 118.56,
        reasonFlag: 'After-Hours Idle PC Power Draw',
        evidencePoints: [
          'Lab officially closed at 17:30',
          '25x Core i7 workstations drawing idle power in sleep mode failure',
          'Sub-meter E014 indicates sustained 5.8 kW baseline'
        ],
        recommendedAction: 'Dispatch Wake-on-LAN ACPI S5 remote shutdown command across CAD/CAM subnet',
        confidenceLevel: 'high',
        dataLimitations: 'Verified through sub-meter telemetry; individual PC smart plugs not present',
        status: 'active'
      },
      {
        id: 'UNUSE_03',
        deviceId: 'APP_WS_01_MACH',
        deviceName: 'Machine Shop Exhaust Extraction Blower',
        deviceType: 'machinery',
        roomId: 'WS_01',
        roomNumber: 'WS-01',
        buildingId: 'MITS_WORKSHOP',
        buildingName: 'Central Workshop',
        floor: 'Ground Floor',
        observationPeriod: 'Current Observation Window',
        detectedAt: new Date(Date.now() - 5400000).toISOString(),
        observedPowerKw: 7.5,
        baselinePowerKw: 0.0,
        avoidableKwh: 11.25,
        costImpactINR: 85.50,
        reasonFlag: 'Ventilation Running With No Lathes Operating',
        evidencePoints: [
          'Exhaust motor running at 7.5 kW draw',
          'All 12 lathe motor breakers in OFF state',
          'No cutting or welding detected for 75 minutes'
        ],
        recommendedAction: 'Isolate exhaust blower starter relay via Facility Manager control',
        confidenceLevel: 'medium',
        dataLimitations: 'Requires manual confirmation with workshop technical superintendent',
        status: 'active'
      }
    ],
    csvImports: [
      {
        batchId: 'BATCH_CSV_KAGGLE_01',
        filename: 'synthetic_campus_energy_usage.csv',
        importedAt: new Date(Date.now() - 86400000).toISOString(),
        totalRows: 300,
        acceptedRows: 298,
        rejectedRows: 2,
        duplicateRows: 0,
        dataSource: 'file_upload',
        validationErrors: [
          { row: 142, reason: 'Negative power reading (-4.2 kW)', raw: 'Classroom Block,-4.2,2025-06-12' },
          { row: 219, reason: 'Missing timestamp field', raw: 'Library,,2025-08-01' }
        ]
      }
    ],
    departments,
    devices,
    alerts,
    mlAnomalies: [],
    savingsVerifications,
    environmentalZones,
    datasets: [
      {
        id: 'DATASET_SYNTHETIC_01',
        filename: 'synthetic_campus_energy_usage.csv',
        recordCount: 300,
        dateRange: 'Feb 2025 – Dec 2025',
        buildingsCovered: ['Hostel', 'Library', 'Admin Office', 'Classroom Block', 'Computer Lab'],
        importedAt: now,
        source: 'Uploaded Kaggle Synthetic Energy Dataset',
        status: 'active_training'
      }
    ],
    telemetryHistory: [],
    billingRecords: [],
    maintenanceTickets: [],
    auditLogs: [
      {
        id: 'AUDIT_INIT_001',
        userId: 'USER_SUPER_ADMIN_001',
        userName: 'Prof. R. S. Jadon (Super Admin)',
        userRole: 'super_admin',
        action: 'PLATFORM_INITIALIZATION',
        details: 'Initialized MITS Gwalior Smart Campus Digital Twin, Multi-floor Hierarchy & Room Control Relays',
        timestamp: now
      }
    ],
    tariff: {
      id: 'MITS_MPPKVVCL_HT',
      name: 'MPPKVVCL High Tension Commercial Tariff',
      currencySymbol: '₹',
      ratePerKwh: 7.60,
      solarFeedInTariff: 4.25,
      contractedDemandKva: 500
    },
    rejectedIngestionCount: 0,
    simulatorRunning: true,
    thresholds: {
      highPowerKw: 15,
      criticalPowerKw: 25,
      highTempC: 40,
      lowVoltage: 200,
      highVoltage: 260
    },
    applianceStatusHistory: [],
    aiQueries: [],
    waterTanks: [],
    waterReadings: []
  };

  db.setData(seedData);
  console.log(`[Seed] ✅ Seeded MITS Gwalior with ${rooms.length} rooms, ${appliances.length} controllable appliances, and ${schedules.length} schedules across multi-floor hierarchy.`);
}
