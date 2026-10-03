import { useState } from 'react';
import type { NormalizedEvent } from '@/types';
import { Globe, Server, Search, Clock } from 'lucide-react';

interface EventsListProps {
  events: NormalizedEvent[];
}

function formatTime(ts: number): string {
  return new Date(ts).toLocaleString(undefined, {
    month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit', second: '2-digit',
  });
}

export default function EventsList({ events }: EventsListProps) {
  const [search, setSearch] = useState('');
  const [typeFilter, setTypeFilter] = useState<'all' | 'auth' | 'web'>('all');

  const filtered = events.filter((e) => {
    if (typeFilter !== 'all' && e.logType !== typeFilter) return false;
    if (search.trim()) {
      const q = search.toLowerCase();
      return (
        e.sourceIp.toLowerCase().includes(q) ||
        (e.username?.toLowerCase().includes(q) ?? false) ||
        (e.userAgent?.toLowerCase().includes(q) ?? false) ||
        e.action.toLowerCase().includes(q) ||
        e.rawLine.toLowerCase().includes(q)
      );
    }
    return true;
  });

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3 items-start sm:items-center justify-between">
        <div className="flex gap-1.5">
          {(['all', 'auth', 'web'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setTypeFilter(t)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium capitalize transition-colors ${
                typeFilter === t
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
              }`}
            >
              {t === 'all' ? 'All' : t === 'auth' ? 'Auth' : 'Web'}
              <span className="ml-1.5 text-xs opacity-70">
                {t === 'all' ? events.length : events.filter((e) => e.logType === t).length}
              </span>
            </button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-500" />
          <input
            type="text"
            placeholder="Search events..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg px-3 py-1.5 text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-600 w-48"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase tracking-wider">
              <th className="text-left py-2 px-3 font-semibold">Time</th>
              <th className="text-left py-2 px-3 font-semibold">Type</th>
              <th className="text-left py-2 px-3 font-semibold">Source IP</th>
              <th className="text-left py-2 px-3 font-semibold">User</th>
              <th className="text-left py-2 px-3 font-semibold">Action</th>
              <th className="text-left py-2 px-3 font-semibold">Status</th>
              <th className="text-left py-2 px-3 font-semibold">Geo</th>
            </tr>
          </thead>
          <tbody>
            {filtered.slice(0, 200).map((event) => (
              <tr key={event.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                <td className="py-2 px-3 text-slate-400 font-mono text-xs whitespace-nowrap">
                  <div className="flex items-center gap-1">
                    <Clock className="w-3 h-3 text-slate-600" />
                    {formatTime(event.timestamp)}
                  </div>
                </td>
                <td className="py-2 px-3">
                  <span className={`text-xs font-medium px-2 py-0.5 rounded ${
                    event.logType === 'auth' ? 'bg-teal-950/50 text-teal-300' : 'bg-sky-950/50 text-sky-300'
                  }`}>
                    {event.logType}
                  </span>
                </td>
                <td className="py-2 px-3 text-slate-300 font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <Globe className="w-3 h-3 text-slate-600" />
                    {event.sourceIp || '—'}
                  </div>
                </td>
                <td className="py-2 px-3 text-slate-300 font-mono text-xs">
                  <div className="flex items-center gap-1">
                    <Server className="w-3 h-3 text-slate-600" />
                    {event.username || '—'}
                  </div>
                </td>
                <td className="py-2 px-3 text-slate-300 text-xs">{event.action}</td>
                <td className="py-2 px-3">
                  {event.success ? (
                    <span className="text-teal-400 text-xs font-medium">OK</span>
                  ) : (
                    <span className="text-rose-400 text-xs font-medium">FAIL</span>
                  )}
                  {event.httpStatus && (
                    <span className="text-slate-500 text-xs font-mono ml-1">{event.httpStatus}</span>
                  )}
                </td>
                <td className="py-2 px-3 text-slate-400 text-xs">
                  {event.geo && event.geo.country !== 'Private Network' ? (
                    <span>{event.geo.city}, {event.geo.country}</span>
                  ) : event.geo ? (
                    <span className="text-slate-600">Internal</span>
                  ) : (
                    <span className="text-slate-600">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filtered.length > 200 && (
        <p className="text-slate-500 text-xs text-center">
          Showing first 200 of {filtered.length} events
        </p>
      )}

      {filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center gap-3 py-16 text-slate-500">
          <Server className="w-10 h-10" />
          <p className="text-sm">No events to display. Load sample logs or upload a file.</p>
        </div>
      )}
    </div>
  );
}
