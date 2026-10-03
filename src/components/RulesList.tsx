import type { DetectionRule, Severity } from '@/types';
import { Tag, Shield, FileText, AlertCircle } from 'lucide-react';

interface RulesListProps {
  rules: DetectionRule[];
}

const severityColors: Record<Severity, { text: string; bg: string; label: string }> = {
  critical: { text: 'text-rose-300', bg: 'bg-rose-950/50', label: 'Critical' },
  high: { text: 'text-orange-300', bg: 'bg-orange-950/50', label: 'High' },
  medium: { text: 'text-amber-300', bg: 'bg-amber-950/50', label: 'Medium' },
  low: { text: 'text-sky-300', bg: 'bg-sky-950/50', label: 'Low' },
};

export default function RulesList({ rules }: RulesListProps) {
  return (
    <div className="space-y-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-3">
        <Shield className="w-5 h-5 text-teal-400" />
        <p className="text-slate-400 text-sm">
          Detection rules are defined in <span className="text-slate-300 font-mono text-xs">Sigma-style YAML</span> format.
          Each rule specifies matchers, thresholds, time windows, severity, and MITRE ATT&CK mappings.
        </p>
      </div>

      <div className="space-y-3">
        {rules.map((rule) => {
          const s = severityColors[rule.severity];
          return (
            <div key={rule.id} className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="text-white font-semibold text-base">{rule.title}</h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`text-xs font-bold uppercase ${s.text} ${s.bg} px-2 py-0.5 rounded`}>{s.label}</span>
                    <span className="text-slate-500 text-xs font-mono">{rule.id}</span>
                    <span className="text-slate-500 text-xs">·</span>
                    <span className="text-slate-400 text-xs capitalize">{rule.logType} log</span>
                  </div>
                </div>
                <div className="flex items-center gap-2 text-right">
                  <Tag className="w-4 h-4 text-teal-400" />
                  <div>
                    <div className="text-teal-300 font-mono text-sm font-semibold">{rule.mitre.techniqueId}</div>
                    <div className="text-slate-500 text-xs">{rule.mitre.technique}</div>
                  </div>
                </div>
              </div>

              <p className="text-slate-400 text-sm leading-relaxed mb-3">{rule.description.trim()}</p>

              <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
                {rule.detection.threshold && (
                  <div className="bg-slate-800/50 rounded-lg p-2.5">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Threshold</div>
                    <div className="text-slate-200 font-mono text-sm">{rule.detection.threshold} events</div>
                  </div>
                )}
                {rule.detection.timeframeMinutes && (
                  <div className="bg-slate-800/50 rounded-lg p-2.5">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Time Window</div>
                    <div className="text-slate-200 font-mono text-sm">{rule.detection.timeframeMinutes} min</div>
                  </div>
                )}
                {rule.detection.groupBy && (
                  <div className="bg-slate-800/50 rounded-lg p-2.5">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Group By</div>
                    <div className="text-slate-200 font-mono text-sm">{rule.detection.groupBy}</div>
                  </div>
                )}
                {rule.detection.minDistanceKm && (
                  <div className="bg-slate-800/50 rounded-lg p-2.5">
                    <div className="text-slate-500 text-xs uppercase tracking-wider mb-0.5">Min Distance</div>
                    <div className="text-slate-200 font-mono text-sm">{rule.detection.minDistanceKm} km</div>
                  </div>
                )}
              </div>

              {/* Matchers */}
              {rule.detection.matchers && rule.detection.matchers.length > 0 && (
                <div className="mb-3">
                  <div className="text-slate-500 text-xs uppercase tracking-wider mb-1.5">Detection Matchers</div>
                  <div className="flex flex-wrap gap-2">
                    {rule.detection.matchers.map((m, idx) => (
                      <span key={idx} className="text-xs bg-slate-800 text-slate-300 font-mono px-2 py-1 rounded">
                        {m.field} {m.type || 'equals'} {m.value !== null ? String(m.value).substring(0, 40) : ''}
                      </span>
                    ))}
                  </div>
                </div>
              )}

              {/* Tags */}
              <div className="flex flex-wrap gap-1.5">
                {rule.tags.map((tag) => (
                  <span key={tag} className="text-xs text-slate-500 font-mono bg-slate-800/30 px-1.5 py-0.5 rounded">
                    {tag}
                  </span>
                ))}
              </div>

              {/* False Positives */}
              {rule.falsePositives && rule.falsePositives.length > 0 && (
                <div className="mt-3 pt-3 border-t border-slate-800">
                  <div className="flex items-center gap-1.5 text-slate-500 text-xs uppercase tracking-wider mb-1.5">
                    <AlertCircle className="w-3.5 h-3.5" />
                    Potential False Positives
                  </div>
                  <ul className="space-y-1">
                    {rule.falsePositives.map((fp, idx) => (
                      <li key={idx} className="text-slate-400 text-sm flex items-start gap-2">
                        <span className="text-slate-600 mt-0.5">•</span>
                        <span>{fp}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
