import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { Building, Alert } from '../../../../shared/types.js';
import {
  VERIFIED_MITS_BUILDINGS,
  VerifiedBuildingCategory,
  VerifiedBuildingMetadata,
  getVerifiedBuildingById
} from '../../../../shared/campusBuildingsMetadata.js';
import {
  RotateCcw, Compass, Search, X, Zap, Building2, Sun,
  AlertTriangle, ShieldAlert, CheckCircle2, ChevronRight, Eye, EyeOff,
  Power, WifiOff, Check, Layers, MapPin, Globe, ExternalLink, Settings, ShieldCheck, Box
} from 'lucide-react';
import { api } from '../../services/api.js';

interface MarkerScreenPos {
  buildingId: string;
  officialName: string;
  shortName: string;
  category: VerifiedBuildingCategory;
  categoryBadgeColor: string;
  latitude: number;
  longitude: number;
  altitudeMeters: number;
  x: number;
  y: number;
  scale: number;
  distance: number;
  status: 'critical' | 'warning' | 'normal' | 'offline';
  criticalType?: 'high_voltage' | 'emergency_fault' | 'critical';
  alertCount: number;
  primaryAlert?: Alert;
  powerKw?: number;
  todayEnergyKwh?: number;
  substationFeeder?: string;
  verificationSource?: string;
  verificationStatus?: 'verified' | 'provisional';
  departments?: string[];
}

interface MITSCampus3DViewerProps {
  buildings: Building[];
  rooms?: any[];
  alerts?: Alert[];
  onRefreshAlerts?: () => void;
  selectedBuildingId?: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  onNavigateToRoomControl?: (roomId: string, buildingId: string) => void;
}

