import { Building, BuildingCategory } from './types.js';

export type VerifiedBuildingCategory =
  | 'MAIN BUILDING'
  | 'OLD BUILDING'
  | 'LIBRARY'
  | 'HOSTEL'
  | 'LABORATORY'
  | 'CANTEEN'
  | 'OTHER VERIFIED CAMPUS BUILDINGS';

export interface VerifiedBuildingMetadata {
  id: string;
  officialName: string;
  shortName: string;
  category: VerifiedBuildingCategory;
  categoryBadgeColor: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  labelOffsetY: number; // Vertical offset for 3D label placement
  worldCoordinates: [number, number, number]; // [x, y, z] in Three.js campus coordinate frame
  totalFloors: number;
  departments: string[];
  energyMonitored: boolean;
  solarMonitored: boolean;
  substationFeeder?: string;
  verificationSource: string;
  verificationStatus: 'verified' | 'provisional';
}

/**
 * Reusable, authoritative metadata model for MITS Gwalior Campus Buildings
 * Location: Madhav Institute of Technology and Science, Gwalior, MP 474005
 * Ground Reference Point: 26.2307° N, 78.2255° E (Campus Datum ~210m AMSL)
 */
export const VERIFIED_MITS_BUILDINGS: VerifiedBuildingMetadata[] = [
  {
    id: 'MITS_MAIN_BUILDING',
    officialName: 'Main Building (Academic & Administrative Complex)',
    shortName: 'Main Building',
    category: 'MAIN BUILDING',
    categoryBadgeColor: 'bg-blue-500/20 text-blue-300 border-blue-500/40',
    latitude: 26.2308,
    longitude: 78.2252,
    altitudeMeters: 228.0,
    labelOffsetY: 24.0,
    worldCoordinates: [0, 10, 20],
    totalFloors: 3,
    departments: ['Administration', 'Electrical Engineering', 'Mechanical Engineering'],
    energyMonitored: true,
    solarMonitored: true,
    substationFeeder: 'Substation #1 (Main Bus)',
    verificationSource: 'MITS Campus Master Plan 2024 & Ground Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_OLD_BUILDING',
    officialName: 'Old Building (Heritage Academic Wing — 1957)',
    shortName: 'Old Building',
    category: 'OLD BUILDING',
    categoryBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    latitude: 26.2302,
    longitude: 78.2248,
    altitudeMeters: 225.0,
    labelOffsetY: 20.0,
    worldCoordinates: [-50, 9, 15],
    totalFloors: 2,
    departments: ['Civil Engineering', 'Applied Sciences', 'Dean Academic'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #1 (Heritage Feeder)',
    verificationSource: 'MITS Heritage Architectural Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_LIBRARY',
    officialName: 'Central Library & Knowledge Resource Centre',
    shortName: 'Central Library',
    category: 'LIBRARY',
    categoryBadgeColor: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40',
    latitude: 26.2315,
    longitude: 78.2260,
    altitudeMeters: 226.0,
    labelOffsetY: 18.0,
    worldCoordinates: [55, 6, 50],
    totalFloors: 2,
    departments: ['Central Library', 'Digital E-Library Hub'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #2 (Academic Feeder)',
    verificationSource: 'MITS Campus Survey 2024',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_HOSTELS',
    officialName: 'Student Residential Hostels Complex (Blocks A-D)',
    shortName: 'Hostel Complex',
    category: 'HOSTEL',
    categoryBadgeColor: 'bg-pink-500/20 text-pink-300 border-pink-500/40',
    latitude: 26.2295,
    longitude: 78.2240,
    altitudeMeters: 230.0,
    labelOffsetY: 22.0,
    worldCoordinates: [-85, 8, -10],
    totalFloors: 3,
    departments: ['Chief Warden Office', 'Student Housing'],
    energyMonitored: true,
    solarMonitored: true,
    substationFeeder: 'Substation #3 (Hostels & Domestic Bus)',
    verificationSource: 'MITS Residential Facilities Ground Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_AI_BUILDING',
    officialName: 'AI & Data Science Laboratories Building',
    shortName: 'AI & Computing Labs',
    category: 'LABORATORY',
    categoryBadgeColor: 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40',
    latitude: 26.2319,
    longitude: 78.2250,
    altitudeMeters: 227.0,
    labelOffsetY: 20.0,
    worldCoordinates: [0, 8, -40],
    totalFloors: 2,
    departments: ['Artificial Intelligence & Data Science', 'Computer Applications', 'IoT Lab'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #2 (Computing Lab Bus)',
    verificationSource: 'MITS Department Infrastructure Ground Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_CANTEEN',
    officialName: 'Campus Canteen & Student Amenities Hub',
    shortName: 'Campus Canteen',
    category: 'CANTEEN',
    categoryBadgeColor: 'bg-orange-500/20 text-orange-300 border-orange-500/40',
    latitude: 26.2300,
    longitude: 78.2262,
    altitudeMeters: 222.0,
    labelOffsetY: 16.0,
    worldCoordinates: [45, 5, 80],
    totalFloors: 1,
    departments: ['Student Welfare', 'Campus Cafeteria'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #1 (Amenities Feeder)',
    verificationSource: 'MITS Estate Office Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_WORKSHOP',
    officialName: 'Central Production & Heavy Machine Workshop',
    shortName: 'Central Workshop',
    category: 'OTHER VERIFIED CAMPUS BUILDINGS',
    categoryBadgeColor: 'bg-amber-500/20 text-amber-300 border-amber-500/40',
    latitude: 26.2325,
    longitude: 78.2245,
    altitudeMeters: 224.0,
    labelOffsetY: 16.0,
    worldCoordinates: [0, 6, -95],
    totalFloors: 1,
    departments: ['Mechanical Workshop', 'Manufacturing & Lathe Bays'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #2 (Workshop 3-Phase Bus)',
    verificationSource: 'MITS Workshop Facility Survey',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_ARCH_BUILDING',
    officialName: 'Architecture Wing & Convention Center',
    shortName: 'Architecture Wing',
    category: 'OTHER VERIFIED CAMPUS BUILDINGS',
    categoryBadgeColor: 'bg-purple-500/20 text-purple-300 border-purple-500/40',
    latitude: 26.2312,
    longitude: 78.2268,
    altitudeMeters: 226.0,
    labelOffsetY: 18.0,
    worldCoordinates: [65, 8, -25],
    totalFloors: 2,
    departments: ['Architecture & Planning', 'Auditorium Hall'],
    energyMonitored: true,
    solarMonitored: false,
    substationFeeder: 'Substation #1 (Convention Feeder)',
    verificationSource: 'MITS Master Plan 2024',
    verificationStatus: 'verified'
  },
  {
    id: 'MITS_SOLAR_PLANT',
    officialName: 'MITS Rooftop Solar PV Generation (350 kWp)',
    shortName: 'Solar PV Plant',
    category: 'OTHER VERIFIED CAMPUS BUILDINGS',
    categoryBadgeColor: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/40',
    latitude: 26.2308,
    longitude: 78.2252,
    altitudeMeters: 234.0,
    labelOffsetY: 26.0,
    worldCoordinates: [0, 16, 20],
    totalFloors: 1,
    departments: ['Renewable Energy Cell', 'Solar Generation'],
    energyMonitored: true,
    solarMonitored: true,
    substationFeeder: 'Grid Tie Inverter 33kV Export',
    verificationSource: 'MPUVNL Solar Installation Audit',
    verificationStatus: 'verified'
  }
];

export function getVerifiedBuildingById(id: string): VerifiedBuildingMetadata | undefined {
  return VERIFIED_MITS_BUILDINGS.find(b => b.id === id);
}
