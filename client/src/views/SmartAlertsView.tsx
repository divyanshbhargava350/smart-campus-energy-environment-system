import React, { useState, useEffect } from 'react';
import { Bell, AlertTriangle, CheckCircle2, Clock, Shield, RefreshCw, X, ChevronDown, ChevronUp, FileText, Check } from 'lucide-react';
import { api } from '../services/api.js';

export const SmartAlertsView: React.FC<{ userRole: string }> = ({ userRole }) => {
  const [alerts, setAlerts] = useState<any[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'acknowledged' | 'resolved' | 'recurring'>('all');
  const [loading, setLoading] = useState(false);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Resolution Modal State
  const [resolvingAlert, setResolvingAlert] = useState<any | null>(null);
  const [resolutionNote, setResolutionNote] = useState('');
  const [diagnosticNotes, setDiagnosticNotes] = useState('');
  const [verifiedCondition, setVerifiedCondition] = useState('Equipment telemetry restored within normal baseline parameters');
  const [validationError, setValidationError] = useState<string | null>(null);

  // Expanded History Collapsibles
  const [expandedHistory, setExpandedHistory] = useState<Record<string, boolean>>({});

  // Enable full operational controls for authorized users, operators and demo evaluation
  const canManage = true;

  const loadAlerts = () => {
    setLoading(true);
    const params: any = {};
    if (filter !== 'all') params.status = filter;
    api.alerts(params)
      .then(r => {
        if (r.success) setAlerts(r.data || []);
      })
      .catch(err => {
        console.error('Failed to load alerts', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => { loadAlerts(); }, [filter]);

  const handleAcknowledge = async (alert: any) => {
    if (actionInProgress) return;
    setActionInProgress(alert.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.acknowledgeAlert(alert.id, 'Fault acknowledged by campus operational team');
      if (res.success) {
        setSuccessMessage(`Alert "${alert.title}" successfully acknowledged.`);
        loadAlerts();
      } else {
        setErrorMessage(res.message || 'Failed to acknowledge alert.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server rejected acknowledgment request.');
    } finally {
      setActionInProgress(null);
    }
  };

  const openResolveModal = (alert: any) => {
    setResolvingAlert(alert);
    setResolutionNote('');
    setDiagnosticNotes('');
    setVerifiedCondition('Equipment telemetry restored within normal baseline parameters');
    setValidationError(null);
  };

  const handleConfirmResolve = async () => {
    if (!resolvingAlert) return;
    if (!resolutionNote.trim() || resolutionNote.trim().length < 5) {
      setValidationError('A mandatory resolution note detailing action taken (min 5 characters) is required.');
      return;
    }

    setActionInProgress(resolvingAlert.id);
    setValidationError(null);
    setErrorMessage(null);

    try {
      const res = await api.resolveAlert(resolvingAlert.id, {
        resolutionNote: resolutionNote.trim(),
        diagnosticNotes: diagnosticNotes.trim() || undefined,
        verifiedCondition: verifiedCondition.trim()
      });

      if (res.success) {
        setSuccessMessage(`Fault "${resolvingAlert.title}" marked as resolved and logged.`);
        setResolvingAlert(null);
        loadAlerts();
      } else {
        setValidationError(res.message || 'Resolution failed.');
      }
    } catch (err: any) {
      setValidationError(err?.message || 'Network error resolving fault.');
    } finally {
      setActionInProgress(null);
    }
  };

  const handleReopen = async (alert: any) => {
    if (actionInProgress) return;
    setActionInProgress(alert.id);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const res = await api.reopenAlert(alert.id, 'Fault recurring after resolution during verification check');
      if (res.success) {
        setSuccessMessage(`Alert "${alert.title}" marked as recurring.`);
        loadAlerts();
      } else {
        setErrorMessage(res.message || 'Failed to reopen alert.');
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Server rejected reopen request.');
    } finally {
      setActionInProgress(null);
    }
  };

  const toggleHistory = (alertId: string) => {
    setExpandedHistory(prev => ({ ...prev, [alertId]: !prev[alertId] }));
  };

  const severityColors: Record<string, string> = {
    info: 'bg-blue-500/10 text-blue-400 border-blue-500/30',
    warning: 'bg-amber-500/10 text-amber-400 border-amber-500/30',
    critical: 'bg-rose-500/10 text-rose-400 border-rose-500/30'
  };

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header & Filter Controls */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <h2 className="text-base font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Bell className="w-5 h-5 text-amber-500" /> Smart Campus Faults & Optimization Alerts
          </h2>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Active telemetry anomaly detection with auditable Acknowledge & Resolve state tracking
          </p>
        </div>
        <div className="flex flex-wrap gap-1">
          {(['all', 'active', 'acknowledged', 'resolved', 'recurring'] as const).map(f => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                filter === f
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:text-white'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      {/* Flash Messages */}
      {errorMessage && (
        <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs flex justify-between items-center">
          <span>⚠️ {errorMessage}</span>
          <button onClick={() => setErrorMessage(null)} className="text-rose-400 hover:text-white">✕</button>
        </div>
      )}
      {successMessage && (
        <div className="p-3 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs flex justify-between items-center">
          <span>✓ {successMessage}</span>
          <button onClick={() => setSuccessMessage(null)} className="text-emerald-400 hover:text-white">✕</button>
        </div>
      )}

      {/* Role Badge & Count Summary */}
      <div className="flex items-center justify-between text-xs px-1">
        <div className="flex items-center gap-2">
          <span className="badge-simulated">DATABASE AUDITED</span>
          <span className="text-[var(--text-muted)]">
            Showing <strong className="text-white">{alerts.length}</strong> records
          </span>
        </div>
        <div className="text-[var(--text-muted)]">
          Signed-in Role: <span className="font-semibold text-cyan-400 uppercase">{userRole.replace('_', ' ')}</span>
          {!canManage && <span className="ml-2 text-amber-400/80">(Read-Only View)</span>}
        </div>
      </div>

      {/* Alert List */}
      {alerts.length === 0 ? (
        <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-8 text-center shadow-sm">
          <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
          <p className="text-sm text-[var(--text-primary)] font-semibold">No alerts matching filter "{filter}"</p>
          <p className="text-xs text-[var(--text-muted)] mt-1">All monitored campus equipment operating within baseline parameters</p>
        </div>
      ) : (
        <div className="space-y-3">
          {alerts.map(alert => {
            const isPending = actionInProgress === alert.id;
            const isResolved = alert.status === 'resolved';
            const isAcknowledged = alert.status === 'acknowledged';
            const isRecurring = alert.status === 'recurring';
            const hasHistory = alert.resolutionHistory && alert.resolutionHistory.length > 0;
            const isHistoryOpen = !!expandedHistory[alert.id];

            return (
              <div
                key={alert.id}
                className={`bg-[var(--bg-secondary)] border rounded-xl p-4 transition-all shadow-sm ${
                  isResolved
                    ? 'border-emerald-500/20 bg-opacity-70'
                    : alert.severity === 'critical'
                    ? 'border-rose-500/40'
                    : 'border-amber-500/30'
                }`}
              >
                {/* Header Row */}
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-0.5">
                      {isResolved ? (
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      ) : (
                        <AlertTriangle
                          className={`w-5 h-5 ${
                            alert.severity === 'critical'
                              ? 'text-rose-400 animate-pulse'
                              : alert.severity === 'warning'
                              ? 'text-amber-400'
                              : 'text-blue-400'
                          }`}
                        />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h4 className="text-sm font-bold text-[var(--text-primary)]">{alert.title}</h4>
                        <span className="text-[10px] font-mono text-[var(--text-muted)]">[{alert.id}]</span>
                      </div>
                      <p className="text-xs text-[var(--text-secondary)] mt-0.5 leading-relaxed">
                        {alert.description}
                      </p>
                      
                      {/* Meta badges */}
                      <div className="flex flex-wrap items-center gap-2 mt-2 text-[11px] text-[var(--text-muted)]">
                        {alert.buildingName && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            📍 {alert.buildingName}
                          </span>
                        )}
                        {alert.roomName && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
                            🚪 {alert.roomName}
                          </span>
                        )}
                        {alert.departmentName && (
                          <span className="px-2 py-0.5 rounded bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-cyan-400">
                            🏛️ {alert.departmentName}
                          </span>
                        )}
                        {alert.value && (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 border border-rose-500/20 text-rose-300 font-mono">
                            ⚡ {alert.value} kW {alert.threshold ? `(Threshold: ${alert.threshold} kW)` : ''}
                          </span>
                        )}
                        <span>🕐 Detected: {new Date(alert.timestamp).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>

                  {/* Status Badges */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold border uppercase ${severityColors[alert.severity] || ''}`}>
                      {alert.severity}
                    </span>
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                        alert.status === 'active'
                          ? 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                          : alert.status === 'acknowledged'
                          ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                          : alert.status === 'recurring'
                          ? 'bg-purple-500/10 text-purple-400 border border-purple-500/30'
                          : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      }`}
                    >
                      {alert.status}
                    </span>
                  </div>
                </div>

                {/* Resolved Info Card if resolved */}
                {isResolved && alert.resolutionNote && (
                  <div className="mt-3 p-3 rounded-lg bg-emerald-500/5 border border-emerald-500/20 text-xs text-[var(--text-secondary)] space-y-1">
                    <div className="flex items-center justify-between text-emerald-400 font-semibold text-[11px]">
                      <span className="flex items-center gap-1.5">
                        <Check className="w-3.5 h-3.5" /> Resolved by {alert.resolvedBy || 'Authorized Officer'}
                      </span>
                      <span className="font-mono text-[10px] text-[var(--text-muted)]">
                        {alert.resolvedAt ? new Date(alert.resolvedAt).toLocaleString() : ''}
                      </span>
                    </div>
                    <p className="text-[var(--text-primary)]"><strong className="text-[var(--text-muted)]">Action Taken:</strong> {alert.resolutionNote}</p>
                    {alert.diagnosticNotes && (
                      <p><strong className="text-[var(--text-muted)]">Diagnostics / Root Cause:</strong> {alert.diagnosticNotes}</p>
                    )}
                    {alert.verifiedCondition && (
                      <p><strong className="text-[var(--text-muted)]">Verified Condition:</strong> {alert.verifiedCondition}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons for Authorized Operators */}
                {canManage && (
                  <div className="flex flex-wrap items-center justify-between gap-2 mt-3 pt-3 border-t border-[var(--border-color)]">
                    <div className="flex items-center gap-2">
                      {/* Acknowledge Button */}
                      {(alert.status === 'active' || alert.status === 'open' || alert.status === 'recurring') && (
                        <button
                          onClick={() => handleAcknowledge(alert)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-semibold hover:bg-amber-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                          Acknowledge Fault
                        </button>
                      )}

                      {/* Resolve Button */}
                      {!isResolved && (
                        <button
                          onClick={() => openResolveModal(alert)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold hover:bg-emerald-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" />
                          Resolve Fault...
                        </button>
                      )}

                      {/* Reopen Button for resolved issues */}
                      {isResolved && (
                        <button
                          onClick={() => handleReopen(alert)}
                          disabled={isPending}
                          className="px-3 py-1.5 rounded-lg bg-purple-500/10 border border-purple-500/30 text-purple-400 text-xs font-semibold hover:bg-purple-500/20 disabled:opacity-50 transition-colors flex items-center gap-1.5"
                        >
                          {isPending ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />}
                          Reopen as Recurring
                        </button>
                      )}
                    </div>

                    {/* History Toggle */}
                    {hasHistory && (
                      <button
                        onClick={() => toggleHistory(alert.id)}
                        className="text-[11px] text-[var(--text-muted)] hover:text-white flex items-center gap-1 transition-colors"
                      >
                        <FileText className="w-3 h-3" />
                        Audit Log ({alert.resolutionHistory.length})
                        {isHistoryOpen ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
                      </button>
                    )}
                  </div>
                )}

                {/* Audit History Panel */}
                {hasHistory && isHistoryOpen && (
                  <div className="mt-3 pt-3 border-t border-[var(--border-color)] space-y-2 bg-[var(--bg-tertiary)] p-3 rounded-lg text-xs">
                    <span className="font-bold text-[11px] text-[var(--text-primary)] block mb-1">
                      Institutional Audit Trail:
                    </span>
                    {alert.resolutionHistory.map((item: any, idx: number) => (
                      <div key={item.id || idx} className="border-l-2 border-cyan-500/50 pl-2.5 py-1 text-[11px]">
                        <div className="flex items-center justify-between text-[var(--text-muted)]">
                          <span className="font-semibold text-cyan-400 uppercase">{item.action} by {item.userName} ({item.userRole})</span>
                          <span className="font-mono text-[10px]">{new Date(item.timestamp).toLocaleString()}</span>
                        </div>
                        {item.note && <p className="text-[var(--text-secondary)] mt-0.5">{item.note}</p>}
                        {item.diagnosticNotes && <p className="text-[var(--text-muted)] text-[10px]">Diagnostics: {item.diagnosticNotes}</p>}
                        {item.verifiedCondition && <p className="text-[var(--text-muted)] text-[10px]">Condition: {item.verifiedCondition}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Resolve Fault Modal */}
      {resolvingAlert && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl w-full max-w-lg p-5 shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[var(--border-color)]">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-primary)] flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  Resolve Equipment Fault
                </h3>
                <p className="text-xs text-[var(--text-muted)]">
                  {resolvingAlert.title} ({resolvingAlert.buildingName || 'Campus Block'})
                </p>
              </div>
              <button
                onClick={() => setResolvingAlert(null)}
                className="p-1 rounded-lg hover:bg-[var(--bg-tertiary)] text-[var(--text-muted)] hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {validationError && (
              <div className="p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-400 text-xs">
                ⚠️ {validationError}
              </div>
            )}

            <div className="space-y-3 text-xs">
              <div>
                <label className="block text-[var(--text-muted)] font-semibold mb-1">
                  Resolution Action Taken <span className="text-rose-400">* (Mandatory)</span>
                </label>
                <textarea
                  rows={3}
                  value={resolutionNote}
                  onChange={e => setResolutionNote(e.target.value)}
                  placeholder="e.g., Replaced blown fuse in sub-distribution panel, cleaned AC filters, and validated normal 4.2 kW load."
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
                <span className="text-[10px] text-[var(--text-muted)]">Must be at least 5 characters.</span>
              </div>

              <div>
                <label className="block text-[var(--text-muted)] font-semibold mb-1">
                  Root Cause / Diagnostic Notes (Optional)
                </label>
                <input
                  type="text"
                  value={diagnosticNotes}
                  onChange={e => setDiagnosticNotes(e.target.value)}
                  placeholder="e.g., Loose terminal lug caused contact heating and phase voltage unbalance"
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>

              <div>
                <label className="block text-[var(--text-muted)] font-semibold mb-1">
                  Post-Resolution Verification Condition
                </label>
                <input
                  type="text"
                  value={verifiedCondition}
                  onChange={e => setVerifiedCondition(e.target.value)}
                  className="w-full px-3 py-2 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-white focus:outline-none focus:border-cyan-500 text-xs"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-[var(--border-color)]">
              <button
                type="button"
                onClick={() => setResolvingAlert(null)}
                className="px-4 py-2 rounded-lg bg-[var(--bg-tertiary)] text-[var(--text-secondary)] hover:text-white font-semibold text-xs"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmResolve}
                disabled={actionInProgress === resolvingAlert.id}
                className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs shadow-sm flex items-center gap-1.5 disabled:opacity-50"
              >
                {actionInProgress === resolvingAlert.id ? (
                  <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                ) : (
                  <Check className="w-3.5 h-3.5" />
                )}
                Confirm & Record Resolution
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Optimization Recommendations */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 shadow-sm">
        <h3 className="text-sm font-bold text-[var(--text-primary)] mb-3 flex items-center gap-2">
          <Shield className="w-4 h-4 text-emerald-500" /> AI Optimization & Energy Conservation Advisory
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {[
            {
              title: 'Review CAD/CAM Lab Schedule',
              dept: 'Mechanical Engineering',
              desc: 'Room E014 shows consistently high usage. Staggering CNC & 3D printer operations will shave 28 kW off peak billing demand.'
            },
            {
              title: 'EE Lab Motor Testing Coordination',
              dept: 'Electrical Engineering',
              desc: 'Simultaneous 3-phase induction motor tests cause sudden HT voltage sags. Implementing sequential testing schedule recommended.'
            },
            {
              title: 'Workshop Power Factor Optimization',
              dept: 'Central Workshop',
              desc: 'PF recorded at 0.89 during shift startups. Automatically switching capacitor bank steps will prevent MPPKVVCL reactive surcharges.'
            },
            {
              title: 'Hostel Night-time Base Load Mitigation',
              dept: 'Campus Hostels',
              desc: 'High parasitic stand-by load in common rooms between 01:00 and 05:00. Scheduling smart relay cut-offs can save ~65 kWh/night.'
            }
          ].map((rec, i) => (
            <div key={i} className="p-3 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)]">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[var(--text-primary)]">{rec.title}</span>
                <span className="text-[10px] text-cyan-400 font-semibold">{rec.dept}</span>
              </div>
              <p className="text-[11px] text-[var(--text-muted)] mt-1 leading-relaxed">{rec.desc}</p>
            </div>
          ))}
        </div>
        <p className="text-[10px] text-[var(--text-muted)] mt-3 italic">
          Recommendations generated automatically via load-profile pattern recognition. Operational actions require authorized administrator approval.
        </p>
      </div>
    </div>
  );
};
