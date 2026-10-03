import type { Alert, Severity } from '@/types';
import { Shield, ShieldAlert, ShieldCheck, Activity, Clock, Server, Globe, Eye } from 'lucide-react';

interface OverviewProps {
  alerts: Alert[];
  totalEvents: number;
  rulesCount: number;
  onViewAlert: (alert: Alert) => void;
  onNavigate: (page: string) => void;
}

const severityColors: Record<Severity, { bg: string; text: string; border: string; label: string }> = {
  critical: { bg: 'bg-rose-950/60', text: 'text-rose-300', border: 'border-rose-800/50', label: 'Critical' },
  high: { bg: 'bg-orange-950/60', text: 'text-orange-300', border: 'border-orange-800/50', label: 'High' },
  medium: { bg: 'bg-amber-950/60', text: 'text-amber-300', border: 'border-amber-800/50', label: 'Medium' },
  low: { bg: 'bg-sky-950/60', text: 'text-sky-300', border: 'border-sky-800/50', label: 'Low' },
};

function formatTime(ts: number): string {
  const d = new Date(ts);
  return d.toLocaleString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
}

export default function Overview({ alerts, totalEvents, rulesCount, onViewAlert, onNavigate }: OverviewProps) {
  const critical = alerts.filter((a) => a.severity === 'critical').length;
  const high = alerts.filter((a) => a.severity === 'high').length;
  const medium = alerts.filter((a) => a.severity === 'medium').length;
  const low = alerts.filter((a) => a.severity === 'low').length;

  const topIps = new Map<string, number>();
  for (const alert of alerts) {
    if (alert.entityType === 'ip') {
      topIps.set(alert.entity, (topIps.get(alert.entity) || 0) + alert.eventCount);
    }
  }
  const sortedIps = [...topIps.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const severityBars = [
    { label: 'Critical', count: critical, color: 'bg-rose-500', pct: alerts.length > 0 ? (critical / alerts.length) * 100 : 0 },
    { label: 'High', count: high, color: 'bg-orange-500', pct: alerts.length > 0 ? (high / alerts.length) * 100 : 0 },
    { label: 'Medium', count: medium, color: 'bg-amber-500', pct: alerts.length > 0 ? (medium / alerts.length) * 100 : 0 },
    { label: 'Low', count: low, color: 'bg-sky-500', pct: alerts.length > 0 ? (low / alerts.length) * 100 : 0 },
  ];

  const mitreTags = new Map<string, { name: string; count: number }>();
  for (const alert of alerts) {
    const key = alert.mitre.techniqueId;
    if (!mitreTags.has(key)) {
      mitreTags.set(key, { name: `${alert.mitre.techniqueId} — ${alert.mitre.technique}`, count: 0 });
    }
    mitreTags.get(key)!.count++;
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Total Events</span>
            <Activity className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white">{totalEvents.toLocaleString()}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Total Alerts</span>
            <ShieldAlert className="w-5 h-5 text-orange-400" />
          </div>
          <div className="text-3xl font-bold text-white">{alerts.length}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Active Rules</span>
            <Shield className="w-5 h-5 text-teal-400" />
          </div>
          <div className="text-3xl font-bold text-white">{rulesCount}</div>
        </div>

        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
          <div className="flex items-center justify-between mb-2">
            <span className="text-slate-400 text-sm font-medium">Critical</span>
            <ShieldAlert className="w-5 h-5 text-rose-400" />
          </div>
          <div className="text-3xl font-bold text-rose-300">{critical}</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Severity Breakdown */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 lg:col-span-1">
          <h3 className="text-white font-semibold text-lg mb-4">Severity Breakdown</h3>
          <div className="space-y-3">
            {severityBars.map((bar) => (
              <div key={bar.label}>
                <div className="flex items-center justify-between mb-1.5">
                  <span className="text-slate-300 text-sm">{bar.label}</span>
                  <span className="text-slate-400 text-sm font-mono">{bar.count}</span>
                </div>
                <div className="h-2.5 bg-slate-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${bar.color} rounded-full transition-all duration-500`}
                    style={{ width: `${bar.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
          {alerts.length === 0 && (
            <div className="flex items-center gap-2 mt-4 text-teal-400 text-sm">
              <ShieldCheck className="w-4 h-4" />
              <span>No threats detected</span>
            </div>
          )}
        </div>

        {/* MITRE ATT&CK Coverage */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 lg:col-span-1">
          <h3 className="text-white font-semibold text-lg mb-4">MITRE ATT&CK Coverage</h3>
          <div className="space-y-2">
            {[...mitreTags.entries()].map(([id, info]) => (
              <div key={id} className="flex items-center justify-between bg-slate-800/50 rounded-lg px-3 py-2.5">
                <div>
                  <span className="text-teal-300 font-mono text-sm font-semibold">{info.name.split(' — ')[0]}</span>
                  <span className="text-slate-400 text-sm ml-2">{info.name.split(' — ')[1]}</span>
                </div>
                <span className="text-slate-300 text-sm font-mono bg-slate-700/50 px-2 py-0.5 rounded">{info.count}</span>
              </div>
            ))}
            {mitreTags.size === 0 && <p className="text-slate-500 text-sm">No MITRE techniques triggered</p>}
          </div>
        </div>

        {/* Top Flagged IPs */}
        <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5 lg:col-span-1">
          <h3 className="text-white font-semibold text-lg mb-4">Top Flagged IPs</h3>
          <div className="space-y-2">
            {sortedIps.map(([ip, count], idx) => (
              <div key={ip} className="flex items-center gap-3">
                <span className="text-slate-500 font-mono text-sm w-5">{idx + 1}.</span>
                <Globe className="w-4 h-4 text-slate-500" />
                <span className="text-slate-300 font-mono text-sm flex-1">{ip}</span>
                <span className="text-orange-300 font-mono text-sm">{count}</span>
              </div>
            ))}
            {sortedIps.length === 0 && <p className="text-slate-500 text-sm">No IPs flagged</p>}
          </div>
        </div>
      </div>

      {/* Recent Alerts */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-white font-semibold text-lg">Recent Alerts</h3>
          {alerts.length > 5 && (
            <button
              onClick={() => onNavigate('alerts')}
              className="text-teal-400 hover:text-teal-300 text-sm font-medium transition-colors"
            >
              View all →
            </button>
          )}
        </div>
        <div className="space-y-2">
          {alerts.slice(0, 5).map((alert) => {
            const c = severityColors[alert.severity];
            return (
              <button
                key={alert.id}
                onClick={() => onViewAlert(alert)}
                className={`w-full text-left flex items-center gap-4 ${c.bg} ${c.border} border rounded-lg px-4 py-3 hover:border-opacity-80 transition-all`}
              >
                <div className={`px-2.5 py-1 rounded text-xs font-bold ${c.text} bg-slate-900/50`}>
                  {c.label}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-white text-sm font-medium truncate">{alert.ruleTitle}</div>
                  <div className="text-slate-400 text-xs font-mono truncate">{alert.entity}</div>
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <Clock className="w-3.5 h-3.5" />
                  {formatTime(alert.timeRange.start)}
                </div>
                <div className="flex items-center gap-2 text-slate-400 text-xs">
                  <span className="font-mono">Score: {alert.score}</span>
                </div>
                <Eye className="w-4 h-4 text-slate-500" />
              </button>
            );
          })}
          {alerts.length === 0 && (
            <div className="flex items-center justify-center gap-2 py-8 text-slate-500">
              <ShieldCheck className="w-5 h-5" />
              <span>No alerts — load sample logs or upload a file to begin analysis</span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
