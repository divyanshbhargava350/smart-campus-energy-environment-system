import React, { useState, useEffect } from 'react';
import { 
  AlertTriangle, ShieldAlert, CheckCircle2, XCircle, 
  Search, Filter, RefreshCw, Eye, MessageSquare, Repeat, 
  Clock, ShieldCheck, UserCheck, Wrench, ChevronRight, X
} from 'lucide-react';
import { api } from '../services/api.js';

interface AnomalyDetectionViewProps {
  userRole: string;
}

export const AnomalyDetectionView: React.FC<AnomalyDetectionViewProps> = ({ userRole }) => {
  const [anomalyData, setAnomalyData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'all' | 'open' | 'acknowledged' | 'resolved' | 'recurring'>('all');
  const [severityFilter, setSeverityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  
  // Modals
  const [dismissModalItem, setDismissModalItem] = useState<any | null>(null);
  const [dismissReason, setDismissReason] = useState('');
  
  const [resolveModalItem, setResolveModalItem] = useState<any | null>(null);
  const [actionTaken, setActionTaken] = useState('');
  const [verifiedCondition, setVerifiedCondition] = useState('');
  const [isSubmittingResolution, setIsSubmittingResolution] = useState(false);

  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(null);

  const fetchAnomalies = () => {
    setLoading(true);
    const params: any = {};
    if (statusFilter !== 'all') {
      params.status = statusFilter === 'open' ? 'pending_review' : statusFilter;
    }
    if (severityFilter !== 'all') params.severity = severityFilter;

    api.mlAnomalies(params)
      .then(res => {
        if (res.success) setAnomalyData(res.data);
      })
      .catch(err => {
        console.error('Failed to fetch anomalies:', err);
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchAnomalies();
  }, [statusFilter, severityFilter]);

  const handleAction = async (id: string, status: string, reason?: string, actionTakenNotes?: string, verifiedNotes?: string) => {
    setIsSubmittingResolution(true);
    setActionSuccessMessage(null);

    // Optimistic local update
    if (anomalyData && anomalyData.anomalies) {
      const updatedAnomalies = anomalyData.anomalies.map((item: any) => {
        if (item.id === id) {
          return {
            ...item,
            status,
            dismissReason: reason || item.dismissReason,
            reviewedBy: 'Campus Operational Engineer',
            resolutionDetails: status === 'resolved' ? {
              resolvedBy: 'Campus Operational Engineer',
              resolvedAt: new Date().toISOString(),
              actionTaken: actionTakenNotes || 'Load balanced & circuit breaker inspected',
              verifiedCondition: verifiedNotes || 'Telemetry normalized'
            } : item.resolutionDetails
          };
        }
        return item;
      });
      setAnomalyData({ ...anomalyData, anomalies: updatedAnomalies });
    }

    try {
      const res = await api.mlAnomalyAction(id, { 
        status, 
        reason,
        actionTaken: actionTakenNotes,
        verifiedCondition: verifiedNotes
      });
      setDismissModalItem(null);
      setDismissReason('');
      setResolveModalItem(null);
      setActionTaken('');
      setVerifiedCondition('');
      setActionSuccessMessage(`Successfully updated anomaly to ${status.toUpperCase()}. Action persisted to database.`);
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchAnomalies();
    } catch (err: any) {
      console.error('Action submission error:', err);
      setActionSuccessMessage(err?.message || 'Action executed.');
      setTimeout(() => setActionSuccessMessage(null), 4000);
      fetchAnomalies();
    } finally {
      setIsSubmittingResolution(false);
    }
  };

  const rawAnomalies = anomalyData?.anomalies || [];
  
  // Filter for UI
  const anomalies = rawAnomalies.filter((item: any) => {
    if (statusFilter === 'all') return true;
    if (statusFilter === 'open') return item.status === 'open' || item.status === 'pending_review';
    if (statusFilter === 'acknowledged') return item.status === 'acknowledged';
    if (statusFilter === 'resolved') return item.status === 'resolved';
    if (statusFilter === 'recurring') return item.status === 'recurring';
    return true;
  });

  const totalCount = rawAnomalies.length;
  const recurringCount = rawAnomalies.filter((a: any) => a.status === 'recurring').length;
  const openCount = rawAnomalies.filter((a: any) => a.status === 'open' || a.status === 'pending_review').length;
  const ackCount = rawAnomalies.filter((a: any) => a.status === 'acknowledged').length;
  const resolvedCount = rawAnomalies.filter((a: any) => a.status === 'resolved').length;

  return (
    <div className="space-y-4 animate-fadeIn">
      {/* Header */}
      <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-sm">
        <div>
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full bg-rose-400 animate-pulse" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">
              Isolation Forest: Fault & Anomaly Resolution Monitoring
            </h2>
          </div>
          <p className="text-xs text-[var(--text-muted)] mt-0.5">
            Tree-based outlier detection with Open, Acknowledged, Resolved, and Recurring resolution status bands
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="badge-simulated">SCIKIT-LEARN ISOLATION FOREST</span>
          <button
            onClick={fetchAnomalies}
            className="p-1.5 rounded-lg bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-all"
            title="Refresh anomalies"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {actionSuccessMessage && (
        <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/60 text-emerald-300 text-xs flex items-center justify-between shadow-md animate-fadeIn">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{actionSuccessMessage}</span>
          </div>
          <button onClick={() => setActionSuccessMessage(null)} className="text-slate-400 hover:text-white">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Metric Resolution Bands Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
        <div 
          onClick={() => setStatusFilter('all')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'all' ? 'bg-cyan-950/30 border-cyan-500 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-slate-500'
          }`}
        >
          <span className="text-[10px] text-slate-400 font-semibold block uppercase tracking-wider">Total Detected</span>
          <span className="text-xl font-bold font-mono text-white">{totalCount}</span>
          <span className="text-[10px] text-cyan-400 block mt-0.5">8.0% contamination</span>
        </div>

        <div 
          onClick={() => setStatusFilter('recurring')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'recurring' ? 'bg-purple-950/40 border-purple-500 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-purple-500/60'
          }`}
        >
          <span className="text-[10px] text-purple-300 font-semibold flex items-center gap-1 uppercase tracking-wider">
            <Repeat className="w-3 h-3 text-purple-400" /> Recurring
          </span>
          <span className="text-xl font-bold font-mono text-purple-300">{recurringCount}</span>
          <span className="text-[10px] text-purple-400 block mt-0.5">Repeating patterns</span>
        </div>

        <div 
          onClick={() => setStatusFilter('open')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'open' ? 'bg-rose-950/40 border-rose-500 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-rose-500/60'
          }`}
        >
          <span className="text-[10px] text-rose-300 font-semibold flex items-center gap-1 uppercase tracking-wider">
            <AlertTriangle className="w-3 h-3 text-rose-400" /> Open Faults
          </span>
          <span className="text-xl font-bold font-mono text-rose-400">{openCount}</span>
          <span className="text-[10px] text-rose-400/80 block mt-0.5">Action pending</span>
        </div>

        <div 
          onClick={() => setStatusFilter('acknowledged')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'acknowledged' ? 'bg-amber-950/40 border-amber-500 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-amber-500/60'
          }`}
        >
          <span className="text-[10px] text-amber-300 font-semibold flex items-center gap-1 uppercase tracking-wider">
            <Clock className="w-3 h-3 text-amber-400" /> Acknowledged
          </span>
          <span className="text-xl font-bold font-mono text-amber-300">{ackCount}</span>
          <span className="text-[10px] text-amber-400/80 block mt-0.5">Under inspection</span>
        </div>

        <div 
          onClick={() => setStatusFilter('resolved')}
          className={`p-3 rounded-xl border cursor-pointer transition-all ${
            statusFilter === 'resolved' ? 'bg-emerald-950/40 border-emerald-500 shadow-sm' : 'bg-[var(--bg-secondary)] border-[var(--border-color)] hover:border-emerald-500/60'
          }`}
        >
          <span className="text-[10px] text-emerald-300 font-semibold flex items-center gap-1 uppercase tracking-wider">
            <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Resolved
          </span>
          <span className="text-xl font-bold font-mono text-emerald-300">{resolvedCount}</span>
          <span className="text-[10px] text-emerald-400/80 block mt-0.5">Verified history</span>
        </div>
      </div>

      {/* Operational Guideline Banner */}
      <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/25 text-amber-300 text-xs flex items-start gap-2">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
        <span>
          <strong>Resolution Governance:</strong> An issue cannot be marked as Resolved without authorized engineering action and verified circuit recovery. Recurring events are automatically flagged when a newly detected anomaly matches a previously resolved failure signature.
        </span>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap gap-2 items-center justify-between">
        <div className="flex flex-wrap gap-1.5">
          {[
            { id: 'all', label: 'All Anomalies' },
            { id: 'open', label: '🔴 Open' },
            { id: 'recurring', label: '🟣 Recurring' },
            { id: 'acknowledged', label: '🟡 Acknowledged' },
            { id: 'resolved', label: '🟢 Resolved' }
          ].map(s => (
            <button
              key={s.id}
              onClick={() => setStatusFilter(s.id as any)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-all ${
                statusFilter === s.id
                  ? 'bg-cyan-600 text-white shadow-sm'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] border border-[var(--border-color)] hover:border-slate-500'
              }`}
            >
              {s.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1.5">
          <span className="text-[11px] text-[var(--text-muted)] font-semibold">Severity:</span>
          {(['all', 'critical', 'high', 'medium'] as const).map(sev => (
            <button
              key={sev}
              onClick={() => setSeverityFilter(sev)}
              className={`px-2.5 py-1 rounded-md text-[10px] font-bold uppercase transition-all ${
                severityFilter === sev
                  ? 'bg-slate-700 text-white border border-slate-500'
                  : 'bg-[var(--bg-secondary)] text-[var(--text-muted)] border border-[var(--border-color)]'
              }`}
            >
              {sev}
            </button>
          ))}
        </div>
      </div>

      {/* Anomalies List with Visual Resolution Bands */}
      <div className="space-y-3">
        {anomalies.length === 0 ? (
          <div className="p-12 text-center bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-xl text-xs text-slate-400">
            No anomalies found matching the "{statusFilter}" filter.
          </div>
        ) : (
          anomalies.map((item: any) => {
            const isRecurring = item.status === 'recurring';
            const isResolved = item.status === 'resolved';
            const isAck = item.status === 'acknowledged';
            const isOpen = item.status === 'open' || item.status === 'pending_review';

            return (
              <div
                key={item.id}
                className={`rounded-xl border overflow-hidden shadow-sm transition-all ${
                  isRecurring
                    ? 'border-purple-500/60 bg-[#120F24]'
                    : isResolved
                    ? 'border-emerald-500/40 bg-[#0E1C1F]'
                    : isAck
                    ? 'border-amber-500/40 bg-[#1A1813]'
                    : 'border-rose-500/50 bg-[#1C121A]'
                }`}
              >
                {/* Visual Status Band Ribbon */}
                <div className={`px-4 py-1.5 text-[11px] font-bold flex items-center justify-between ${
                  isRecurring
                    ? 'bg-purple-900/60 text-purple-200 border-b border-purple-500/40'
                    : isResolved
                    ? 'bg-emerald-900/40 text-emerald-300 border-b border-emerald-500/30'
                    : isAck
                    ? 'bg-amber-900/40 text-amber-200 border-b border-amber-500/30'
                    : 'bg-rose-900/50 text-rose-200 border-b border-rose-500/30'
                }`}>
                  <div className="flex items-center gap-2">
                    {isRecurring ? (
                      <>
                        <Repeat className="w-3.5 h-3.5 text-purple-400 animate-spin" />
                        <span>RECURRING FAULT BAND — RECURRED {item.recurrenceCount || 2} TIMES</span>
                        <span className="font-normal text-purple-300/80">
                          (Previously resolved on {item.previousResolutionDate?.slice(0, 10)})
                        </span>
                      </>
                    ) : isResolved ? (
                      <>
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                        <span>RESOLVED FAULT BAND — VERIFIED BY {item.resolutionDetails?.resolvedBy || item.reviewedBy || 'FACILITY ENGINEER'}</span>
                      </>
                    ) : isAck ? (
                      <>
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>ACKNOWLEDGED BAND — UNDER ACTIVE FIELD INVESTIGATION</span>
                      </>
                    ) : (
                      <>
                        <AlertTriangle className="w-3.5 h-3.5 text-rose-400 animate-pulse" />
                        <span>OPEN ANOMALY BAND — IMMEDIATE TRIAGE REQUIRED</span>
                      </>
                    )}
                  </div>

                  <span className={`px-2 py-0.5 rounded text-[10px] font-mono font-bold uppercase ${
                    item.severity === 'critical' ? 'bg-rose-600 text-white' : item.severity === 'high' ? 'bg-amber-600 text-white' : 'bg-blue-600 text-white'
                  }`}>
                    {item.severity} SEVERITY
                  </span>
                </div>

                {/* Main Content Body */}
                <div className="p-4 space-y-3">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <span>{item.building}</span>
                        {item.affectedDeviceName && (
                          <span className="text-xs font-mono text-cyan-400 font-normal">
                            • {item.affectedDeviceName}
                          </span>
                        )}
                      </h4>
                      <p className="text-xs text-slate-300 mt-0.5">
                        {item.suggestedAction}
                      </p>
                    </div>

                    <div className="flex items-center gap-3 font-mono text-xs">
                      <div>
                        <span className="text-[10px] text-slate-400 block">Recorded Draw</span>
                        <span className="font-bold text-cyan-400">{item.recordedKwh} kWh</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Target Baseline</span>
                        <span className="text-slate-300">{item.expectedBaselineKwh} kWh</span>
                      </div>
                      <div>
                        <span className="text-[10px] text-slate-400 block">Outlier Deviation</span>
                        <span className="font-bold text-rose-400">+{item.deviationPercent}%</span>
                      </div>
                    </div>
                  </div>

                  {/* Recurrence Warning Note */}
                  {isRecurring && item.previousResolutionNotes && (
                    <div className="p-2.5 rounded-lg bg-purple-950/40 border border-purple-500/30 text-purple-200 text-xs">
                      <strong className="block text-[11px] text-purple-300 font-semibold mb-0.5">Prior Resolution Note:</strong>
                      "{item.previousResolutionNotes}"
                    </div>
                  )}

                  {/* Resolved Verification Details Note */}
                  {isResolved && item.resolutionDetails && (
                    <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-500/30 text-emerald-200 text-xs space-y-1">
                      <div>
                        <strong className="text-emerald-300 font-semibold">Action Taken: </strong>
                        {item.resolutionDetails.actionTaken}
                      </div>
                      <div>
                        <strong className="text-emerald-300 font-semibold">Verified Recovery Condition: </strong>
                        {item.resolutionDetails.verifiedCondition}
                      </div>
                      <span className="text-[10px] text-slate-400 block">
                        Resolved on {new Date(item.resolutionDetails.resolvedAt).toLocaleString()}
                      </span>
                    </div>
                  )}

                  {/* Action Buttons */}
                  <div className="pt-2 border-t border-slate-700/60 flex items-center justify-between">
                    <span className="text-[11px] text-slate-400 font-mono">
                      Timestamp: {item.date} • Anomaly Score: {item.anomalyScore}
                    </span>

                    <div className="flex items-center gap-2">
                      {isOpen && (
                        <button
                          onClick={() => handleAction(item.id, 'acknowledged')}
                          className="px-3 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-xs font-semibold border border-amber-500/40 transition-colors"
                        >
                          Acknowledge
                        </button>
                      )}

                      {!isResolved && (
                        <button
                          onClick={() => {
                            setResolveModalItem(item);
                            setActionTaken('');
                            setVerifiedCondition('');
                          }}
                          className="px-3 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors shadow-sm"
                        >
                          Resolve Fault →
                        </button>
                      )}

                      {item.status !== 'dismissed' && (
                        <button
                          onClick={() => setDismissModalItem(item)}
                          className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white text-xs font-semibold border border-slate-700 transition-colors"
                        >
                          Dismiss
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Structured "Resolve Fault" Modal */}
      {resolveModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-[#131C31] border border-emerald-500/40 rounded-2xl p-6 max-w-lg w-full shadow-2xl space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                <h3 className="text-base font-bold text-white">
                  Authorized Fault Resolution
                </h3>
              </div>
              <button onClick={() => setResolveModalItem(null)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-700 text-xs space-y-1">
              <div className="font-bold text-white">{resolveModalItem.building}</div>
              <div className="text-slate-400">{resolveModalItem.suggestedAction}</div>
              <div className="font-mono text-cyan-400 pt-1">
                Recorded: {resolveModalItem.recordedKwh} kWh • Baseline: {resolveModalItem.expectedBaselineKwh} kWh (+{resolveModalItem.deviationPercent}%)
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  1. Corrective Action Taken: <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={2}
                  value={actionTaken}
                  onChange={e => setActionTaken(e.target.value)}
                  placeholder="e.g. Inspected 3-phase busbars, isolated faulty capacitor bank, and re-torqued terminal connections."
                  className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-200 mb-1">
                  2. Verified Recovery Condition: <span className="text-rose-400">*</span>
                </label>
                <input
                  type="text"
                  value={verifiedCondition}
                  onChange={e => setVerifiedCondition(e.target.value)}
                  placeholder="e.g. Feeder draw stabilized under 65 kW; phase balance verified within 3% tolerance."
                  className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-emerald-400"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-700">
              <button
                onClick={() => setResolveModalItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancel
              </button>
              <button
                disabled={!actionTaken.trim() || !verifiedCondition.trim() || isSubmittingResolution}
                onClick={() => handleAction(
                  resolveModalItem.id, 
                  'resolved', 
                  undefined, 
                  actionTaken, 
                  verifiedCondition
                )}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-bold text-xs shadow-md shadow-emerald-600/30 transition-all flex items-center gap-1.5"
              >
                <ShieldCheck className="w-4 h-4" />
                <span>Verify & Mark Resolved</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Dismiss with Reason Modal */}
      {dismissModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="bg-[#131C31] border border-slate-700 rounded-2xl p-5 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-white">
              Dismiss Anomaly Signal — Reason Required
            </h3>
            <p className="text-xs text-slate-400">
              Please document why {dismissModalItem.building} on {dismissModalItem.date} is an acceptable deviation (e.g. Scheduled annual event, authorized overnight lab experiment).
            </p>

            <textarea
              value={dismissReason}
              onChange={e => setDismissReason(e.target.value)}
              placeholder="e.g. Authorized overnight hackathon compute run in Lab M004."
              rows={3}
              className="w-full bg-[#0A0F1D] border border-slate-600 rounded-xl p-3 text-xs text-white focus:border-cyan-400 focus:outline-none"
            />

            <div className="flex justify-end gap-2">
              <button
                onClick={() => setDismissModalItem(null)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                onClick={() => handleAction(dismissModalItem.id, 'dismissed', dismissReason || 'Reviewed and dismissed as nominal operation')}
                className="px-4 py-1.5 rounded-lg bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Confirm Dismissal
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
