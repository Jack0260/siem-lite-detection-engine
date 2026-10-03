import { useState, useEffect, useCallback } from 'react';
import type { LogSessionRow } from '@/lib/supabase';
import { listSessions, loadSession, deleteSession } from '@/lib/sessionStore';
import { Database, Trash2, FolderOpen, RefreshCw, Clock, Shield, AlertTriangle, Activity } from 'lucide-react';

interface SessionsProps {
  onLoadSession: (events: import('@/types').NormalizedEvent[], alerts: import('@/types').Alert[], session: LogSessionRow) => void;
}

function formatDate(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit',
  });
}

const severityBadge: Record<string, string> = {
  critical: 'text-rose-300 bg-rose-950/50',
  high: 'text-orange-300 bg-orange-950/50',
  medium: 'text-amber-300 bg-amber-950/50',
  low: 'text-sky-300 bg-sky-950/50',
};

export default function Sessions({ onLoadSession }: SessionsProps) {
  const [sessions, setSessions] = useState<LogSessionRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [loadingId, setLoadingId] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setLoading(true);
    setError(null);
    const data = await listSessions();
    setSessions(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const handleLoad = async (sessionId: string) => {
    setLoadingId(sessionId);
    setError(null);
    const result = await loadSession(sessionId);
    if (result) {
      onLoadSession(result.events, result.alerts, result.session);
    } else {
      setError('Failed to load session. The data may have been deleted.');
    }
    setLoadingId(null);
  };

  const handleDelete = async (sessionId: string) => {
    const ok = await deleteSession(sessionId);
    if (ok) {
      setSessions((prev) => prev.filter((s) => s.id !== sessionId));
    } else {
      setError('Failed to delete session.');
    }
  };

  return (
    <div className="space-y-4">
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Database className="w-5 h-5 text-teal-400" />
          <div>
            <h3 className="text-white font-semibold text-sm">Saved Analysis Sessions</h3>
            <p className="text-slate-500 text-xs mt-0.5">
              Past log analysis runs are persisted in the database. Load a session to restore its events and alerts.
            </p>
          </div>
        </div>
        <button
          onClick={refresh}
          className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          Refresh
        </button>
      </div>

      {error && (
        <div className="bg-rose-950/40 border border-rose-800/40 rounded-lg px-4 py-3 text-rose-300 text-sm flex items-center gap-2">
          <AlertTriangle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}

      {loading && (
        <div className="flex items-center justify-center gap-2 py-12 text-slate-500">
          <RefreshCw className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading sessions...</span>
        </div>
      )}

      {!loading && sessions.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Database className="w-10 h-10" />
          <p className="text-sm">No saved sessions yet. Run an analysis and save it to store it in the database.</p>
        </div>
      )}

      <div className="space-y-2">
        {sessions.map((session) => (
          <div
            key={session.id}
            className="bg-slate-900/80 border border-slate-800 rounded-xl p-4 flex items-center gap-4"
          >
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center shrink-0">
              <Shield className="w-5 h-5 text-slate-500" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="text-white text-sm font-medium truncate">{session.name}</div>
              <div className="flex items-center gap-4 mt-1 text-xs text-slate-500">
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatDate(session.created_at)}
                </span>
                <span className="flex items-center gap-1">
                  <Activity className="w-3 h-3" />
                  {session.total_events} events
                </span>
                <span className="flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3" />
                  {session.total_alerts} alerts
                </span>
                <span className="text-slate-600 capitalize">{session.log_type}</span>
              </div>
            </div>

            <button
              onClick={() => handleLoad(session.id)}
              disabled={loadingId === session.id}
              className="flex items-center gap-2 bg-teal-600 hover:bg-teal-500 disabled:opacity-50 text-white text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
            >
              {loadingId === session.id ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <FolderOpen className="w-4 h-4" />
              )}
              Load
            </button>

            <button
              onClick={() => handleDelete(session.id)}
              className="text-slate-500 hover:text-rose-400 transition-colors p-1.5"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
