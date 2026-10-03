import type { Alert, Severity } from '@/types';
import { X, Clock, Server, MapPin, Tag, AlertTriangle, Shield, CheckCircle, FileText, Globe } from 'lucide-react';

interface AlertDetailProps {
  alert: Alert;
  onClose: () => void;
}

const severityStyles: Record<Severity, { text: string; bg: string; border: string; label: string }> = {
  critical: { text: 'text-rose-300', bg: 'bg-rose-950/50', border: 'border-rose-800/50', label: 'Critical' },
  high: { text: 'text-orange-300', bg: 'bg-orange-950/50', border: 'border-orange-800/50', label: 'High' },
  medium: { text: 'text-amber-300', bg: 'bg-amber-950/50', border: 'border-amber-800/50', label: 'Medium' },
  low: { text: 'text-sky-300', bg: 'bg-sky-950/50', border: 'border-sky-800/50', label: 'Low' },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function AlertDetail({ alert, onClose }: AlertDetailProps) {
  const s = severityStyles[alert.severity];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 overflow-y-auto" style={{ background: 'rgba(0,0,0,0.6)' }}>
      <div className={`bg-slate-900 ${s.border} border rounded-2xl max-w-3xl w-full my-8 overflow-hidden`}>
        {/* Header */}
        <div className={`${s.bg} ${s.border} border-b px-6 py-4 flex items-center justify-between`}>
          <div className="flex items-center gap-3">
            <AlertTriangle className={`w-6 h-6 ${s.text}`} />
            <div>
              <h2 className="text-white font-bold text-lg">{alert.ruleTitle}</h2>
              <div className="flex items-center gap-3 mt-1 text-xs">
                <span className={`px-2 py-0.5 rounded font-bold uppercase ${s.text} bg-slate-900/50`}>{s.label}</span>
                <span className="text-slate-400 font-mono">Score: {alert.score}/100</span>
                <span className="text-slate-400 font-mono">{alert.eventCount} events</span>
              </div>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white transition-colors p-1">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-6 space-y-5 max-h-[70vh] overflow-y-auto">
          {/* Description */}
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Description</h3>
            <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-line">{alert.description}</p>
          </div>

          {/* Entity & MITRE */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Affected Entity</h3>
              <div className="flex items-center gap-2">
                {alert.entityType === 'ip' ? <Server className="w-4 h-4 text-slate-500" /> : <MapPin className="w-4 h-4 text-slate-500" />}
                <span className="text-slate-200 font-mono text-sm">{alert.entity}</span>
              </div>
              <div className="text-slate-500 text-xs mt-1 capitalize">{alert.entityType.replace('_', ' ')}</div>
            </div>

            <div className="bg-slate-800/50 rounded-lg p-4">
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">MITRE ATT&CK</h3>
              <div className="flex items-center gap-2">
                <Tag className="w-4 h-4 text-teal-400" />
                <span className="text-teal-300 font-mono text-sm font-semibold">{alert.mitre.techniqueId}</span>
              </div>
              <div className="text-slate-400 text-xs mt-1">{alert.mitre.technique}</div>
              <div className="text-slate-500 text-xs">{alert.mitre.tactic}</div>
            </div>
          </div>

          {/* Time Range */}
          <div className="bg-slate-800/50 rounded-lg p-4">
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">Timeline</h3>
            <div className="flex items-center gap-3 text-sm">
              <Clock className="w-4 h-4 text-slate-500" />
              <span className="text-slate-300 font-mono">{formatTime(alert.timeRange.start)}</span>
              <span className="text-slate-600">→</span>
              <span className="text-slate-300 font-mono">{formatTime(alert.timeRange.end)}</span>
            </div>
          </div>

          {/* Triggering Events */}
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
              Triggering Events ({alert.events.length})
            </h3>
            <div className="space-y-1.5 max-h-64 overflow-y-auto">
              {alert.events.map((event, idx) => (
                <div key={event.id} className="bg-slate-800/30 border border-slate-800 rounded-lg px-3 py-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-slate-500 text-xs font-mono">#{idx + 1}</span>
                    <span className="text-slate-400 text-xs font-mono">{formatTime(event.timestamp)}</span>
                    {event.sourceIp && (
                      <span className="flex items-center gap-1 text-slate-400 text-xs font-mono">
                        <Globe className="w-3 h-3" />
                        {event.sourceIp}
                        {event.geo && event.geo.country !== 'Private Network' && (
                          <span className="text-slate-500">({event.geo.city}, {event.geo.country})</span>
                        )}
                      </span>
                    )}
                    {event.username && <span className="text-slate-400 text-xs font-mono">user: {event.username}</span>}
                    {!event.success && (
                      <span className="text-rose-400 text-xs">FAILED</span>
                    )}
                    {event.success && (
                      <span className="text-teal-400 text-xs">SUCCESS</span>
                    )}
                  </div>
                  <div className="text-slate-500 text-xs font-mono truncate">{event.rawLine}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Recommended Actions */}
          <div>
            <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
              <Shield className="w-3.5 h-3.5" />
              Recommended Actions
            </h3>
            <div className="space-y-1.5">
              {alert.recommendedActions.map((action, idx) => (
                <div key={idx} className="flex items-start gap-2 bg-slate-800/30 rounded-lg px-3 py-2">
                  <span className="text-teal-400 text-xs font-mono mt-0.5">{idx + 1}.</span>
                  <span className="text-slate-300 text-sm">{action}</span>
                </div>
              ))}
            </div>
          </div>

          {/* False Positives */}
          {alert.falsePositives.length > 0 && (
            <div>
              <h3 className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <CheckCircle className="w-3.5 h-3.5" />
                Potential False Positives
              </h3>
              <div className="space-y-1">
                {alert.falsePositives.map((fp, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-slate-400 text-sm">
                    <span className="text-slate-600">•</span>
                    <span>{fp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* IR Playbook Reference */}
          <div className="bg-teal-950/30 border border-teal-800/30 rounded-lg p-4 flex items-center gap-3">
            <FileText className="w-5 h-5 text-teal-400 shrink-0" />
            <p className="text-slate-400 text-sm">
              See the <span className="text-teal-300 font-medium">Incident Response Playbook</span> for detailed
              step-by-step containment, investigation, and recovery procedures for this alert type.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
