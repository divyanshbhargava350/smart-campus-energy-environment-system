import React from 'react';
import { Info, Cpu, Zap, Shield, Globe, Award, Leaf } from 'lucide-react';

export const AboutProjectView: React.FC = () => {
  return (
    <div className="space-y-4 animate-fadeIn max-w-4xl mx-auto">
      {/* College Identity Banner */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 shadow-md text-center">
        <img
          src="/mits-logo.jpg"
          alt="MITS Gwalior Logo"
          className="w-20 h-20 rounded-full border-2 border-cyan-500/40 shadow-lg shadow-cyan-500/10 mx-auto object-cover mb-3"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = 'none';
          }}
        />
        <h1 className="text-xl font-bold text-[var(--text-primary)] tracking-tight">
          Madhav Institute of Technology & Science, Gwalior
        </h1>
        <p className="text-xs text-[var(--text-muted)] mt-1">
          A Government Aided UGC Autonomous & NAAC Accredited Institute • Established 1957 • Gola Ka Mandir, Gwalior (M.P.)
        </p>
        <div className="mt-3 inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 text-xs font-semibold">
          Official Project Name: MITS Gwalior — Energy and Environment Management System
        </div>
      </div>

      {/* Project Objective & Background */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm space-y-3">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Globe className="w-4 h-4 text-cyan-400" /> Project Objective & Scope
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          The <strong>MITS Gwalior — Energy and Environment Management System</strong> is a full-stack smart campus platform designed to monitor, analyze, and optimize electrical energy consumption and environmental sustainability across academic departments, research labs, workshops, administrative complexes, and student hostels.
        </p>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          A central focus of the system is the real-time balance between on-campus <strong>350 kWp Rooftop Solar Generation</strong> and grid import from the regional power distribution company (MPPKVVCL). The platform enables precise tracking of self-consumption, grid offloading, peak spikes, and carbon emission reductions.
        </p>
      </div>

      {/* Technical Architecture */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Cpu className="w-4 h-4 text-cyan-400" /> Technology Stack
          </h3>
          <ul className="text-xs text-[var(--text-secondary)] space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span><strong>Frontend:</strong> React 18, TypeScript, Tailwind CSS, Lucide Icons, Recharts, Vite.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span><strong>Backend:</strong> Node.js, Express, WebSocket (Live stream broadcast every 3s), REST APIs.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span><strong>Security:</strong> Persistent user database, Bcryptjs password hashing, JWT signed bearer tokens.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-cyan-400 font-bold">•</span>
              <span><strong>Cartography & Spatial:</strong> Interactive 2D campus masterplan & high-resolution floor plans for AI Block & Main Complex.</span>
            </li>
          </ul>
        </div>

        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm space-y-3">
          <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Shield className="w-4 h-4 text-emerald-400" /> IoT Fleet & Telemetry Architecture
          </h3>
          <ul className="text-xs text-[var(--text-secondary)] space-y-2">
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Hardware Protocol:</strong> ESP32 microcontrollers, RS-485 Modbus energy meters, DHT22 ambient sensors.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Simulation Mode:</strong> In the absence of live campus IoT hardware, realistic diurnal curves and peak-spike generators simulate real-world conditions with transparent labeling.</span>
            </li>
            <li className="flex items-start gap-2">
              <span className="text-emerald-400 font-bold">•</span>
              <span><strong>Alert Engine:</strong> Configurable threshold triggers for high load, voltage variations, and abnormal equipment activity.</span>
            </li>
          </ul>
        </div>
      </div>

      {/* Sustainability & Environmental Impact */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-5 shadow-sm space-y-2">
        <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
          <Leaf className="w-4 h-4 text-emerald-400" /> Sustainability & Energy Goals
        </h3>
        <p className="text-xs text-[var(--text-secondary)] leading-relaxed">
          By utilizing on-site solar energy generation and pinpointing high-consumption zones such as the CAD/CAM lab and the Electrical Engineering machinery test benches, the platform supports green campus initiatives, assists in meeting energy efficiency standards, and reduces non-renewable power import from the grid.
        </p>
      </div>
    </div>
  );
};
