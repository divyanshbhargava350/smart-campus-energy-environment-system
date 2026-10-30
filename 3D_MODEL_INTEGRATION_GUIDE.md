# Smart Campus Digital Twin — Future 3D Model Integration Guide

This guide details how to integrate your actual college 3D model (GLB / GLTF) into the **Smart Campus Energy & Infrastructure Management System** without code modifications or structural redesigns.

---

## 1. Architectural Philosophy

The application treats the 3D campus viewer as a **pluggable digital twin viewport**. 

The digital twin architecture separates:
1. **The 3D Visual Asset Layer** (Meshes, materials, lighting, cameras, coordinate bounds).
2. **The Spatial Semantic Mapping Layer** (`campus-model-manifest.json` and database configuration).
3. **The Live Telemetry & Entity Layer** (Meters, IoT sensors, rooms, floors, buildings, power data).

This means the application never assumes fixed mesh names or geometry. When your official 3D college model is ready, you only configure the manifest file and drop the `.glb` file into the designated asset folder.

```
       ┌────────────────────────────────────────────────────────┐
       │                3D College Model (.glb)                 │
       │   [Mesh_Admin] [Mesh_Library] [Mesh_HostelA] ...       │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │         campus-model-manifest.json (Config)            │
       │  - Asset URL / Path                                    │
       │  - Model Scale & Orientation (X, Y, Z)                 │
       │  - Mesh-to-Building ID Mappings                        │
       │  - Camera Defaults & Building Focus Offsets            │
       │  - Floor Extrusions / Levels                           │
       └──────────────────────────┬─────────────────────────────┘
                                  │
                                  ▼
       ┌────────────────────────────────────────────────────────┐
       │      Campus Hierarchy & Telemetry Database (SQLite)    │
       │   Building (BUILDING_ADMIN)                            │
       │     └── Floor (FLOOR_ADM_01)                           │
       │           └── Room (ROOM_SERVER_ROOM)                  │
       │                 └── Meter (MTR_ADM_001)                │
       │                       └── Real-time Telemetry (kW, kWh)│
       └────────────────────────────────────────────────────────┘
```

---

## 2. Supported 3D Model Formats & Specifications

- **Format**: `.glb` (Binary glTF 2.0 recommended for embedded textures and fast load times) or `.gltf` with external buffers.
- **Coordinate System**: Right-handed Y-up (standard glTF / Three.js convention).
- **Scale**: Real-world metric scale ($1.0 \text{ unit} = 1.0 \text{ meter}$).
- **Target Polygon Count**: campus overview models should ideally be between 50,000 to 250,000 triangles for smooth 60 FPS performance on all client devices.
- **Materials**: Standard PBR materials (`MeshStandardMaterial` or `MeshPhysicalMaterial`).
- **Texture Resolutions**: Max $2048 \times 2048$ for ground planes; $1024 \times 1024$ for individual building façades.

---

## 3. Step-by-Step Integration Procedure

### Step 1: Place Your Model File
Copy your compiled model file to the public model assets directory:
```bash
cp your-college-model.glb client/public/models/campus-model.glb
```
*(Alternatively, in the web application, Super Admins can use the **3D Model Configurator** dialog to upload the file directly or specify a remote CDN/URL).*

---

### Step 2: Configure the Manifest (`campus-model-manifest.json`)
Open `client/src/config/campus-model-manifest.json` (or edit via the Admin 3D Settings panel):

