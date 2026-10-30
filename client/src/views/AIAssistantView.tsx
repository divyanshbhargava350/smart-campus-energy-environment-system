import React, { useState } from 'react';
import { 
  Bot, Send, Sparkles, Settings, User, Lightbulb, 
  CheckCircle2, ArrowRight, ShieldAlert, Cpu, ShieldCheck, 
  History, Clock, AlertTriangle, Database
} from 'lucide-react';
import { api } from '../services/api.js';

interface Message {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  supportingData?: any;
  recommendations?: string[];
  timestamp: string;
  provider?: string;
  groundingSource?: string;
  isGroundingVerified?: boolean;
}

export const AIAssistantView: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: 'welcome',
      sender: 'assistant',
      text: `Hello! I am your **Controlled AI Energy Assistant** for the **MITS Gwalior Energy and Environment Management System**.

I operate under **strict zero-hallucination grounding rules**:
• I answer queries strictly using verified campus energy telemetry, rooftop solar generation, room appliance states, Isolation Forest anomaly logs, and MPPKVVCL tariff rates.
• If any room, sensor, or appliance telemetry is unavailable, I will explicitly report it as unavailable instead of guessing.
• Private system credentials and non-campus topics are strictly out-of-scope.

You can ask me questions or click any of the prompt shortcuts below.`,
      timestamp: new Date().toLocaleTimeString(),
      provider: 'MITS Local Grounded Energy Intelligence Engine',
      groundingSource: 'Verified Energy & Environment SCADA & Sub-meter Telemetry',
      isGroundingVerified: true
    }
  ]);

  const [inputPrompt, setInputPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [showConfigModal, setShowConfigModal] = useState(false);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [auditQueries, setAuditQueries] = useState<any[]>([]);
  const [loadingAudit, setLoadingAudit] = useState(false);
  const [llmProvider, setLlmProvider] = useState<'local' | 'gemini' | 'openai'>('local');
  const [apiKey, setApiKey] = useState('');

  const samplePrompts = [
    "Is AC in Room 101 on or off?",
    "Are circulation pumps running in Central Workshop?",
    "What is current rooftop solar generation & avoided cost?",
    "Show me any recurring anomaly alerts",
    "What is today's tariff and realized savings?",
    "What is the temperature in Room 999?"
  ];

  const handleSendMessage = async (textToSend?: string) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || loading) return;

    const userMsg: Message = {
      id: `USR_${Date.now()}`,
      sender: 'user',
      text: query.trim(),
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMsg]);
    setInputPrompt('');
    setLoading(true);

    try {
      const res = await api.mlChat(query, {
        provider: llmProvider === 'local' 
          ? 'MITS Local Grounded Energy Intelligence Engine (Strict Telemetry Grounding)' 
          : `${llmProvider.toUpperCase()} API (Strict Grounded Context)`,
        apiKey: apiKey || undefined
      });

      const assistantMsg: Message = {
        id: `AI_${Date.now()}`,
        sender: 'assistant',
        text: res.response,
        supportingData: res.supportingData,
        recommendations: res.recommendations,
        timestamp: new Date(res.timestamp || Date.now()).toLocaleTimeString(),
        provider: res.provider,
        groundingSource: res.groundingSource,
        isGroundingVerified: res.isGroundingVerified
      };

      setMessages(prev => [...prev, assistantMsg]);
    } catch (err) {
      setMessages(prev => [
        ...prev,
        {
          id: `ERR_${Date.now()}`,
          sender: 'assistant',
          text: 'Unable to communicate with the grounded AI engine. Please verify backend connection.',
          timestamp: new Date().toLocaleTimeString(),
          groundingSource: 'Offline Error Boundary',
          isGroundingVerified: false
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  const loadAuditHistory = async () => {
    setLoadingAudit(true);
    setShowAuditModal(true);
    try {
      const res = await api.aiAuditQueries();
      if (res.success) {
        setAuditQueries(res.data || []);
      }
    } catch (e) {
      console.error('Failed to load AI query audit logs:', e);
    } finally {
      setLoadingAudit(false);
    }
  };

  return (
    <div className="h-[calc(100vh-8.5rem)] flex flex-col bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl overflow-hidden shadow-xl animate-fadeIn">
      {/* Header */}
      <div className="p-4 border-b border-[var(--border-color)] flex items-center justify-between bg-[var(--bg-tertiary)]">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-600/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-[var(--text-primary)]">
                Controlled AI Energy Assistant
              </h2>
              <span className="px-2 py-0.5 rounded text-[9px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/30">
                {llmProvider === 'local' ? 'STRICT GROUNDED RAG' : `${llmProvider.toUpperCase()} GROUNDED`}
              </span>
            </div>
            <p className="text-[11px] text-[var(--text-muted)]">
              Grounded strictly in verified campus telemetry with zero-hallucination guardrails
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={loadAuditHistory}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-colors"
            title="View query audit history"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Query Audit Log</span>
          </button>

          <button
            onClick={() => setShowConfigModal(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-white transition-colors"
          >
            <Settings className="w-3.5 h-3.5" />
            <span>Config</span>
          </button>
        </div>
      </div>

      {/* Scope Enforced Operational Notice */}
      <div className="px-4 py-2 bg-cyan-950/20 border-b border-cyan-500/20 text-cyan-300 text-[11px] flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <ShieldCheck className="w-3.5 h-3.5 text-cyan-400" />
          <span><strong>Grounding Mode:</strong> Strict Knowledge Engine (Answers verified against active rooms, solar inverters & meters; no guessing).</span>
        </span>
        <span className="font-mono text-[10px] text-slate-400 hidden md:inline">
          Scope: Energy & Environment
        </span>
      </div>

      {/* Messages Scroll View */}
      <div className="flex-1 p-4 overflow-y-auto space-y-4">
        {messages.map(m => (
          <div
            key={m.id}
            className={`flex gap-3 max-w-3xl ${
              m.sender === 'user' ? 'ml-auto flex-row-reverse' : ''
            }`}
          >
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 text-xs font-bold ${
                m.sender === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-emerald-600/20 border border-emerald-500/40 text-emerald-400'
              }`}
            >
              {m.sender === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
            </div>

            <div
              className={`p-4 rounded-2xl text-xs space-y-2 shadow-sm ${
                m.sender === 'user'
                  ? 'bg-cyan-600 text-white'
                  : 'bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-[var(--text-primary)]'
              }`}
            >
              <div className="whitespace-pre-wrap leading-relaxed">{m.text}</div>

              {/* Supporting Data Pill Box */}
              {m.supportingData && Object.keys(m.supportingData).length > 0 && (
                <div className="p-3 rounded-xl bg-[var(--bg-secondary)] border border-[var(--border-color)] mt-3 space-y-1">
                  <div className="text-[10px] font-bold text-cyan-400 uppercase tracking-wider flex items-center gap-1">
                    <Cpu className="w-3 h-3" /> Grounded Telemetry & Model Evidence
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono pt-1 text-[var(--text-secondary)]">
                    {Object.entries(m.supportingData).map(([k, val]: any) => (
                      <div key={k}>
                        <span className="text-[var(--text-muted)] text-[10px] block">{k}:</span>
                        <strong className="text-[var(--text-primary)]">{typeof val === 'object' ? JSON.stringify(val) : String(val)}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Suggested Actions */}
              {m.recommendations && m.recommendations.length > 0 && (
                <div className="pt-2 border-t border-[var(--border-color)] space-y-1">
                  <span className="text-[10px] font-bold text-amber-400 uppercase tracking-wider flex items-center gap-1">
                    <Lightbulb className="w-3 h-3" /> Recommended Actions:
                  </span>
                  <ul className="space-y-1 pl-1">
                    {m.recommendations.map((rec, i) => (
                      <li key={i} className="text-[11px] text-[var(--text-secondary)] flex items-start gap-1.5">
                        <span className="text-cyan-400 mt-0.5">•</span>
                        <span>{rec}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Timestamp & Grounding Source */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between text-[10px] text-[var(--text-muted)] pt-2 border-t border-[var(--border-color)] gap-1">
                <span className="flex items-center gap-1 font-mono">
                  <Clock className="w-3 h-3" /> Timestamp: {m.timestamp}
                </span>
                {m.groundingSource && (
                  <span className="text-emerald-400 font-medium flex items-center gap-1">
                    <ShieldCheck className="w-3 h-3" /> Source: {m.groundingSource}
                  </span>
                )}
              </div>
            </div>
          </div>
        ))}

        {loading && (
          <div className="flex gap-3 max-w-xl">
            <div className="w-8 h-8 rounded-full bg-emerald-600/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400 shrink-0">
              <Bot className="w-4 h-4 animate-spin" />
            </div>
            <div className="p-3.5 rounded-2xl bg-[var(--bg-tertiary)] border border-[var(--border-color)] text-xs text-[var(--text-muted)] flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
              <span>Verifying campus telemetry database and grounding response...</span>
            </div>
          </div>
        )}
      </div>

      {/* Suggested Prompt Chips */}
      <div className="px-4 py-2 border-t border-[var(--border-color)] bg-[var(--bg-tertiary)] flex gap-2 overflow-x-auto scrollbar-thin">
        {samplePrompts.map((p, i) => (
          <button
            key={i}
            onClick={() => handleSendMessage(p)}
            className="px-2.5 py-1 rounded-full text-[11px] bg-[var(--bg-secondary)] border border-[var(--border-color)] text-[var(--text-secondary)] hover:text-cyan-400 hover:border-cyan-500/40 whitespace-nowrap transition-all"
          >
            {p}
          </button>
        ))}
      </div>

      {/* Message Input Box */}
      <div className="p-3 border-t border-[var(--border-color)] bg-[var(--bg-secondary)] flex items-center gap-2">
        <input
          type="text"
          value={inputPrompt}
          onChange={e => setInputPrompt(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
          placeholder="Ask about appliance states, solar generation, electricity demand, or recurring faults..."
          className="flex-1 bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-4 py-2.5 text-xs text-[var(--text-primary)] placeholder-[var(--text-muted)] focus:border-cyan-400 focus:outline-none"
        />
        <button
          onClick={() => handleSendMessage()}
          disabled={!inputPrompt.trim() || loading}
          className="p-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 text-white transition-colors"
        >
          <Send className="w-4 h-4" />
        </button>
      </div>

      {/* Query Audit Trail Modal */}
      {showAuditModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4 animate-fadeIn backdrop-blur-sm">
          <div className="bg-[#131C31] border border-cyan-500/40 rounded-2xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-700">
              <div className="flex items-center gap-2">
                <Database className="w-5 h-5 text-cyan-400" />
                <h3 className="text-base font-bold text-white">
                  Persistent AI Query Audit Log
                </h3>
              </div>
              <button onClick={() => setShowAuditModal(false)} className="text-slate-400 hover:text-white">
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400 pt-2 pb-3">
              All interactions are persisted in the centralized database (`server/data/campus-db.json`) for data governance and verification.
            </p>

            <div className="flex-1 overflow-y-auto space-y-3 pr-1">
              {loadingAudit ? (
                <div className="p-8 text-center text-xs text-slate-400">Loading audit history...</div>
              ) : auditQueries.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">No previous queries recorded in database.</div>
              ) : (
                auditQueries.map(q => (
                  <div key={q.id} className="p-3 rounded-xl bg-[#0A0F1D] border border-slate-800 space-y-1.5 text-xs">
                    <div className="flex items-center justify-between">
                      <strong className="text-cyan-300">Q: "{q.query}"</strong>
                      <span className="text-[10px] text-slate-500 font-mono">{new Date(q.timestamp).toLocaleTimeString()}</span>
                    </div>
                    <p className="text-slate-300 text-[11px] leading-relaxed line-clamp-3">{q.response}</p>
                    <div className="text-[10px] text-emerald-400 pt-1 flex items-center gap-1 font-mono">
                      <ShieldCheck className="w-3 h-3" /> Grounding: {q.groundingSource}
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="pt-3 border-t border-slate-700 flex justify-end">
              <button
                onClick={() => setShowAuditModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-semibold"
              >
                Close Audit Log
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Config Modal */}
      {showConfigModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 animate-fadeIn">
          <div className="bg-[var(--bg-secondary)] border border-[var(--border-color)] rounded-2xl p-6 max-w-md w-full shadow-2xl space-y-4">
            <h3 className="text-sm font-bold text-[var(--text-primary)]">
              AI Grounding & LLM Provider Configuration
            </h3>
            <p className="text-xs text-[var(--text-muted)]">
              Configure the assistant engine. When in Local mode, queries are grounded strictly in the campus energy & environment rules engine without hallucination.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                  Engine Mode:
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {(['local', 'gemini', 'openai'] as const).map(p => (
                    <button
                      key={p}
                      onClick={() => setLlmProvider(p)}
                      className={`py-2 rounded-xl text-xs font-semibold capitalize border transition-all ${
                        llmProvider === p
                          ? 'bg-cyan-600 text-white border-cyan-400'
                          : 'bg-[var(--bg-tertiary)] text-[var(--text-secondary)] border-[var(--border-color)]'
                      }`}
                    >
                      {p === 'local' ? 'Local Grounded' : p}
                    </button>
                  ))}
                </div>
              </div>

              {llmProvider !== 'local' && (
                <div>
                  <label className="block text-xs font-semibold text-[var(--text-secondary)] mb-1">
                    API Key:
                  </label>
                  <input
                    type="password"
                    value={apiKey}
                    onChange={e => setApiKey(e.target.value)}
                    placeholder={`Enter ${llmProvider.toUpperCase()} API key...`}
                    className="w-full bg-[var(--bg-tertiary)] border border-[var(--border-color)] rounded-xl px-3 py-2 text-xs text-[var(--text-primary)] focus:border-cyan-400 focus:outline-none"
                  />
                  <span className="text-[10px] text-slate-400 block mt-1">
                    Stored in volatile session memory only; never persisted to disk.
                  </span>
                </div>
              )}
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => setShowConfigModal(false)}
                className="px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold"
              >
                Apply Configuration
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
