# Smart Campus Energy and Environment System
### Configured for Madhav Institute of Technology and Science (MITS), Gwalior
*Enterprise multi-campus architecture adaptable for colleges, universities, hostels, hospitals, and industrial facilities.*

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fdivyanshbhargava350%2Fsmart-campus-energy-environment-system)
[![Deploy to Render](https://render.com/images/deploy-to-render-button.svg)](https://render.com/deploy?repo=https://github.com/divyanshbhargava350/smart-campus-energy-environment-system)

---

## 🏛️ Platform Overview

The **Smart Campus Energy and Environment System** is a full-stack, enterprise-grade energy intelligence and environmental optimization platform. It combines an **interactive 3D campus view**, real-time **solar vs. grid balance monitoring**, **XGBoost demand forecasting**, **scikit-learn Isolation Forest anomaly detection**, an **LLM-powered natural language energy assistant**, and an **IPMVP-compliant Measurement & Verification (M&V) savings engine**.

---

## 🔑 4 Role-Based Demo Accounts

| Role | Email | Password | Access & Permissions |
| :--- | :--- | :--- | :--- |
| **Super Admin** | `admin@mits.ac.in` | `Admin@123` | Complete administrative control across all organizations, campuses, buildings, tariffs, users, and audit logs. |
| **Facility Manager** | `facility@mits.ac.in` | `Facility@123` | Control over meters, IoT fleet, work orders, anomaly investigations, and M&V optimization approvals. |
| **Department HOD** | `hod.aids@mits.ac.in` | `Hod@123` | **Strict Data Isolation:** Scoped exclusively to the assigned Department (AI & Data Science). Cannot view other restricted departments. |
| **Viewer** | `viewer@mits.ac.in` | `Viewer@123` | Read-only access to authorized campus dashboards and compliance reports. |

*Self-registration with Bcrypt password hashing and duplicate email prevention is also fully active.*

---

## 🧠 Core System Capabilities

### 1. Interactive 3D Campus View & 2D Blueprints
- **Three.js 3D Viewport:** Orbit controls, zoom, pan, building selection, hover elevation, wireframe highlights, and spatial hierarchy navigation (`Campus → Building → Floor → Room → Meter`).
- **2D Blueprint Fallback:** Seamless one-click switch between the 3D model and high-resolution 2D floor plans (Campus Masterplan, Main Building Complex, AI & Computing Labs).

### 2. Solar vs. Grid Energy Balance (Core Highlight)
- Live telemetry tickers & visual power flow diagram tracking:
  - ☀️ **Solar Generated (kW & Today kWh)**: 350 kWp Rooftop Solar array.
  - 🔋 **Solar Used on Campus (kW & kWh)**: Self-consumption metric.
  - 🔌 **Electricity Board Grid Import (kW & kWh)**: MPPKVVCL HT import.
  - ⚡ **Total Campus Load (kW)**: Net active campus demand.
  - 🌿 **Green Solar Offset Percentage & CO₂ Abated**.
  - 24-hour diurnal solar irradiance vs. academic demand profile.

### 3. Machine Learning Engine
- **Model A: XGBoost Energy Demand Regressor**
  - Trained on `synthetic_campus_energy_usage.csv`.
  - Chronological 80/20 train/test split to prevent time-series data leakage.
  - Actual vs Predicted validation table with 95% confidence intervals ($\pm 1.96 \times \sigma$).
  - 24-hour next-day diurnal forecast and 7-day future campus demand forecast.
  - Evaluation metrics: **MAE**, **RMSE**, **MAPE**, and **R² Score**.
- **Model B: scikit-learn Isolation Forest Anomaly Detection**
  - Tree-based outlier scoring detecting unexpected spikes, unmonitored overnight consumption, and CT dropouts.
  - Severity classification: Critical, High, Medium, Low.
  - Review actions: **Acknowledge**, **Resolve**, and **Dismiss with Mandatory Reason**.
- **Model C: LLM-Powered AI Energy Assistant**
  - Natural language chat copilot answering complex energy questions.
  - Grounded RAG retrieval over live campus telemetry, forecast projections, and anomaly states.
  - Configurable inference providers (Local Grounded Engine, Google Gemini API, OpenAI GPT-4o).

### 4. Kaggle & Time-Series Data Pipeline
- Data ingestion preview of `synthetic_campus_energy_usage.csv` (300 rows, 5 buildings).
- Schema mapping for `Date`, `Building_Name`, `Energy_Consumption_kWh`, and `Usage_Level`.
- One-click model retraining trigger with instant feedback.

### 5. Energy Savings Proof & Verification (M&V)
- Rigorous 3-tier savings hierarchy:
  1. **Estimated Savings:** Pre-retrofit modeled expectations.
  2. **Measured Savings:** Post-retrofit empirical sub-metered observations.
  3. **Verified Savings:** Formally reviewed & approved under IPMVP Option B methodology.
- Pre vs. Post-optimization before-and-after comparison charts.

### 6. Calibrated Environmental Quality Monitoring
- Indoor Air Quality (IAQ Index 0–500).
- Optical NDIR CO₂ sensor readings (ppm).
- Ambient temperature (°C) and relative humidity (%).
- Sensor calibration health and connection monitoring.

### 7. Multi-Campus & Multi-Tenant Support
- Global header selector to switch between **MITS Gwalior Main Campus** and **MITS Innovation & Research Park**.

---

## 🛠️ Technology Stack
- **Frontend:** React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Three.js, Vite.
- **Backend:** Node.js, Express, WebSocket (Live stream broadcast every 3s), REST APIs.
- **ML Services:** Python 3, scikit-learn (HistGradientBoostingRegressor, IsolationForest), pandas, numpy.
- **Security:** Bcryptjs password hashing, signed JWT bearer sessions, tenant/department data isolation.
- **Database:** Persistent schema with users, telemetry, datasets, anomalies, and audit logs.

---

## 🚀 Running the Application

```bash
# 1. Start the server (serves API, WebSocket, and compiled frontend)
npx tsx server/index.ts

# 2. Re-building the frontend (if modified)
npx vite build
```

Application URL: **`http://localhost:4000`**