```json
{
  "model": {
    "enabled": true,
    "sourceType": "glb",
    "url": "/models/campus-model.glb",
    "scale": [1.0, 1.0, 1.0],
    "rotation": [0, 0, 0],
    "position": [0, 0, 0],
    "castShadows": true,
    "receiveShadows": true
  },
  "camera": {
    "defaultPosition": [120, 95, 140],
    "defaultTarget": [0, 0, 0],
    "fov": 45,
    "near": 0.1,
    "far": 2000,
    "maxPolarAngle": 1.48
  },
  "environment": {
    "sunColor": "#ffffff",
    "sunIntensity": 1.4,
    "ambientColor": "#64748b",
    "ambientIntensity": 0.7,
    "skyBackgroundColor": "#0b1329",
    "enableFog": true,
    "fogColor": "#0b1329",
    "fogNear": 150,
    "fogFar": 500
  },
  "buildingMappings": [
    {
      "buildingId": "BUILDING_ADMIN",
      "meshName": "Mesh_Administration_Block",
      "displayName": "Administrative Complex",
      "category": "Administrative",
      "centerOffset": [0, 8, -40],
      "hotspotPosition": [0, 18, -40],
      "cameraFocusOffset": [40, 30, 40],
      "colorHighlight": "#06b6d4"
    },
    {
      "buildingId": "BUILDING_ENG_ACADEMIC",
      "meshName": "Mesh_Engineering_Academic_Tower",
      "displayName": "Engineering & Computing Complex",
      "category": "Academic",
      "centerOffset": [50, 12, 10],
      "hotspotPosition": [50, 26, 10],
      "cameraFocusOffset": [35, 25, 35],
      "colorHighlight": "#3b82f6"
    },
    {
      "buildingId": "BUILDING_HOSTEL_A",
      "meshName": "Mesh_Hostel_Block_Aryabhata",
      "displayName": "Aryabhata Hostel (Boys)",
      "category": "Residential",
      "centerOffset": [-60, 10, 45],
      "hotspotPosition": [-60, 22, 45],
      "cameraFocusOffset": [30, 20, 30],
      "colorHighlight": "#10b981"
    },
    {
      "buildingId": "BUILDING_HOSTEL_B",
      "meshName": "Mesh_Hostel_Block_Gargi",
      "displayName": "Gargi Hostel (Girls)",
      "category": "Residential",
      "centerOffset": [-70, 10, -30],
      "hotspotPosition": [-70, 22, -30],
      "cameraFocusOffset": [30, 20, 30],
      "colorHighlight": "#ec4899"
    },
    {
      "buildingId": "BUILDING_LIBRARY",
      "meshName": "Mesh_Central_Library",
      "displayName": "Central Knowledge Repository & Library",
      "category": "Academic",
      "centerOffset": [-10, 7, 30],
      "hotspotPosition": [-10, 15, 30],
      "cameraFocusOffset": [25, 18, 25],
      "colorHighlight": "#8b5cf6"
    },
    {
      "buildingId": "BUILDING_CAFETERIA",
      "meshName": "Mesh_Dining_FoodCourt",
      "displayName": "Campus Dining & Student Center",
      "category": "Dining",
      "centerOffset": [20, 6, 60],
      "hotspotPosition": [20, 13, 60],
      "cameraFocusOffset": [22, 16, 22],
      "colorHighlight": "#f59e0b"
    },
    {
      "buildingId": "BUILDING_SCIENCE_LABS",
      "meshName": "Mesh_Research_Science_Labs",
      "displayName": "Advanced Science & Materials Labs",
      "category": "Laboratory",
      "centerOffset": [80, 8, -35],
      "hotspotPosition": [80, 18, -35],
      "cameraFocusOffset": [28, 22, 28],
      "colorHighlight": "#06b6d4"
    },
    {
      "buildingId": "BUILDING_SPORTS_COMPLEX",
      "meshName": "Mesh_Indoor_Sports_Arena",
      "displayName": "Indoor Stadium & Gymnasium",
      "category": "Athletics",
      "centerOffset": [-85, 9, 100],
      "hotspotPosition": [-85, 19, 100],
      "cameraFocusOffset": [35, 25, 35],
      "colorHighlight": "#ef4444"
    },
    {
      "buildingId": "BUILDING_SOLAR_FARM",
      "meshName": "Mesh_Rooftop_Solar_Array",
      "displayName": "250 kWp Rooftop Solar Farm",
      "category": "Infrastructure",
      "centerOffset": [45, 22, 12],
      "hotspotPosition": [45, 24, 12],
      "cameraFocusOffset": [20, 15, 20],
      "colorHighlight": "#eab308"
    },
    {
      "buildingId": "BUILDING_WATER_PUMP_STATION",
      "meshName": "Mesh_Water_Pumping_Station",
      "displayName": "Central Water Pumping & Treatment",
      "category": "Infrastructure",
      "centerOffset": [105, 5, 20],
      "hotspotPosition": [105, 12, 20],
      "cameraFocusOffset": [20, 15, 20],
      "colorHighlight": "#0284c7"
    }
  ]
}
```

---

## 4. How the Raycasting & Selection Works

1. **Hierarchy Matching**: When the user hovers or clicks on any 3D mesh in the viewport:
   ```typescript
   // Evaluates clicked object or any parent up the scene tree:
   const clickedMeshName = intersectedObject.name;
   const mapping = manifest.buildingMappings.find(m => 
     m.meshName === clickedMeshName || intersectedObject.name.includes(m.meshName)
   );
   ```
2. **Stable ID Link**: When a match is found (e.g. `BUILDING_ADMIN`), the 3D viewer communicates with the global state:
   - Emits `onBuildingSelected(mapping.buildingId)`.
   - The HUD displays real-time telemetry from the database (instant kW, daily kWh, alerts, power factor).
   - Animates camera to `mapping.centerOffset + mapping.cameraFocusOffset`.
   - Opens the Building Drilldown panel and Floor Navigator.

---

## 5. Floor & Room Hotspot Hierarchy

The hierarchy is strictly preserved:
$$\text{Campus} \longrightarrow \text{Building} \longrightarrow \text{Floor} \longrightarrow \text{Room/Zone} \longrightarrow \text{Meter} \longrightarrow \text{Equipment}$$

- If your 3D model contains separate meshes for floors (e.g. `Mesh_Admin_Floor_01`, `Mesh_Admin_Floor_02`):
  - Set `floorMeshPrefix: "Mesh_Admin_Floor_"` in the building mapping.
  - The viewer will support the "Exploded Floor View", sliding upper floors upwards along the Y-axis so inner rooms can be inspected in full 3D!
- If your 3D model is an exterior architectural shell only:
  - The system automatically provides the 2.5D Interactive Architectural Floor Plan overlay, keeping full room/meter drilldown functional.

---

## 6. Real-Time Telemetry Pins & Alert Glow

- Each registered building automatically renders a dynamic **Floating Hotspot Pin** at `hotspotPosition`:
  - **Cyan/Green**: Normal operation.
  - **Yellow**: Warning (e.g., consumption $> 85\%$ of budget).
  - **Red**: Active Critical Alert (e.g., peak demand spike, meter offline).
- Clicking the pin navigates directly to the building's deep-dive dashboard.

---

## 7. Verifying Model Integration in the Browser

1. Navigate to **Campus 3D Twin** in the sidebar.
2. In the top-right toolbar of the 3D canvas, click **3D Settings & Debugger**.
3. You will see:
   - Scene Hierarchy Inspector (lists all meshes found in the GLB).
   - Mesh name copy button.
   - Live bounding-box preview.
   - Coordinate crosshair helper.
   - Model reload button.
