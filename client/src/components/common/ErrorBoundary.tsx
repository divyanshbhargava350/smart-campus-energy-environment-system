import React, { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw, Trash2, Home } from 'lucide-react';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Campus Energy Platform Error Caught:', error, errorInfo);
    this.setState({ errorInfo });
  }

  private handleReset = () => {
    try {
      localStorage.removeItem('mits_token');
      localStorage.removeItem('mits_user');
      sessionStorage.clear();
    } catch { /* ignore */ }
    window.location.href = '/';
  };

  private handleReload = () => {
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="min-h-screen bg-[#0A0F1D] flex flex-col justify-center items-center px-4 py-8 text-slate-100">
          <div className="w-full max-w-lg bg-[#131C31] border border-cyan-500/30 rounded-2xl shadow-2xl p-6 sm:p-8 text-center space-y-4">
            <div className="w-16 h-16 mx-auto rounded-full bg-cyan-500/10 border border-cyan-400/40 flex items-center justify-center text-cyan-400">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
            </div>

            <div className="space-y-1">
              <h2 className="text-xl font-bold text-white tracking-tight">
                MITS Gwalior — System Recovery
              </h2>
              <p className="text-xs text-slate-400">
                A client interface condition was safely intercepted. Your database and records remain 100% intact.
              </p>
            </div>

            {this.state.error && (
              <div className="bg-[#0A0F1D] border border-slate-700/60 rounded-xl p-3 text-left font-mono text-[11px] text-rose-300 max-h-32 overflow-y-auto">
                <span className="font-bold text-slate-400 block mb-1">Details:</span>
                {this.state.error.message || 'Unknown render exception'}
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <button
                onClick={this.handleReload}
                className="py-2.5 px-4 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs flex items-center justify-center gap-2 transition-all shadow-md shadow-cyan-600/20"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Reload Interface</span>
              </button>

              <button
                onClick={this.handleReset}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-600 text-slate-200 font-semibold text-xs flex items-center justify-center gap-2 transition-all"
              >
                <Trash2 className="w-4 h-4 text-amber-400" />
                <span>Reset Cache & Login</span>
              </button>
            </div>

            <p className="text-[10px] text-slate-500 pt-2 border-t border-slate-800">
              Madhav Institute of Technology & Science, Gwalior • Energy & Environment Management System
            </p>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