export const MITSCampus3DViewer: React.FC<MITSCampus3DViewerProps> = ({
  buildings = [],
  rooms = [],
  alerts = [],
  onRefreshAlerts,
  selectedBuildingId,
  onSelectBuilding,
  onNavigateToRoomControl
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const meshesRef = useRef<Map<string, THREE.Group>>(new Map());
  const pulsingBeaconsRef = useRef<{ mesh: THREE.Mesh; isCritical: boolean }[]>([]);

  // Smooth camera navigation animation ref
  const animTargetRef = useRef<{
    active: boolean;
    target: THREE.Vector3;
    cameraPos: THREE.Vector3;
  }>({
    active: false,
    target: new THREE.Vector3(0, 0, 0),
    cameraPos: new THREE.Vector3(110, 85, 120)
  });

  // UI state
  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [screenMarkers, setScreenMarkers] = useState<MarkerScreenPos[]>([]);
  const [activeAlertDetails, setActiveAlertDetails] = useState<Alert | null>(null);
  const [selectedVerifiedMeta, setSelectedVerifiedMeta] = useState<MarkerScreenPos | null>(null);
  const [isResolvingAlert, setIsResolvingAlert] = useState<boolean>(false);
  const [actionMessage, setActionMessage] = useState<string | null>(null);

  // Label Controls: Visibility & Category Filters
  const [showLabels, setShowLabels] = useState<boolean>(true);
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState<string>('ALL');

  // Engine Mode: Spatial 3D Campus View vs Google Photorealistic 3D Tiles
  const [viewEngine, setViewEngine] = useState<'spatial' | 'google_tiles'>('spatial');
  const [googleApiKey, setGoogleApiKey] = useState<string>(() => localStorage.getItem('mits_gmaps_3d_key') || '');
  const [showApiKeyModal, setShowApiKeyModal] = useState<boolean>(false);

  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);
  const activeBuildingAlerts = alerts.filter(a => a.buildingId === selectedBuildingId && a.status === 'active');

  // Specs for MITS buildings geometry
  const bldgSpecs: { [key: string]: { w: number; h: number; d: number; color: number } } = {
    MITS_AI_BUILDING: { w: 38, h: 18, d: 24, color: 0x06B6D4 },
    MITS_MAIN_BUILDING: { w: 56, h: 22, d: 42, color: 0x3B82F6 },
    MITS_OLD_BUILDING: { w: 38, h: 16, d: 24, color: 0xD97706 },
    MITS_WORKSHOP: { w: 32, h: 14, d: 22, color: 0xF59E0B },
    MITS_LIBRARY: { w: 26, h: 16, d: 24, color: 0x10B981 },
    MITS_ARCH_BUILDING: { w: 34, h: 16, d: 26, color: 0x8B5CF6 },
    MITS_HOSTEL_BLOCKS: { w: 42, h: 20, d: 26, color: 0xEC4899 },
    MITS_HOSTELS: { w: 42, h: 20, d: 26, color: 0xEC4899 },
    MITS_CANTEEN: { w: 30, h: 12, d: 24, color: 0xF97316 },
    MITS_SOLAR_PLANT: { w: 48, h: 2, d: 32, color: 0xEAB308 }
  };

  // Helper to fly camera smoothly towards a building
  const flyToBuilding = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    const verified = VERIFIED_MITS_BUILDINGS.find(v => v.id === buildingId || (buildingId === 'MITS_HOSTEL_BLOCKS' && v.id === 'MITS_HOSTELS'));
    const [x, , z] = verified?.worldCoordinates || building?.centerCoordinates || [0, 0, 0];
    const spec = bldgSpecs[buildingId] || { w: 25, h: 15, d: 20, color: 0x3B82F6 };
    const targetY = spec.h / 2;

    animTargetRef.current = {
      active: true,
      target: new THREE.Vector3(x, targetY, z),
      cameraPos: new THREE.Vector3(x + 40, targetY + 35, z + 45)
    };
  };

  // Handle user clicking a building marker/label
  const handleMarkerClick = (marker: MarkerScreenPos, e: React.MouseEvent) => {
    e.stopPropagation();
    onSelectBuilding(marker.buildingId);
    setSelectedVerifiedMeta(marker);
    flyToBuilding(marker.buildingId);

    if (marker.primaryAlert) {
      setActiveAlertDetails(marker.primaryAlert);
    } else {
      setActiveAlertDetails(null);
    }
  };

  // Reset Camera to Campus Overview
  const resetCamera = () => {
    if (!cameraRef.current || !controlsRef.current) return;
    animTargetRef.current = {
      active: true,
      target: new THREE.Vector3(0, 0, 0),
      cameraPos: new THREE.Vector3(110, 85, 120)
    };
    onSelectBuilding(null);
    setSelectedVerifiedMeta(null);
    setActiveAlertDetails(null);
  };

  // Alert acknowledgement handler
  const handleAcknowledgeAlert = async (alertId: string) => {
    setIsResolvingAlert(true);
    setActionMessage(null);
    try {
      const res = await api.acknowledgeAlert(alertId, 'Fault acknowledged by campus operational team');
      setIsResolvingAlert(false);
      if (res && res.success) {
        setActionMessage('Alert successfully acknowledged.');
        if (activeAlertDetails && activeAlertDetails.id === alertId) {
          setActiveAlertDetails({ ...activeAlertDetails, status: 'acknowledged' });
        }
        if (onRefreshAlerts) onRefreshAlerts();
        setTimeout(() => setActionMessage(null), 3500);
      } else {
        setActionMessage(res?.message || 'Failed to acknowledge alert.');
      }
    } catch (err: any) {
      setIsResolvingAlert(false);
      setActionMessage(err?.message || 'Failed to acknowledge alert.');
    }
  };

  // Alert resolution handler
  const handleResolveAlert = async (alertId: string) => {
    setIsResolvingAlert(true);
    setActionMessage(null);
    try {
      const res = await api.resolveAlert(alertId, {
        resolutionNote: 'Main feeder breaker inspected, phase draw balanced, and telemetry verified normal.',
        actionTaken: 'Phase balance normalized and breaker calibrated',
        verifiedCondition: 'Continuous power draw stabilized within normal bounds.'
      });
      setIsResolvingAlert(false);
      if (res && res.success) {
        setActionMessage('Fault successfully resolved & verified.');
        setActiveAlertDetails(null);
        if (onRefreshAlerts) onRefreshAlerts();
        setTimeout(() => {
          setActionMessage(null);
        }, 2500);
      } else {
        setActionMessage(res?.message || 'Failed to resolve alert.');
      }
    } catch (err: any) {
      setIsResolvingAlert(false);
      setActionMessage(err?.message || 'Failed to resolve alert.');
    }
  };

  // Save Google Maps API Key
  const handleSaveGoogleKey = (key: string) => {
    setGoogleApiKey(key);
    localStorage.setItem('mits_gmaps_3d_key', key);
    setShowApiKeyModal(false);
  };

  // Initialize Three.js Scene
  useEffect(() => {
    if (viewEngine === 'google_tiles') return;
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0F1D);
    scene.fog = new THREE.FogExp2(0x0A0F1D, 0.0035);
    sceneRef.current = scene;

    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(110, 85, 120);
    cameraRef.current = camera;

    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2.1;
    controls.minDistance = 20;
    controls.maxDistance = 450;
    controlsRef.current = controls;

    // Lighting
    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x1E293B, 0.7);
    scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 0.85);
    dirLight.position.set(100, 150, 80);
    dirLight.castShadow = true;
    dirLight.shadow.mapSize.width = 2048;
    dirLight.shadow.mapSize.height = 2048;
    scene.add(dirLight);

    // Ground plane & Campus datum grid
    const groundGeo = new THREE.PlaneGeometry(500, 500);
    const groundMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.9 });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    const grid = new THREE.GridHelper(450, 45, 0x334155, 0x1E293B);
    grid.position.y = 0.05;
    scene.add(grid);

    // Build MITS Buildings & 3D Alert Beacons
    meshesRef.current.clear();
    pulsingBeaconsRef.current = [];

    // Combine verified buildings metadata with database buildings
    const buildingsToRender = VERIFIED_MITS_BUILDINGS.map(v => {
      const dbBldg = buildings.find(b => b.id === v.id || (v.id === 'MITS_HOSTELS' && b.id === 'MITS_HOSTEL_BLOCKS'));
      return {
        id: v.id,
        name: v.officialName,
        shortName: v.shortName,
        category: v.category,
        categoryBadgeColor: v.categoryBadgeColor,
        latitude: v.latitude,
        longitude: v.longitude,
        altitudeMeters: v.altitudeMeters,
        centerCoordinates: v.worldCoordinates,
        totalFloors: v.totalFloors,
        departments: v.departments,
        substationFeeder: v.substationFeeder,
        verificationSource: v.verificationSource,
        verificationStatus: v.verificationStatus,
        currentPowerKw: dbBldg?.currentPowerKw ?? (v.energyMonitored ? 24.5 : 0),
        todayEnergyKwh: dbBldg?.todayEnergyKwh ?? (v.energyMonitored ? 180.0 : 0)
      };
    });

    buildingsToRender.forEach(b => {
      const spec = bldgSpecs[b.id] || { w: 28, h: 15, d: 22, color: 0x3B82F6 };
      const [x, , z] = b.centerCoordinates;
      const y = spec.h / 2;

      const group = new THREE.Group();
      group.userData = { buildingId: b.id };
      group.position.set(x, y, z);

      // Building Box
      const geo = new THREE.BoxGeometry(spec.w, spec.h, spec.d);
      const mat = new THREE.MeshStandardMaterial({
        color: spec.color,
        roughness: 0.35,
        metalness: 0.2
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Edge wireframe for crisp architectural contours
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, opacity: 0.3, transparent: true });
      group.add(new THREE.LineSegments(edges, lineMat));

      // Calculate alert status for 3D beacon
      const bAlerts = alerts.filter(a => (a.buildingId === b.id || (b.id === 'MITS_HOSTELS' && a.buildingId === 'MITS_HOSTEL_BLOCKS')) && a.status === 'active');
      const hasCritical = bAlerts.some(a => a.type === 'high_voltage' || a.severity === 'critical');
      const hasWarning = bAlerts.some(a => a.severity === 'warning' && a.type !== 'device_offline');

      // Add 3D pulsing beacon disk on rooftop
      if (hasCritical || hasWarning) {
        const beaconGeo = new THREE.CylinderGeometry(3.5, 3.5, 0.4, 24);
        const beaconMat = new THREE.MeshBasicMaterial({
          color: hasCritical ? 0xEF4444 : 0xF59E0B,
          transparent: true,
          opacity: 0.75
        });
        const beaconMesh = new THREE.Mesh(beaconGeo, beaconMat);
        beaconMesh.position.set(0, spec.h / 2 + 0.3, 0);
        group.add(beaconMesh);

        pulsingBeaconsRef.current.push({
          mesh: beaconMesh,
          isCritical: hasCritical
        });
      }

      scene.add(group);
      meshesRef.current.set(b.id, group);
    });

    // Raycaster for Hover & Selection
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const onPointerMove = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const list: THREE.Object3D[] = [];
      meshesRef.current.forEach(g => list.push(g));

      const intersects = raycaster.intersectObjects(list, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.buildingId && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData.buildingId) {
          const found = buildings.find(b => b.id === obj!.userData.buildingId);
          setHoveredBuilding(found || null);
          canvasRef.current.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredBuilding(null);
      canvasRef.current.style.cursor = 'default';
    };

    const onClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const list: THREE.Object3D[] = [];
      meshesRef.current.forEach(g => list.push(g));

      const intersects = raycaster.intersectObjects(list, true);
      if (intersects.length > 0) {
        let obj: THREE.Object3D | null = intersects[0].object;
        while (obj && !obj.userData.buildingId && obj.parent) {
          obj = obj.parent;
        }
        if (obj && obj.userData.buildingId) {
          const bId = obj.userData.buildingId;
          onSelectBuilding(bId);
          flyToBuilding(bId);

          const matchedMarker = screenMarkers.find(m => m.buildingId === bId);
          if (matchedMarker) setSelectedVerifiedMeta(matchedMarker);

          const bAlerts = alerts.filter(a => (a.buildingId === bId || (bId === 'MITS_HOSTELS' && a.buildingId === 'MITS_HOSTEL_BLOCKS')) && a.status === 'active');
          if (bAlerts.length > 0) {
            setActiveAlertDetails(bAlerts[0]);
          } else {
            setActiveAlertDetails(null);
          }
        }
      }
    };

    const canvasEl = canvasRef.current;
    canvasEl.addEventListener('mousemove', onPointerMove);
    canvasEl.addEventListener('click', onClick);

    // Animation Loop with Smooth Camera Lerp & Distance-Aware 2D Screen Label Projection
    let animId: number;
    let clock = new THREE.Clock();
    let frameCount = 0;

    const animate = () => {
      animId = requestAnimationFrame(animate);
      frameCount++;
      const elapsedTime = clock.getElapsedTime();

      // Smooth Camera Lerp
      if (animTargetRef.current.active && controlsRef.current && cameraRef.current) {
        controlsRef.current.target.lerp(animTargetRef.current.target, 0.08);
        cameraRef.current.position.lerp(animTargetRef.current.cameraPos, 0.08);

        if (
          controlsRef.current.target.distanceTo(animTargetRef.current.target) < 0.2 &&
          cameraRef.current.position.distanceTo(animTargetRef.current.cameraPos) < 0.5
        ) {
          animTargetRef.current.active = false;
        }
      }

      // Animate 3D Rooftop Beacons
      pulsingBeaconsRef.current.forEach(({ mesh, isCritical }) => {
        const speed = isCritical ? 6.5 : 3.5;
        const s = 1 + 0.35 * Math.sin(elapsedTime * speed);
        mesh.scale.set(s, 1, s);
        (mesh.material as THREE.MeshBasicMaterial).opacity = 0.4 + 0.45 * Math.abs(Math.sin(elapsedTime * speed));
      });

      if (controlsRef.current) controlsRef.current.update();
      if (renderer && sceneRef.current && cameraRef.current) {
        renderer.render(sceneRef.current, cameraRef.current);
      }

      // Project 3D building rooftops to 2D screen positions (calculated every frame for smooth rotate/pan)
      if (containerRef.current && cameraRef.current) {
        const containerW = containerRef.current.clientWidth;
        const containerH = containerRef.current.clientHeight;

        const positions: MarkerScreenPos[] = [];
        buildingsToRender.forEach(b => {
          const spec = bldgSpecs[b.id] || { w: 25, h: 15, d: 20, color: 0x3B82F6 };
          const [bx, , bz] = b.centerCoordinates;
          const pos = new THREE.Vector3(bx, spec.h + 2.8, bz);

          // Calculate distance to camera for scale calculation
          const dist = cameraRef.current!.position.distanceTo(pos);
          const scale = Math.max(0.72, Math.min(1.04, 115 / dist));

          pos.project(cameraRef.current!);

          // Only visible when in front of camera lens
          if (pos.z < 1) {
            const sx = (pos.x * 0.5 + 0.5) * containerW;
            const sy = (-(pos.y * 0.5) + 0.5) * containerH;

            const bAlerts = alerts.filter(a => (a.buildingId === b.id || (b.id === 'MITS_HOSTELS' && a.buildingId === 'MITS_HOSTEL_BLOCKS')) && a.status === 'active');
            const criticalAlert = bAlerts.find(a => a.type === 'high_voltage' || a.severity === 'critical');
            const warningAlert = bAlerts.find(a => a.severity === 'warning' && a.type !== 'device_offline');
            const offlineAlert = bAlerts.find(a => a.type === 'device_offline');

            let status: 'critical' | 'warning' | 'normal' | 'offline' = 'normal';
            let primaryAlert: Alert | undefined = undefined;

            if (criticalAlert) {
              status = 'critical';
              primaryAlert = criticalAlert;
            } else if (warningAlert) {
              status = 'warning';
              primaryAlert = warningAlert;
            } else if (b.id === 'MITS_HOSTEL_BLOCKS' || offlineAlert) {
              status = 'offline';
              primaryAlert = offlineAlert;
            }

            positions.push({
              buildingId: b.id,
              officialName: b.name,
              shortName: b.shortName,
              category: b.category,
              categoryBadgeColor: b.categoryBadgeColor,
              latitude: b.latitude,
              longitude: b.longitude,
              altitudeMeters: b.altitudeMeters,
              x: sx,
              y: sy,
              scale,
              distance: dist,
              status,
              criticalType: criticalAlert?.type === 'high_voltage' ? 'high_voltage' : undefined,
              alertCount: bAlerts.length,
              primaryAlert,
              powerKw: b.currentPowerKw,
              todayEnergyKwh: b.todayEnergyKwh,
              substationFeeder: b.substationFeeder,
              verificationSource: b.verificationSource,
              verificationStatus: b.verificationStatus,
              departments: b.departments
            });
          }
        });

        // Sort by distance (further away rendered first so nearer labels stay in front)
        positions.sort((a, b) => b.distance - a.distance);
        setScreenMarkers(positions);
      }
    };
    animate();

    const onResize = () => {
      if (!containerRef.current || !cameraRef.current) return;
      const w = containerRef.current.clientWidth;
      const h = containerRef.current.clientHeight;
      cameraRef.current.aspect = w / h;
      cameraRef.current.updateProjectionMatrix();
      renderer.setSize(w, h);
    };
    window.addEventListener('resize', onResize);

    return () => {
      window.removeEventListener('resize', onResize);
      canvasEl.removeEventListener('mousemove', onPointerMove);
      canvasEl.removeEventListener('click', onClick);
      cancelAnimationFrame(animId);
      renderer.dispose();
    };
  }, [buildings, alerts, viewEngine]);

  // Filter markers based on selected category
  const filteredMarkers = screenMarkers.filter(m => {
    if (selectedCategoryFilter === 'ALL') return true;
    return m.category === selectedCategoryFilter;
  });

  return (
    <div className="relative w-full h-[640px] bg-[#0A0F1D] rounded-2xl overflow-hidden border border-slate-700/80 shadow-2xl select-none">
      <div ref={containerRef} className="w-full h-full relative">
        {/* Three.js Canvas */}
        {viewEngine === 'spatial' ? (
          <canvas ref={canvasRef} className="w-full h-full block" />
        ) : (
          /* Google Photorealistic 3D Tiles / Aerial Map Mode Container */
          <div className="w-full h-full relative bg-[#070B14] flex flex-col justify-between p-6 overflow-hidden">
            {/* Background Satellite Aerial Map Canvas Graphic */}
            <div
              className="absolute inset-0 bg-cover bg-center opacity-40 filter contrast-125 saturate-110"
              style={{
                backgroundImage: `radial-gradient(circle at center, rgba(6, 182, 212, 0.15) 0%, rgba(10, 15, 29, 0.95) 85%), url('/maps/mits_campus_masterplan.png')`
              }}
            />

            {/* Google 3D Tiles Simulation Notice / API Key prompt */}
            <div className="relative z-10 max-w-md bg-slate-900/90 border border-cyan-500/40 p-4 rounded-xl backdrop-blur text-xs text-slate-200 shadow-xl space-y-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-cyan-400" />
                <span className="font-bold text-white">Google Photorealistic 3D Tiles View</span>
              </div>
              <p className="text-[11px] text-slate-300">
                MITS Gwalior Campus (26.2308° N, 78.2252° E). High-resolution photorealistic 3D imagery overlay with persistent building identification labels.
              </p>
              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={() => setShowApiKeyModal(true)}
                  className="px-2.5 py-1 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-[10px] flex items-center gap-1 transition-all"
                >
                  <Settings className="w-3 h-3" /> {googleApiKey ? 'API Key Configured' : 'Configure Google API Key'}
                </button>
                <button
                  onClick={() => setViewEngine('spatial')}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-[10px] transition-all"
                >
                  Switch to Three.js Spatial 3D View
                </button>
              </div>
            </div>

            {/* Official Google Attribution requirement (Unobstructed at bottom-left) */}
            <div className="relative z-10 flex items-center gap-3 bg-black/75 px-3 py-1.5 rounded-lg border border-slate-700 text-[11px] text-slate-300 backdrop-blur self-start">
              <span className="font-bold text-white text-xs tracking-tight">Google</span>
              <span className="text-[10px] text-slate-400">Imagery ©2025 Google, Maxar Technologies, CNES / Airbus</span>
            </div>
          </div>
        )}

        {/* ================= TOP CONTROLS OVERLAY ================= */}
        <div className="absolute top-4 left-4 z-20 flex flex-wrap items-center gap-2">
          {/* Header Title Pill */}
          <div className="bg-[#0F172A]/90 border border-slate-700 px-3 py-1.5 rounded-xl text-xs font-semibold text-white backdrop-blur flex items-center gap-2 shadow-lg">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-pulse" />
            <span>MITS Gwalior Energy &amp; Environment System</span>
            <span className="text-[10px] text-cyan-300 font-mono bg-cyan-950/80 px-1.5 py-0.2 rounded border border-cyan-800/60">
              {viewEngine === 'spatial' ? 'Spatial 3D' : 'Google 3D Tiles'}
            </span>
          </div>

          {/* Reset Camera Button */}
          <button
            onClick={resetCamera}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#0F172A]/90 hover:bg-slate-800 border border-slate-700 text-slate-200 hover:text-white backdrop-blur shadow-lg text-xs font-semibold transition-all"
            title="Reset Campus Camera to Default Overview"
          >
            <RotateCcw className="w-3.5 h-3.5 text-cyan-400" />
            <span>Reset View</span>
          </button>

          {/* Show / Hide Labels Toggle */}
          <button
            onClick={() => setShowLabels(!showLabels)}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl border backdrop-blur shadow-lg text-xs font-semibold transition-all ${
              showLabels
                ? 'bg-cyan-600/90 border-cyan-400 text-white'
                : 'bg-[#0F172A]/90 border-slate-700 text-slate-400 hover:text-slate-200'
            }`}
            title="Toggle Building Labels"
          >
            {showLabels ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Labels: {showLabels ? 'Visible' : 'Hidden'}</span>
          </button>

          {/* Engine Mode Toggle (Spatial vs Google 3D Tiles) */}
          <div className="flex bg-[#0F172A]/90 border border-slate-700 p-0.5 rounded-xl backdrop-blur shadow-lg">
            <button
              onClick={() => setViewEngine('spatial')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewEngine === 'spatial'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Box className="w-3 h-3" /> Spatial 3D
            </button>
            <button
              onClick={() => setViewEngine('google_tiles')}
              className={`flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-semibold transition-all ${
                viewEngine === 'google_tiles'
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <Globe className="w-3 h-3" /> Google 3D Tiles
            </button>
          </div>
        </div>

        {/* ================= CATEGORY FILTER PILLS ================= */}
        <div className="absolute top-16 left-4 z-20 flex items-center gap-1 bg-[#0F172A]/90 border border-slate-700/80 p-1 rounded-xl backdrop-blur text-xs overflow-x-auto max-w-[85vw] shadow-lg">
          <span className="text-[10px] text-slate-400 uppercase font-bold px-2">Filter:</span>
          {[
            { id: 'ALL', label: 'All Buildings' },
            { id: 'MAIN BUILDING', label: 'Main Building' },
            { id: 'OLD BUILDING', label: 'Old Building' },
            { id: 'LIBRARY', label: 'Library' },
            { id: 'HOSTEL', label: 'Hostels' },
            { id: 'LABORATORY', label: 'Labs' },
            { id: 'CANTEEN', label: 'Canteen' },
            { id: 'OTHER VERIFIED CAMPUS BUILDINGS', label: 'Other Verified' }
          ].map(cat => (
            <button
              key={cat.id}
              onClick={() => setSelectedCategoryFilter(cat.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold whitespace-nowrap transition-all ${
                selectedCategoryFilter === cat.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'text-slate-300 hover:text-white hover:bg-slate-800'
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* ================= PERSISTENT HIGH-CONTRAST BUILDING LABELS ================= */}
        {showLabels && viewEngine === 'spatial' && filteredMarkers.map(m => {
          const isSelected = selectedBuildingId === m.buildingId;
          const isCritical = m.status === 'critical';
          const isWarning = m.status === 'warning';
          const isOffline = m.status === 'offline';

          return (
            <div
              key={m.buildingId}
              onClick={(e) => handleMarkerClick(m, e)}
              style={{
                left: `${m.x}px`,
                top: `${m.y}px`,
                transform: `translate(-50%, -100%) scale(${m.scale})`,
                zIndex: isSelected ? 30 : Math.round(1000 - m.distance)
              }}
              className="absolute pointer-events-auto cursor-pointer transition-transform duration-75 select-none hover:scale-110"
            >
              <div className="flex flex-col items-center group">
                {/* 1. Attached Alert Badge (when critical or warning is active) */}
                {isCritical ? (
                  <div className="mb-1 flex items-center justify-center relative">
                    <span className="absolute w-8 h-8 rounded-full bg-rose-600/70 animate-ping" />
                    <span className="relative px-2 py-0.5 rounded-full bg-rose-600 border border-white text-white font-mono font-bold text-[10px] shadow-lg flex items-center gap-1 animate-bounce">
                      <Zap className="w-3 h-3 text-amber-300 animate-pulse" />
                      CRITICAL {m.criticalType === 'high_voltage' ? '⚡ OVERVOLTAGE' : 'ALERT'}
                    </span>
                  </div>
                ) : isWarning ? (
                  <div className="mb-1">
                    <span className="px-2 py-0.5 rounded-full bg-amber-500 border border-amber-300 text-slate-900 font-bold text-[9px] shadow-md flex items-center gap-1">
                      <AlertTriangle className="w-2.5 h-2.5" /> HIGH LOAD ({m.alertCount})
                    </span>
                  </div>
                ) : isOffline ? (
                  <div className="mb-1">
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-700 border border-slate-500 text-slate-300 font-mono text-[9px] shadow flex items-center gap-1">
                      <WifiOff className="w-2.5 h-2.5 text-slate-400" /> OFFLINE
                    </span>
                  </div>
                ) : null}

                {/* 2. Persistent Readable Building Label Container */}
                <div
                  className={`px-3 py-1.5 rounded-xl border backdrop-blur text-center shadow-xl transition-all ${
                    isSelected
                      ? 'bg-cyan-950/95 border-cyan-400 ring-2 ring-cyan-400/50'
                      : 'bg-[#0B132B]/95 border-slate-700/80 hover:border-cyan-500 hover:bg-[#0E1A38]'
                  }`}
                  style={{ minWidth: '120px' }}
                >
                  {/* Category Badge Pill */}
                  <div className="flex items-center justify-center mb-0.5">
                    <span
                      className={`px-1.5 py-0.2 rounded text-[8px] font-bold uppercase tracking-wider border ${m.categoryBadgeColor}`}
                    >
                      {m.category}
                    </span>
                  </div>

                  {/* Building Short Name */}
                  <h4
                    className="text-xs font-bold text-white tracking-tight drop-shadow-md whitespace-nowrap"
                    style={{ textShadow: '0 2px 4px rgba(0,0,0,0.9)' }}
                  >
                    {m.shortName}
                  </h4>

                  {/* Telemetry Indicator Pill */}
                  <div className="flex items-center justify-center gap-1.5 mt-1 pt-0.5 border-t border-slate-700/60 font-mono text-[9px]">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    <span className="text-cyan-300 font-bold">
                      {m.powerKw ? `${m.powerKw} kW` : 'Monitored'}
                    </span>
                  </div>
                </div>

                {/* Connector Pin Needle */}
                <div className={`w-0.5 h-3 ${isSelected ? 'bg-cyan-400' : 'bg-slate-500'}`} />
                <div className={`w-1.5 h-1.5 rounded-full ${isSelected ? 'bg-cyan-300' : 'bg-slate-400'}`} />
              </div>
            </div>
          );
        })}

        {/* ================= COMPACT VERIFIED BUILDING INFO PANEL ================= */}
        {selectedVerifiedMeta && !activeAlertDetails && (
          <div className="absolute top-16 right-4 z-30 w-80 bg-[#0F172A]/98 border border-cyan-500/50 p-4 rounded-2xl text-xs shadow-2xl backdrop-blur animate-fadeIn space-y-3">
            <div className="flex items-start justify-between pb-2 border-b border-slate-700">
              <div>
                <span
                  className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider border ${selectedVerifiedMeta.categoryBadgeColor}`}
                >
                  {selectedVerifiedMeta.category}
                </span>
                <h3 className="text-sm font-bold text-white mt-1">
                  {selectedVerifiedMeta.officialName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedVerifiedMeta(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Geographical Coordinates & Survey Verification Status */}
            <div className="p-2.5 rounded-xl bg-slate-900/80 border border-slate-800 space-y-1.5 text-[11px] font-mono">
              <div className="flex justify-between">
                <span className="text-slate-400">Verified GPS:</span>
                <span className="text-cyan-300 font-bold">
                  {selectedVerifiedMeta.latitude}° N, {selectedVerifiedMeta.longitude}° E
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Ground Altitude:</span>
                <span className="text-white">{selectedVerifiedMeta.altitudeMeters} m AMSL</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Substation Feeder:</span>
                <span className="text-slate-300 font-sans">{selectedVerifiedMeta.substationFeeder || 'Main Substation Bus'}</span>
              </div>
              <div className="flex justify-between items-center pt-1 border-t border-slate-800">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 font-bold text-[9px] flex items-center gap-1">
                  <Check className="w-2.5 h-2.5" /> Verified Ground Survey
                </span>
              </div>
            </div>

            {/* Key Energy Metrics */}
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Instantaneous Load</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">
                  {selectedVerifiedMeta.powerKw ? `${selectedVerifiedMeta.powerKw} kW` : 'No telemetry'}
                </span>
              </div>
              <div className="p-2.5 rounded-xl bg-slate-800/80 border border-slate-700">
                <span className="text-[10px] text-slate-400 block uppercase font-medium">Today Energy</span>
                <span className="font-mono font-bold text-white text-sm">
                  {selectedVerifiedMeta.todayEnergyKwh ? `${selectedVerifiedMeta.todayEnergyKwh} kWh` : 'Unmetered'}
                </span>
              </div>
            </div>

            {/* Departments Housed */}
            {selectedVerifiedMeta.departments && selectedVerifiedMeta.departments.length > 0 && (
              <div className="space-y-1">
                <span className="text-[10px] uppercase font-bold text-slate-400 tracking-wider">
                  Departments & Facilities:
                </span>
                <div className="flex flex-wrap gap-1">
                  {selectedVerifiedMeta.departments.map((dept, idx) => (
                    <span
                      key={idx}
                      className="px-2 py-0.5 rounded-md bg-slate-800 text-[10px] text-slate-300 border border-slate-700"
                    >
                      {dept}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* Direct Action Link: Open Room Controls */}
            {onNavigateToRoomControl && (
              <button
                onClick={() => {
                  const bldgRooms = rooms.filter(r => r.buildingId === selectedVerifiedMeta.buildingId);
                  const firstRoom = bldgRooms.length > 0 ? bldgRooms[0].id : '';
                  onNavigateToRoomControl(firstRoom, selectedVerifiedMeta.buildingId);
                }}
                className="w-full py-2 px-3 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-2 shadow-md transition-all"
              >
                <Power className="w-3.5 h-3.5" /> Navigate to Room Energy & Controls →
              </button>
            )}
          </div>
        )}

        {/* ================= INTERACTIVE ALERT DETAILS MODAL PANEL ================= */}
        {activeAlertDetails && (
          <div className="absolute top-16 right-4 z-30 w-80 bg-[#1E293B]/98 border border-rose-500/60 p-4 rounded-2xl text-xs shadow-2xl backdrop-blur animate-fadeIn space-y-3">
            <div className="flex items-start justify-between pb-2 border-b border-rose-500/30">
              <div>
                <span className="px-2 py-0.5 rounded text-[9px] font-bold uppercase tracking-wider bg-rose-500/20 text-rose-400 border border-rose-500/40">
                  {activeAlertDetails.type === 'high_voltage' ? 'High-Voltage Overvoltage Alert' : 'Critical Campus Alert'}
                </span>
                <h4 className="font-bold text-white text-sm mt-1">{activeAlertDetails.title}</h4>
              </div>
              <button
                onClick={() => setActiveAlertDetails(null)}
                className="text-slate-400 hover:text-white p-1 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-2 text-[11px]">
              <p className="text-slate-300 leading-relaxed">{activeAlertDetails.description}</p>

              <div className="p-2.5 rounded-lg bg-slate-900/60 border border-slate-700 space-y-1.5 font-mono">
                <div className="flex justify-between">
                  <span className="text-slate-400">Location:</span>
                  <span className="text-white font-sans">{activeAlertDetails.buildingName} {activeAlertDetails.roomName ? `• ${activeAlertDetails.roomName}` : ''}</span>
                </div>
                {activeAlertDetails.value !== undefined && activeAlertDetails.threshold !== undefined && (
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-slate-400">Reading vs Limit:</span>
                    <span className="font-bold text-rose-400">
                      {activeAlertDetails.value} {activeAlertDetails.type === 'high_voltage' ? 'V' : 'kW'} &gt; {activeAlertDetails.threshold} {activeAlertDetails.type === 'high_voltage' ? 'V Limit' : 'kW Limit'}
                    </span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="text-slate-400">Detected:</span>
                  <span className="text-slate-300">{new Date(activeAlertDetails.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>

              {actionMessage && (
                <div className="p-2 rounded bg-cyan-500/20 border border-cyan-500/40 text-[10px] text-cyan-300 flex items-center gap-1.5">
                  <Check className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
                  <span>{actionMessage}</span>
                </div>
              )}

              {/* Action Buttons */}
              <div className="pt-2 flex flex-col gap-2">
                <div className="grid grid-cols-2 gap-2">
                  <button
                    disabled={isResolvingAlert}
                    onClick={() => handleAcknowledgeAlert(activeAlertDetails.id)}
                    className="py-1.5 px-2 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-600 font-semibold text-center transition-all"
                  >
                    Acknowledge
                  </button>
                  <button
                    disabled={isResolvingAlert}
                    onClick={() => handleResolveAlert(activeAlertDetails.id)}
                    className="py-1.5 px-2 rounded-lg bg-rose-600 hover:bg-rose-500 text-white font-semibold text-center shadow-md transition-all"
                  >
                    Resolve Fault
                  </button>
                </div>

                {activeAlertDetails.roomId && onNavigateToRoomControl && (
                  <button
                    onClick={() => onNavigateToRoomControl(activeAlertDetails.roomId!, activeAlertDetails.buildingId || '')}
                    className="w-full py-1.5 px-2 rounded-lg bg-cyan-600/20 hover:bg-cyan-600 hover:text-white border border-cyan-500/40 text-cyan-300 font-semibold flex items-center justify-center gap-1.5 transition-all text-xs"
                  >
                    <Power className="w-3.5 h-3.5" /> Open Room Energy & Control →
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* ================= MAP MARKER LEGEND (BOTTOM LEFT) ================= */}
        <div className="absolute bottom-4 left-4 z-10 bg-[#0F172A]/90 border border-slate-700/80 p-3 rounded-xl backdrop-blur text-[11px] text-slate-200 shadow-xl max-w-xs space-y-1.5">
          <span className="text-[10px] uppercase font-bold text-slate-400 block tracking-wider">
            Verified MITS Campus Legend
          </span>
          <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-[11px]">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
              <span>Main Building</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-amber-500 shrink-0" />
              <span>Old Building</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0" />
              <span>Library</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-pink-500 shrink-0" />
              <span>Hostels</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-cyan-500 shrink-0" />
              <span>Computing Labs</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-orange-500 shrink-0" />
              <span>Canteen</span>
            </div>
          </div>
        </div>
      </div>

      {/* ================= GOOGLE API KEY MODAL ================= */}
      {showApiKeyModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0F172A] border border-cyan-500/40 rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-700 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-cyan-400" />
                <h3 className="text-sm font-bold text-white">Google Photorealistic 3D Tiles API</h3>
              </div>
              <button onClick={() => setShowApiKeyModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-300">
              Provide your Google Maps JavaScript API key with Map Tiles API enabled to stream live photorealistic 3D mesh imagery for MITS Gwalior.
            </p>
            <div>
              <label className="text-[11px] font-semibold text-slate-400 block mb-1">
                API Key:
              </label>
              <input
                type="password"
                placeholder="AIzaSy..."
                defaultValue={googleApiKey}
                id="gmaps-api-key-input"
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500 font-mono"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setShowApiKeyModal(false)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  const input = document.getElementById('gmaps-api-key-input') as HTMLInputElement;
                  handleSaveGoogleKey(input?.value || '');
                }}
                className="px-4 py-1.5 rounded-lg text-xs font-bold bg-cyan-600 hover:bg-cyan-500 text-white shadow-sm"
              >
                Save & Connect
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
