import React, { useState } from 'react';
import {
  Shield, User as UserIcon, Mail, Lock, ArrowRight, Eye, EyeOff,
  Building2, AlertCircle, CheckCircle2, LogIn, Wrench,
  BookOpen, Eye as EyeIcon, Sparkles, Check, KeyRound, Zap
} from 'lucide-react';
import { UserRole } from '../../../../shared/types.js';

interface LoginPageProps {
  onLoginSuccess: (user: any, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const [fullName, setFullName] = useState('Campus Administrator — Admin Demo');
  const [email, setEmail] = useState('admin@mits.ac.in');
  const [role, setRole] = useState<UserRole>('super_admin');
  const [departmentId, setDepartmentId] = useState('DEPT_EE');
  const [password, setPassword] = useState('Admin@123');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const departments = [
    { id: 'DEPT_AI_DS', name: 'Artificial Intelligence & Data Science' },
    { id: 'DEPT_CSE', name: 'Computer Science & Engineering' },
    { id: 'DEPT_EE', name: 'Electrical Engineering' },
    { id: 'DEPT_MECH', name: 'Mechanical Engineering' },
    { id: 'DEPT_CHEM', name: 'Chemical Engineering' },
    { id: 'DEPT_CIVIL', name: 'Civil Engineering' },
    { id: 'DEPT_ARCH', name: 'Architecture & Planning' }
  ];

  // Quick One-Click Demo Access
  const handleQuickDemoLogin = async (demoEmail: string, demoPass: string, demoRole: UserRole, demoName?: string) => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch('/api/auth/verify-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: demoName || 'MITS Officer',
          email: demoEmail,
          role: demoRole,
          password: demoPass,
          departmentId: 'DEPT_AI_DS'
        })
      });
      const data = await res.json();
      if (data.success && data.user && data.token) {
        localStorage.setItem('mits_token', data.token);
        localStorage.setItem('mits_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.message || 'Login failed. Please verify credentials.');
      }
    } catch {
      setErrorMsg('Cannot connect to authentication server. Please check network connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);

    if (!email.trim()) {
      setErrorMsg('Please enter your academic or official email address.');
      return;
    }

    if (role !== 'viewer' && !password) {
      setErrorMsg('Password is required for Campus Administrator or Department In-charge verification.');
      return;
    }

    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/verify-and-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fullName: fullName.trim() || 'MITS Campus Member',
          email: email.trim().toLowerCase(),
          role,
          departmentId: role === 'department_hod' ? departmentId : undefined,
          password: role !== 'viewer' ? password : ''
        })
      });

      const data = await res.json();
      if (data.success && data.user && data.token) {
        localStorage.setItem('mits_token', data.token);
        localStorage.setItem('mits_user', JSON.stringify(data.user));
        onLoginSuccess(data.user, data.token);
      } else {
        setErrorMsg(data.message || 'Verification failed. Please check credentials.');
      }
    } catch {
      setErrorMsg('Authentication server unavailable.');
    } finally {
      setIsLoading(false);
    }
  };

  // Helper when user selects a role card
  const handleSelectRole = (r: UserRole) => {
    setRole(r);
    setErrorMsg(null);
    if (r === 'super_admin') {
      setEmail('admin@mits.ac.in');
      setPassword('Admin@123');
    } else if (r === 'facility_manager') {
      setEmail('facility@mits.ac.in');
      setPassword('Facility@123');
    } else if (r === 'department_hod') {
      setEmail('hod.aids@mits.ac.in');
      setPassword('Hod@123');
    } else {
      setEmail('viewer@mits.ac.in');
      setPassword('');
    }
  };

  return (
    <main className="min-h-screen bg-[#0A0F1D] flex flex-col justify-center items-center px-4 py-8 relative">
      {/* Background radial ambient lights */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
        <div className="absolute top-1/4 left-1/4 w-[500px] h-[500px] bg-cyan-500/10 rounded-full blur-[120px]" />
        <div className="absolute bottom-1/4 right-1/4 w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px]" />
      </div>

      <div className="w-full max-w-xl relative z-10 space-y-5">
        {/* Brand Header with MITS College Logo */}
        <header className="text-center animate-fadeIn">
          <img
            src="/mits-logo.jpg"
            alt="MITS Gwalior Official Institutional Seal"
            className="w-24 h-24 rounded-full border-2 border-cyan-400/50 shadow-2xl shadow-cyan-500/20 mx-auto object-cover mb-3"
            onError={(e) => {
              // Fallback if missing
              (e.target as HTMLImageElement).src = 'https://mitsgwalior.in/images/logo.png';
            }}
          />
          <h1 className="text-2xl font-extrabold text-white tracking-tight">
            Smart Campus Energy and Environment System
          </h1>
          <p className="text-xs text-slate-300 mt-0.5 font-medium">
            Madhav Institute of Technology and Science, Gwalior (Estd. 1957)
          </p>
          <div className="mt-2.5 inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/40 text-cyan-300 text-xs font-semibold shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            <span>MITS Gwalior — Secure Campus Monitoring</span>
          </div>
        </header>

        {/* Unified Verification & Login Card */}
        <section aria-label="Sign In Authentication" className="bg-[#131C31] border border-slate-700/80 rounded-2xl shadow-2xl p-6 sm:p-8 space-y-4">
          <div className="border-b border-slate-700/60 pb-3">
            <h2 className="text-base font-bold text-white flex items-center gap-2">
              <Shield className="w-4 h-4 text-cyan-400" /> Sign In to Your Account
            </h2>
            <p className="text-xs text-slate-300 mt-0.5">
              Enter authorized credentials or choose an evaluated demo identity
            </p>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-start gap-2 animate-fadeIn">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{errorMsg}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* 1. Full Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Your Full Name:
              </label>
              <div className="relative">
                <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  required
                  value={fullName}
                  onChange={e => setFullName(e.target.value)}
                  placeholder="e.g. Campus Officer or Student"
                  className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none"
                />
              </div>
            </div>

            {/* 2. Email Address */}
            <div>
              <label className="block text-xs font-semibold text-slate-200 mb-1">
                Academic or Official Email:
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="admin@mits.ac.in"
                  className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none font-mono"
                />
              </div>
            </div>

            {/* 3. Role / Verification Selection */}
            <div className="space-y-1.5">
              <label className="block text-xs font-semibold text-slate-200">
                Verifying Access Level & Role:
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                {/* Super Admin */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('super_admin')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'super_admin'
                      ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400'
                      : 'bg-[#0A0F1D] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <Shield className="w-3.5 h-3.5 text-cyan-400" /> Campus Admin
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Full grid & relay authority</span>
                </button>

                {/* Dept In-charge */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('department_hod')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'department_hod'
                      ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400'
                      : 'bg-[#0A0F1D] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <BookOpen className="w-3.5 h-3.5 text-indigo-400" /> Dept In-Charge
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Departmental lab isolation</span>
                </button>

                {/* Facility Manager */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('facility_manager')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'facility_manager'
                      ? 'bg-cyan-600/20 border-cyan-400 text-white shadow-sm ring-1 ring-cyan-400'
                      : 'bg-[#0A0F1D] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <Wrench className="w-3.5 h-3.5 text-amber-400" /> Facility Manager
                  </div>
                  <span className="text-[10px] text-slate-400 block mt-0.5">Sub-meters & shedding</span>
                </button>

                {/* Student / Viewer */}
                <button
                  type="button"
                  onClick={() => handleSelectRole('viewer')}
                  className={`p-3 rounded-xl border text-left transition-all ${
                    role === 'viewer'
                      ? 'bg-emerald-600/20 border-emerald-400 text-white shadow-sm ring-1 ring-emerald-400'
                      : 'bg-[#0A0F1D] border-slate-700 text-slate-300 hover:border-slate-500'
                  }`}
                >
                  <div className="font-bold flex items-center gap-1.5 text-xs">
                    <EyeIcon className="w-3.5 h-3.5 text-emerald-400" /> Student / Viewer
                  </div>
                  <span className="text-[10px] text-emerald-400 font-medium block mt-0.5">No password required</span>
                </button>
              </div>
            </div>

            {/* Department Selection if Dept In-charge */}
            {role === 'department_hod' && (
              <div className="animate-fadeIn">
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  Assigned Department:
                </label>
                <select
                  value={departmentId}
                  onChange={e => setDepartmentId(e.target.value)}
                  className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl px-3 py-2 text-xs text-white focus:border-cyan-400 focus:outline-none"
                >
                  {departments.map(d => (
                    <option key={d.id} value={d.id}>{d.name}</option>
                  ))}
                </select>
              </div>
            )}

            {/* 4. Password Field - ONLY ASKED FOR ADMIN / FACILITY / DEPT IN-CHARGE */}
            {role !== 'viewer' ? (
              <div className="animate-fadeIn space-y-1.5">
                <div className="flex justify-between items-center">
                  <label className="text-xs font-semibold text-slate-200 flex items-center gap-1">
                    <Lock className="w-3.5 h-3.5 text-amber-400" /> Password for Privileged Access:
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (role === 'super_admin') setPassword('Admin@123');
                      if (role === 'facility_manager') setPassword('Facility@123');
                      if (role === 'department_hod') setPassword('Hod@123');
                    }}
                    className="text-[11px] text-cyan-300 hover:text-cyan-200 hover:underline flex items-center gap-1 font-semibold"
                    aria-label="Fill default password for selected role"
                  >
                    <KeyRound className="w-3.5 h-3.5" /> Fill Default Password
                  </button>
                </div>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    placeholder="Enter password..."
                    className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-400 focus:border-cyan-400 focus:outline-none"
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    title={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 p-1 text-slate-300 hover:text-white focus:outline-none focus:ring-1 focus:ring-cyan-400 rounded"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs text-emerald-300 flex items-center gap-2 animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Instant Access: Students and viewers do not need a password. Click below to enter.</span>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs shadow-lg shadow-cyan-600/25 flex items-center justify-center gap-2 transition-all mt-2"
            >
              {isLoading ? (
                <span>Authenticating with MITS Gateway...</span>
              ) : (
                <>
                  <span>Verify & Enter Platform</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Quick One-Click Demo Direct Login Section */}
          <div className="pt-4 border-t border-slate-700/60 space-y-2">
            <span className="text-[11px] font-bold text-slate-300 uppercase tracking-wider block text-center">
              Evaluator Quick Access (Pre-Configured Demo Identities):
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                aria-label="One-click demo login as Campus Administrator"
                onClick={() => handleQuickDemoLogin('admin@mits.ac.in', 'Admin@123', 'super_admin', 'Campus Administrator — Admin Demo')}
                className="p-2 rounded-xl bg-[#0A0F1D] hover:bg-cyan-900/30 border border-slate-700 hover:border-cyan-400 text-left transition-all text-xs group"
              >
                <div className="font-bold text-white group-hover:text-cyan-400 flex items-center gap-1 text-[11px]">
                  <Shield className="w-3 h-3 text-cyan-400" /> Admin Demo
                </div>
                <span className="text-[9px] text-slate-300 block mt-0.5 truncate">Campus Administrator</span>
              </button>

              <button
                type="button"
                aria-label="One-click demo login as Campus Facility Manager"
                onClick={() => handleQuickDemoLogin('facility@mits.ac.in', 'Facility@123', 'facility_manager', 'Campus Facility Manager — Facility Demo')}
                className="p-2 rounded-xl bg-[#0A0F1D] hover:bg-amber-900/30 border border-slate-700 hover:border-amber-400 text-left transition-all text-xs group"
              >
                <div className="font-bold text-white group-hover:text-amber-400 flex items-center gap-1 text-[11px]">
                  <Wrench className="w-3 h-3 text-amber-400" /> Facility Demo
                </div>
                <span className="text-[9px] text-slate-300 block mt-0.5 truncate">Facility Manager</span>
              </button>

              <button
                type="button"
                aria-label="One-click demo login as Electrical Engineering Department Head"
                onClick={() => handleQuickDemoLogin('hod.ee@mits.ac.in', 'Hod@123', 'department_hod', 'Electrical Engineering HOD — HOD Demo')}
                className="p-2 rounded-xl bg-[#0A0F1D] hover:bg-indigo-900/30 border border-slate-700 hover:border-indigo-400 text-left transition-all text-xs group"
              >
                <div className="font-bold text-white group-hover:text-indigo-400 flex items-center gap-1 text-[11px]">
                  <BookOpen className="w-3 h-3 text-indigo-400" /> HOD Demo
                </div>
                <span className="text-[9px] text-slate-300 block mt-0.5 truncate">EE Dept Head</span>
              </button>

              <button
                type="button"
                aria-label="One-click demo login as Student Viewer without password"
                onClick={() => handleQuickDemoLogin('student.viewer@mits.ac.in', 'Viewer@123', 'viewer', 'Student Viewer — Student Demo')}
                className="p-2 rounded-xl bg-[#0A0F1D] hover:bg-emerald-900/30 border border-slate-700 hover:border-emerald-400 text-left transition-all text-xs group"
              >
                <div className="font-bold text-white group-hover:text-emerald-400 flex items-center gap-1 text-[11px]">
                  <EyeIcon className="w-3 h-3 text-emerald-400" /> Student Demo
                </div>
                <span className="text-[9px] text-emerald-300 block mt-0.5 truncate">Student Viewer</span>
              </button>
            </div>
          </div>
        </section>

        {/* Footer landmark with high-contrast text */}
        <footer className="text-center">
          <p className="text-xs text-slate-300">
            Smart Campus Energy and Environment System • Madhav Institute of Technology and Science, Gwalior
          </p>
        </footer>
      </div>
    </main>
  );
};
