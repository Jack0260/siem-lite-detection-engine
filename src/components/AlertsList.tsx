import { useState, useMemo } from 'react';
import type { Alert, Severity } from '@/types';
import { Clock, Eye, ChevronDown, Shield, MapPin, Server, Tag, AlertTriangle } from 'lucide-react';

interface AlertsListProps {
  alerts: Alert[];
  onViewAlert: (alert: Alert) => void;
}

const severityColors: Record<Severity, { bg: string; text: string; border: string; dot: string; label: string }> = {
  critical: { bg: 'bg-rose-950/40', text: 'text-rose-300', border: 'border-rose-800/40', dot: 'bg-rose-400', label: 'Critical' },
  high: { bg: 'bg-orange-950/40', text: 'text-orange-300', border: 'border-orange-800/40', dot: 'bg-orange-400', label: 'High' },
  medium: { bg: 'bg-amber-950/40', text: 'text-amber-300', border: 'border-amber-800/40', dot: 'bg-amber-400', label: 'Medium' },
  low: { bg: 'bg-sky-950/40', text: 'text-sky-300', border: 'border-sky-800/40', dot: 'bg-sky-400', label: 'Low' },
};

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

type SortKey = 'score' | 'severity' | 'time' | 'count';

const severityOrder: Record<Severity, number> = { critical: 4, high: 3, medium: 2, low: 1 };

export default function AlertsList({ alerts, onViewAlert }: AlertsListProps) {
  const [filter, setFilter] = useState<Severity | 'all'>('all');
  const [sortKey, setSortKey] = useState<SortKey>('score');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    let result = alerts;
    if (filter !== 'all') result = result.filter((a) => a.severity === filter);
    if (search.trim()) {
      const q = search.toLowerCase();
      result = result.filter(
        (a) =>
          a.ruleTitle.toLowerCase().includes(q) ||
          a.entity.toLowerCase().includes(q) ||
          a.mitre.techniqueId.toLowerCase().includes(q) ||
          a.mitre.technique.toLowerCase().includes(q)
      );
    }
    result = [...result].sort((a, b) => {
      switch (sortKey) {
        case 'score': return b.score - a.score;
        case 'severity': return severityOrder[b.severity] - severityOrder[a.severity];
        case 'time': return b.timeRange.start - a.timeRange.start;
        case 'count': return b.eventCount - a.eventCount;
        default: return 0;
      }
    });
    return result;
  }, [alerts, filter, sortKey, search]);

  const filterButtons: (Severity | 'all')[] = ['all', 'critical', 'high', 'medium', 'low'];

  return (
    <div className="space-y-4">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5 flex-wrap">
          {filterButtons.map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors capitalize ${
                filter === f
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-slate-200'
              }`}
            >
              {f === 'all' ? 'All' : f}
              <span className="ml-1.5 text-xs opacity-70">
                {f === 'all' ? alerts.length : alerts.filter((a) => a.severity === f).length}
              </span>
            </button>
          ))}
        </div>

        <div className="flex gap-2 items-center">
          <input
            type="text"
            placeholder="Search alerts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-600 w-48"
          />
          <select
            value={sortKey}
            onChange={(e) => setSortKey(e.target.value as SortKey)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 focus:outline-none focus:border-teal-600"
          >
            <option value="score">Sort: Score</option>
            <option value="severity">Sort: Severity</option>
            <option value="time">Sort: Time</option>
            <option value="count">Sort: Event Count</option>
          </select>
        </div>
      </div>

      {/* Alert List */}
      <div className="space-y-2">
        {filtered.map((alert) => {
          const c = severityColors[alert.severity];
          return (
            <div
              key={alert.id}
              className={`${c.bg} ${c.border} border rounded-xl overflow-hidden transition-all hover:border-opacity-80`}
            >
              <button
                onClick={() => onViewAlert(alert)}
                className="w-full text-left p-4 flex items-center gap-4"
              >
                <div className={`w-2 h-12 rounded-full ${c.dot}`} />

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-xs font-bold uppercase ${c.text} px-2 py-0.5 rounded bg-slate-900/40`}>
                      {c.label}
                    </span>
                    <span className="text-white font-medium text-sm truncate">{alert.ruleTitle}</span>
                  </div>
                  <div className="flex items-center gap-4 text-xs text-slate-400">
                    <span className="flex items-center gap-1 font-mono">
                      {alert.entityType === 'ip' ? <Server className="w-3 h-3" /> : <MapPin className="w-3 h-3" />}
                      {alert.entity}
                    </span>
                    <span className="flex items-center gap-1">
                      <Tag className="w-3 h-3" />
                      {alert.mitre.techniqueId}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {formatTime(alert.timeRange.start)}
                    </span>
                  </div>
                </div>

                <div className="text-right shrink-0">
                  <div className={`text-2xl font-bold ${c.text}`}>{alert.score}</div>
                  <div className="text-xs text-slate-500">score</div>
                </div>

                <div className="shrink-0 text-right">
                  <div className="text-slate-300 font-mono text-sm">{alert.eventCount}</div>
                  <div className="text-xs text-slate-500">events</div>
                </div>

                <Eye className="w-5 h-5 text-slate-500 shrink-0" />
              </button>
            </div>
          );
        })}

        {filtered.length === 0 && (
          <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
            <Shield className="w-10 h-10" />
            <p className="text-sm">
              {alerts.length === 0 ? 'No alerts generated. Load sample logs or upload a file to begin.' : 'No alerts match the current filter.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
