import React, { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { Building, Model3DManifest } from '../../../../shared/types.js';
import { 
  Maximize2, RotateCcw, Compass, Layers, 
  Search, Info, Settings, Eye, CheckCircle2, AlertTriangle, X
} from 'lucide-react';

interface CampusViewer3DProps {
  buildings: Building[];
  selectedBuildingId?: string | null;
  onSelectBuilding: (buildingId: string | null) => void;
  manifest: Model3DManifest;
  onSaveManifest: (manifest: Model3DManifest) => void;
}

export const CampusViewer3D: React.FC<CampusViewer3DProps> = ({
  buildings = [],
  selectedBuildingId,
  onSelectBuilding,
  manifest,
  onSaveManifest
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const sceneRef = useRef<THREE.Scene | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const buildingMeshesRef = useRef<Map<string, THREE.Group | THREE.Mesh>>(new Map());
  const animationFrameRef = useRef<number | null>(null);

  const [hoveredBuilding, setHoveredBuilding] = useState<Building | null>(null);
  const [activeFloorLevel, setActiveFloorLevel] = useState<number | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [customGlbUrl, setCustomGlbUrl] = useState(manifest?.model?.url || '/models/campus-model.glb');
  const [modelLoading, setModelLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [detectedMeshes, setDetectedMeshes] = useState<string[]>([]);
  const [viewPreset, setViewPreset] = useState<'isometric' | 'top' | 'academic' | 'hostels'>('isometric');

  // Selected building object
  const activeBuilding = buildings.find(b => b.id === selectedBuildingId);

  // Initialize Three.js Scene
  useEffect(() => {
    if (!containerRef.current || !canvasRef.current) return;

    const width = containerRef.current.clientWidth;
    const height = containerRef.current.clientHeight;

    // 1. Scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x0A0F1D);
    scene.fog = new THREE.FogExp2(0x0A0F1D, 0.0035);
    sceneRef.current = scene;

    // 2. Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 1, 2000);
    camera.position.set(130, 100, 150);
    cameraRef.current = camera;

    // 3. Renderer
    const renderer = new THREE.WebGLRenderer({
      canvas: canvasRef.current,
      antialias: true,
      powerPreference: 'high-performance'
    });
    renderer.setSize(width, height);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    rendererRef.current = renderer;

    // 4. Orbit Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.maxPolarAngle = Math.PI / 2 - 0.05; // Prevent camera from going beneath floor
    controls.minDistance = 20;
    controls.maxDistance = 450;
    controls.target.set(0, 0, 0);
    controlsRef.current = controls;

    // 5. Lighting
    const ambientLight = new THREE.AmbientLight(0x94A3B8, 0.9);
    scene.add(ambientLight);

    const sunLight = new THREE.DirectionalLight(0xE0F2FE, 1.4);
    sunLight.position.set(120, 180, 80);
    sunLight.castShadow = true;
    sunLight.shadow.mapSize.width = 2048;
    sunLight.shadow.mapSize.height = 2048;
    sunLight.shadow.camera.near = 10;
    sunLight.shadow.camera.far = 500;
    sunLight.shadow.camera.left = -160;
    sunLight.shadow.camera.right = 160;
    sunLight.shadow.camera.top = 160;
    sunLight.shadow.camera.bottom = -160;
    scene.add(sunLight);

    const hemiLight = new THREE.HemisphereLight(0x38BDF8, 0x0F172A, 0.4);
    scene.add(hemiLight);

    // 6. Architectural Ground Plane & Grid
    const groundGeo = new THREE.PlaneGeometry(600, 600);
    const groundMat = new THREE.MeshStandardMaterial({
      color: 0x0F172A,
      roughness: 0.9,
      metalness: 0.1
    });
    const ground = new THREE.Mesh(groundGeo, groundMat);
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    scene.add(ground);

    // Campus Grid
    const gridHelper = new THREE.GridHelper(500, 50, 0x1E293B, 0x151E32);
    gridHelper.position.y = 0.05;
    scene.add(gridHelper);

    // Campus Road & Pathway Network
    createCampusRoads(scene);

    // Landscaping Trees & Vegetation
    createLandscapeVegetation(scene);

    // 7. Load or Build Campus Buildings
    buildPlaceholderCampusBuildings(scene, buildings);

    // 8. Raycaster for Building Selection & Hover
    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();

    const handlePointerMove = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const meshes: THREE.Object3D[] = [];
      buildingMeshesRef.current.forEach(mesh => meshes.push(mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && !hitObject.userData.buildingId && hitObject.parent) {
          hitObject = hitObject.parent;
        }

        if (hitObject && hitObject.userData.buildingId) {
          const b = buildings.find(item => item.id === hitObject!.userData.buildingId);
          setHoveredBuilding(b || null);
          canvasRef.current.style.cursor = 'pointer';
          return;
        }
      }
      setHoveredBuilding(null);
      canvasRef.current.style.cursor = 'default';
    };

    const handleClick = (e: MouseEvent) => {
      if (!canvasRef.current || !cameraRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      raycaster.setFromCamera(mouse, cameraRef.current);
      const meshes: THREE.Object3D[] = [];
      buildingMeshesRef.current.forEach(mesh => meshes.push(mesh));

      const intersects = raycaster.intersectObjects(meshes, true);
      if (intersects.length > 0) {
        let hitObject: THREE.Object3D | null = intersects[0].object;
        while (hitObject && !hitObject.userData.buildingId && hitObject.parent) {
          hitObject = hitObject.parent;
        }

        if (hitObject && hitObject.userData.buildingId) {
          onSelectBuilding(hitObject.userData.buildingId);
          focusCameraOnBuilding(hitObject.userData.buildingId);
        }
      }
    };

    const canvasEl = canvasRef.current;
    canvasEl.addEventListener('mousemove', handlePointerMove);
    canvasEl.addEventListener('click', handleClick);

    // 9. Resize handler
    const handleResize = () => {
      if (!containerRef.current || !rendererRef.current || !cameraRef.current) return;
      const newW = containerRef.current.clientWidth;
      const newH = containerRef.current.clientHeight;
      cameraRef.current.aspect = newW / newH;
      cameraRef.current.updateProjectionMatrix();
      rendererRef.current.setSize(newW, newH);
    };

    window.addEventListener('resize', handleResize);

    // 10. Animation Loop
    const animate = () => {
      animationFrameRef.current = requestAnimationFrame(animate);

      if (controlsRef.current) {
        controlsRef.current.update();
      }

      // Pulse hotspot pins
      scene.children.forEach(child => {
        if (child.userData.isHotspot) {
          child.rotation.y += 0.02;
        }
      });

      if (rendererRef.current && sceneRef.current && cameraRef.current) {
        rendererRef.current.render(sceneRef.current, cameraRef.current);
      }
    };
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      canvasEl.removeEventListener('mousemove', handlePointerMove);
      canvasEl.removeEventListener('click', handleClick);
      if (animationFrameRef.current) cancelAnimationFrame(animationFrameRef.current);
      renderer.dispose();
    };
  }, [buildings]);

  // Handle building focus camera animation
  const focusCameraOnBuilding = (buildingId: string) => {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !cameraRef.current || !controlsRef.current) return;

    const [bx, by, bz] = building.centerCoordinates;
    controlsRef.current.target.set(bx, by, bz);

    // Smooth offset
    cameraRef.current.position.set(bx + 40, by + 30, bz + 45);
    controlsRef.current.update();
  };

  // Helper to create architectural massing buildings
  const buildPlaceholderCampusBuildings = (scene: THREE.Scene, buildingList: Building[]) => {
    buildingMeshesRef.current.clear();

    const buildingConfig: { [key: string]: { w: number; h: number; d: number; color: number } } = {
      BUILDING_ADMIN: { w: 34, h: 18, d: 24, color: 0x06B6D4 },
      BUILDING_ENG_ACADEMIC: { w: 46, h: 32, d: 30, color: 0x3B82F6 },
      BUILDING_HOSTEL_A: { w: 40, h: 22, d: 24, color: 0x10B981 },
      BUILDING_HOSTEL_B: { w: 40, h: 22, d: 24, color: 0xEC4899 },
      BUILDING_LIBRARY: { w: 32, h: 16, d: 28, color: 0x8B5CF6 },
      BUILDING_CAFETERIA: { w: 30, h: 12, d: 22, color: 0xF59E0B },
      BUILDING_SCIENCE_LABS: { w: 42, h: 24, d: 26, color: 0x0EA5E9 },
      BUILDING_SPORTS_COMPLEX: { w: 45, h: 18, d: 35, color: 0xEF4444 },
      BUILDING_SOLAR_FARM: { w: 36, h: 2, d: 30, color: 0xEAB308 },
      BUILDING_WATER_PUMP_STATION: { w: 20, h: 10, d: 16, color: 0x0284C7 }
    };

    buildingList.forEach(b => {
      const cfg = buildingConfig[b.id] || { w: 25, h: 15, d: 20, color: 0x3B82F6 };
      const [x, , z] = b.centerCoordinates;
      const y = cfg.h / 2;

      const group = new THREE.Group();
      group.userData = { buildingId: b.id, name: b.name, category: b.category };
      group.position.set(x, y, z);

      // Main structural block
      const geo = new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d);
      const mat = new THREE.MeshStandardMaterial({
        color: cfg.color,
        roughness: 0.4,
        metalness: 0.3,
        transparent: true,
        opacity: 0.88
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);

      // Edges highlight wireframe
      const edges = new THREE.EdgesGeometry(geo);
      const lineMat = new THREE.LineBasicMaterial({ color: 0xFFFFFF, opacity: 0.4, transparent: true });
      const wireframe = new THREE.LineSegments(edges, lineMat);
      group.add(wireframe);

      // Glass ribbon windows / architectural facade pattern
      const windowGeo = new THREE.BoxGeometry(cfg.w + 0.2, cfg.h * 0.15, cfg.d + 0.2);
      const windowMat = new THREE.MeshStandardMaterial({
        color: 0x38BDF8,
        emissive: 0x0284C7,
        emissiveIntensity: 0.3,
        roughness: 0.1
      });
      for (let floor = 1; floor <= b.totalFloors; floor++) {
        const floorY = -cfg.h / 2 + (floor / (b.totalFloors + 1)) * cfg.h;
        const windowMesh = new THREE.Mesh(windowGeo, windowMat);
        windowMesh.position.y = floorY;
        group.add(windowMesh);
      }

      // Hotspot beacon pin on roof
      const pinGroup = new THREE.Group();
      pinGroup.userData = { isHotspot: true, buildingId: b.id };
      pinGroup.position.set(0, cfg.h / 2 + 3.5, 0);

      const beaconGeo = new THREE.OctahedronGeometry(1.6);
      const beaconMat = new THREE.MeshStandardMaterial({
        color: b.status === 'critical' ? 0xEF4444 : b.status === 'warning' ? 0xF59E0B : 0x06B6D4,
        emissive: b.status === 'critical' ? 0xDC2626 : b.status === 'warning' ? 0xD97706 : 0x0891B2,
        emissiveIntensity: 0.8
      });
      const beacon = new THREE.Mesh(beaconGeo, beaconMat);
      pinGroup.add(beacon);

      group.add(pinGroup);
      scene.add(group);
      buildingMeshesRef.current.set(b.id, group);
    });
  };

  // Roads and paths
  const createCampusRoads = (scene: THREE.Scene) => {
    const roadMat = new THREE.MeshStandardMaterial({ color: 0x1E293B, roughness: 0.8 });
    
    // Main Spine Avenue
    const roadMainGeo = new THREE.PlaneGeometry(16, 320);
    const roadMain = new THREE.Mesh(roadMainGeo, roadMat);
    roadMain.rotation.x = -Math.PI / 2;
    roadMain.position.set(0, 0.08, 0);
    roadMain.receiveShadow = true;
    scene.add(roadMain);

    // Cross Ring Road
    const roadRingGeo = new THREE.PlaneGeometry(320, 14);
    const roadRing = new THREE.Mesh(roadRingGeo, roadMat);
    roadRing.rotation.x = -Math.PI / 2;
    roadRing.position.set(0, 0.08, 0);
    roadRing.receiveShadow = true;
    scene.add(roadRing);
  };

  // Landscaping
  const createLandscapeVegetation = (scene: THREE.Scene) => {
    const treeTrunkGeo = new THREE.CylinderGeometry(0.4, 0.6, 3, 6);
    const treeTrunkMat = new THREE.MeshStandardMaterial({ color: 0x475569 });
    const foliageGeo = new THREE.ConeGeometry(2.5, 5, 6);
    const foliageMat = new THREE.MeshStandardMaterial({ color: 0x065F46, roughness: 0.8 });

    const treePositions = [
      [-25, -20], [-25, 20], [25, -20], [25, 20],
      [-15, 65], [15, 65], [-45, 10], [45, 10],
      [-30, -70], [30, -70]
    ];

    treePositions.forEach(([tx, tz]) => {
      const tree = new THREE.Group();
      tree.position.set(tx, 0, tz);

      const trunk = new THREE.Mesh(treeTrunkGeo, treeTrunkMat);
      trunk.position.y = 1.5;
      trunk.castShadow = true;
      tree.add(trunk);

      const foliage = new THREE.Mesh(foliageGeo, foliageMat);
      foliage.position.y = 4.8;
      foliage.castShadow = true;
      tree.add(foliage);

      scene.add(tree);
    });
  };

  // Camera preset handler
  const setCameraPreset = (preset: 'isometric' | 'top' | 'academic' | 'hostels') => {
    setViewPreset(preset);
    if (!cameraRef.current || !controlsRef.current) return;

    if (preset === 'isometric') {
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(130, 100, 150);
    } else if (preset === 'top') {
      controlsRef.current.target.set(0, 0, 0);
      cameraRef.current.position.set(0, 220, 10);
    } else if (preset === 'academic') {
      controlsRef.current.target.set(40, 10, -10);
      cameraRef.current.position.set(75, 45, 40);
    } else if (preset === 'hostels') {
      controlsRef.current.target.set(-65, 10, 10);
      cameraRef.current.position.set(-30, 45, 60);
    }
    controlsRef.current.update();
  };

  return (
    <div className="relative w-full h-[620px] bg-[#0A0F1D] rounded-xl overflow-hidden border border-[#1F2E4D] shadow-2xl flex flex-col">
      {/* Disclaimer / Model Readiness Banner */}
      <div className="bg-slate-900/90 border-b border-cyan-500/20 px-4 py-2 flex flex-wrap items-center justify-between text-xs z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping"></span>
          <span className="font-semibold text-cyan-300">CAMPUS ENERGY &amp; ENVIRONMENT (3D VIEWPORT)</span>
          <span className="text-slate-500">|</span>
          <span className="text-slate-400">
            Current Scene: <strong className="text-slate-200">Integration-Ready Placeholder</strong> (Your college .GLB model can be loaded below)
          </span>
        </div>
        <button
          onClick={() => setShowConfigModal(true)}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 transition-colors text-[11px]"
        >
          <Settings className="w-3.5 h-3.5" />
          <span>3D Model & Mesh Mappings</span>
        </button>
      </div>

      {/* Main Canvas Viewport */}
      <div ref={containerRef} className="relative flex-1 w-full h-full">
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Top Control Bar: Search & Camera Presets */}
        <div className="absolute top-4 left-4 z-10 flex flex-wrap items-center gap-2">
          {/* Search building autocomplete */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <input
              type="text"
              placeholder="Search building..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-slate-900/80 border border-slate-700 text-white text-xs pl-8 pr-3 py-1.5 rounded-lg w-48 backdrop-blur-md focus:border-cyan-500 focus:outline-none"
            />
            {searchQuery && (
              <div className="absolute top-9 left-0 w-64 bg-slate-900/95 border border-slate-700 rounded-lg shadow-2xl p-1 z-30">
                {buildings
                  .filter(b => b.name.toLowerCase().includes(searchQuery.toLowerCase()))
                  .map(b => (
                    <button
                      key={b.id}
                      onClick={() => {
                        onSelectBuilding(b.id);
                        focusCameraOnBuilding(b.id);
                        setSearchQuery('');
                      }}
                      className="w-full text-left p-2 rounded hover:bg-slate-800 text-xs flex items-center justify-between"
                    >
                      <span className="text-slate-200 font-medium">{b.name}</span>
                      <span className="text-cyan-400 font-mono text-[10px]">{b.currentPowerKw} kW</span>
                    </button>
                  ))}
              </div>
            )}
          </div>

          {/* Camera presets */}
          <div className="flex items-center bg-slate-900/80 border border-slate-700 rounded-lg p-0.5 backdrop-blur-md text-xs">
            <button
              onClick={() => setCameraPreset('isometric')}
              className={`px-2.5 py-1 rounded transition-colors ${viewPreset === 'isometric' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Masterplan
            </button>
            <button
              onClick={() => setCameraPreset('top')}
              className={`px-2.5 py-1 rounded transition-colors ${viewPreset === 'top' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Top-Down
            </button>
            <button
              onClick={() => setCameraPreset('academic')}
              className={`px-2.5 py-1 rounded transition-colors ${viewPreset === 'academic' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Academic
            </button>
            <button
              onClick={() => setCameraPreset('hostels')}
              className={`px-2.5 py-1 rounded transition-colors ${viewPreset === 'hostels' ? 'bg-cyan-500 text-white font-medium' : 'text-slate-400 hover:text-white'}`}
            >
              Hostels
            </button>
          </div>

          <button
            onClick={() => setCameraPreset('isometric')}
            title="Reset Camera View"
            className="p-1.5 rounded-lg bg-slate-900/80 border border-slate-700 text-slate-300 hover:text-white backdrop-blur-md"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
        </div>

        {/* Hover Tooltip HUD */}
        {hoveredBuilding && (
          <div className="absolute bottom-6 left-6 z-10 bg-slate-900/90 border border-cyan-500/50 backdrop-blur-md p-3.5 rounded-xl shadow-2xl w-64 pointer-events-none animate-fadeIn">
            <div className="flex items-center justify-between pb-1.5 border-b border-slate-800">
              <span className="font-semibold text-white text-xs truncate">{hoveredBuilding.name}</span>
              <span className={`w-2 h-2 rounded-full ${
                hoveredBuilding.status === 'critical' ? 'bg-rose-500 animate-ping' :
                hoveredBuilding.status === 'warning' ? 'bg-amber-500' : 'bg-emerald-400'
              }`}></span>
            </div>
            <div className="grid grid-cols-2 gap-2 mt-2 text-[11px]">
              <div>
                <span className="text-slate-400 block text-[10px]">ACTIVE DEMAND</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">{hoveredBuilding.currentPowerKw} kW</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">TODAY ENERGY</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{hoveredBuilding.todayEnergyKwh} kWh</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">FLOORS</span>
                <span className="text-slate-200">{hoveredBuilding.totalFloors} Levels ({hoveredBuilding.totalRooms} Rooms)</span>
              </div>
              <div>
                <span className="text-slate-400 block text-[10px]">POWER FACTOR</span>
                <span className="font-mono text-slate-200">{hoveredBuilding.powerFactor} PF</span>
              </div>
            </div>
            <div className="mt-2 text-[10px] text-cyan-400 flex items-center gap-1 font-medium">
              <span>👉 Click to open floor breakdown</span>
            </div>
          </div>
        )}

        {/* Selected Building Detail Panel (Flyout / Bottom Bar) */}
        {activeBuilding && (
          <div className="absolute top-4 right-4 z-10 w-80 bg-slate-900/95 border border-cyan-500/40 backdrop-blur-md rounded-xl p-4 shadow-2xl animate-slideIn">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded text-[10px] font-mono bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                  {activeBuilding.code}
                </span>
                <h4 className="font-bold text-white text-xs truncate max-w-[170px]">{activeBuilding.name}</h4>
              </div>
              <button
                onClick={() => onSelectBuilding(null)}
                className="text-slate-400 hover:text-white p-1"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Breadcrumb navigation */}
            <div className="text-[10px] text-slate-400 mt-2 font-mono flex items-center gap-1">
              <span>Campus</span>
              <span>&gt;</span>
              <span className="text-cyan-400">{activeBuilding.name}</span>
              {activeFloorLevel !== null && (
                <>
                  <span>&gt;</span>
                  <span className="text-amber-400">Floor 0{activeFloorLevel}</span>
                </>
              )}
            </div>

            {/* Metrics */}
            <div className="grid grid-cols-2 gap-2 my-3 text-xs">
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">CURRENT POWER</span>
                <span className="font-mono font-bold text-cyan-300 text-sm">{activeBuilding.currentPowerKw} kW</span>
              </div>
              <div className="p-2 rounded bg-slate-800/60 border border-slate-700/60">
                <span className="text-[10px] text-slate-400 block">TODAY'S COST</span>
                <span className="font-mono font-bold text-white text-sm">₹{activeBuilding.todayCost}</span>
              </div>
            </div>

            {/* Floor Navigation Selector */}
            <div className="mt-2 pt-2 border-t border-slate-800">
              <span className="text-[11px] font-semibold text-slate-300 block mb-1.5 flex items-center justify-between">
                <span>Floor Level Explorer</span>
                <span className="text-[10px] text-slate-400">{activeBuilding.totalFloors} Total Levels</span>
              </span>
              <div className="grid grid-cols-4 gap-1.5 text-xs font-mono">
                {Array.from({ length: activeBuilding.totalFloors }).map((_, f) => (
                  <button
                    key={f}
                    onClick={() => setActiveFloorLevel(activeFloorLevel === f ? null : f)}
                    className={`p-1.5 rounded text-center transition-colors border ${
                      activeFloorLevel === f
                        ? 'bg-cyan-500 border-cyan-400 text-white font-bold'
                        : 'bg-slate-800/70 border-slate-700 text-slate-300 hover:bg-slate-700'
                    }`}
                  >
                    {f === 0 ? 'GF' : `L${f}`}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-3 pt-2 border-t border-slate-800 flex items-center gap-2">
              <button
                onClick={() => focusCameraOnBuilding(activeBuilding.id)}
                className="flex-1 py-1.5 rounded bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-medium text-center transition-colors"
              >
                Focus Camera
              </button>
              <button
                onClick={() => {
                  // Switch to energy monitoring tab for this building
                  const el = document.getElementById('tab-energy');
                  if (el) el.click();
                }}
                className="py-1.5 px-3 rounded bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs border border-slate-700"
              >
                Full Analytics
              </button>
            </div>
          </div>
        )}

        {/* 2D Minimap Radar in Corner */}
        <div className="absolute bottom-4 right-4 z-10 w-28 h-28 rounded-xl bg-slate-900/90 border border-slate-700 backdrop-blur-md p-1 pointer-events-none shadow-xl flex flex-col items-center justify-center">
          <div className="relative w-full h-full rounded-lg border border-cyan-500/20 bg-slate-950/60 overflow-hidden flex items-center justify-center">
            {/* Concentric radar rings */}
            <div className="absolute w-20 h-20 rounded-full border border-cyan-500/20"></div>
            <div className="absolute w-12 h-12 rounded-full border border-cyan-500/20"></div>
            {/* Campus buildings dots */}
            {buildings.map(b => (
              <div
                key={b.id}
                className={`absolute w-1.5 h-1.5 rounded-full ${
                  b.id === selectedBuildingId ? 'bg-cyan-400 ring-2 ring-cyan-300' : 'bg-slate-500'
                }`}
                style={{
                  left: `${50 + (b.centerCoordinates[0] / 300) * 45}%`,
                  top: `${50 + (b.centerCoordinates[2] / 300) * 45}%`
                }}
              />
            ))}
            <span className="absolute bottom-1 right-1 text-[8px] font-mono text-slate-500">RADAR</span>
          </div>
        </div>
      </div>

      {/* 3D Model Configuration & GLB Importer Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-[#111827] border border-[#1F2E4D] rounded-2xl w-full max-w-2xl max-h-[85vh] overflow-y-auto p-6 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Settings className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">3D College Model Integration & Mesh Mapping</h3>
              </div>
              <button onClick={() => setShowConfigModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-xs">
              <div className="p-3 rounded-lg bg-cyan-950/30 border border-cyan-500/30 text-cyan-200">
                <p className="font-semibold mb-1">Future 3D Model Architecture Verified</p>
                <p className="text-[11px] text-cyan-300/80">
                  When you are ready with your actual college 3D model, place the <code className="bg-cyan-900/40 px-1 py-0.5 rounded text-white">.glb</code> file in the public folder or enter its URL below. The system automatically reads mesh names and binds them to your campus building IDs.
                </p>
              </div>

              <div>
                <label className="block text-slate-300 font-medium mb-1">Model Asset URL / Path</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={customGlbUrl}
                    onChange={(e) => setCustomGlbUrl(e.target.value)}
                    placeholder="/models/my-college-campus.glb"
                    className="flex-1 bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-white font-mono text-xs focus:border-cyan-500 focus:outline-none"
                  />
                  <button
                    onClick={() => {
                      setModelLoading(true);
                      setLoadError(null);
                      // Test loading GLTF
                      const loader = new GLTFLoader();
                      loader.load(
                        customGlbUrl,
                        (gltf) => {
                          setModelLoading(false);
                          const names: string[] = [];
                          gltf.scene.traverse((child) => {
                            if (child.name) names.push(child.name);
                          });
                          setDetectedMeshes(names.slice(0, 20));
                          alert(`Success! Model loaded with ${names.length} meshes.`);
                        },
                        undefined,
                        (err) => {
                          setModelLoading(false);
                          setLoadError('Model file not found yet. Keep using the placeholder scene until the college model is exported.');
                        }
                      );
                    }}
                    className="px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white rounded-lg font-medium transition-colors"
                  >
                    {modelLoading ? 'Testing...' : 'Test Load'}
                  </button>
                </div>
                {loadError && (
                  <p className="mt-1 text-amber-400 text-[11px] flex items-center gap-1">
                    <AlertTriangle className="w-3.5 h-3.5" /> {loadError}
                  </p>
                )}
              </div>

              {/* Configured Mesh Mappings Table */}
              <div>
                <label className="block text-slate-300 font-medium mb-1.5">Registered Building & Mesh Mappings</label>
                <div className="border border-slate-800 rounded-lg overflow-hidden">
                  <table className="w-full text-left text-[11px]">
                    <thead className="bg-slate-900/80 text-slate-400 border-b border-slate-800">
                      <tr>
                        <th className="p-2">Database Building</th>
                        <th className="p-2">Stable ID</th>
                        <th className="p-2">Expected 3D Mesh Name</th>
                        <th className="p-2">Center Offset [X,Y,Z]</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800 font-mono text-slate-300">
                      {manifest?.buildingMappings?.map((m) => (
                        <tr key={m.buildingId} className="hover:bg-slate-800/40">
                          <td className="p-2 font-sans font-medium text-white">{m.displayName}</td>
                          <td className="p-2 text-cyan-400">{m.buildingId}</td>
                          <td className="p-2 text-purple-400">{m.meshName}</td>
                          <td className="p-2 text-slate-400">[{m.centerOffset.join(', ')}]</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Documentation link */}
              <div className="pt-3 border-t border-slate-800 flex items-center justify-between">
                <span className="text-slate-400 text-[11px]">
                  Reference doc: <strong className="text-white">3D_MODEL_INTEGRATION_GUIDE.md</strong>
                </span>
                <button
                  onClick={() => setShowConfigModal(false)}
                  className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg font-medium"
                >
                  Close Settings
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
