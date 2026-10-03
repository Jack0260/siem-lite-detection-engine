import { useState, useEffect, useCallback } from 'react';
import type { NormalizedEvent, Alert, DetectionRule, LogFormat } from '@/types';
import type { LogSessionRow } from '@/lib/supabase';
import { normalizeLog } from '@/lib/normalizer';
import { runDetection } from '@/lib/detector';
import { loadBuiltinRules } from '@/lib/ruleLoader';
import { sampleLogs } from '@/lib/sampleLogs';

import Overview from '@/components/Overview';
import AlertsList from '@/components/AlertsList';
import AlertDetail from '@/components/AlertDetail';
import LogUpload from '@/components/LogUpload';
import EventsList from '@/components/EventsList';
import RulesList from '@/components/RulesList';
import TestRunner from '@/components/TestRunner';
import DocsViewer from '@/components/DocsViewer';
import Sessions from '@/components/Sessions';

import {
  Shield, LayoutDashboard, AlertTriangle, Upload, List, BookOpen,
  FlaskConical, FileText, Activity, Database,
} from 'lucide-react';

type Page = 'overview' | 'alerts' | 'upload' | 'events' | 'rules' | 'tests' | 'docs' | 'sessions';

export default function App() {
  const [page, setPage] = useState<Page>('overview');
  const [events, setEvents] = useState<NormalizedEvent[]>([]);
  const [alerts, setAlerts] = useState<Alert[]>([]);
  const [selectedAlert, setSelectedAlert] = useState<Alert | null>(null);
  const [rules, setRules] = useState<DetectionRule[]>([]);
  const [docsPage, setDocsPage] = useState<'threat_model' | 'ir_playbook'>('threat_model');

  useEffect(() => {
    setRules(loadBuiltinRules());
  }, []);

  const runAnalysis = useCallback((rawContent: string, type: 'auth' | 'web', format: LogFormat) => {
    const evts = normalizeLog(rawContent, type, format);
    const r = loadBuiltinRules();
    const alts = runDetection(evts, r);
    setEvents(evts);
    setAlerts(alts);
  }, []);

  // Auto-load combined sample on first mount
  useEffect(() => {
    const sample = sampleLogs.combined;
    runAnalysis(sample.content, sample.type, sample.format);
  }, [runAnalysis]);

  const handleUploadResults = (evts: NormalizedEvent[], alts: Alert[]) => {
    setEvents(evts);
    setAlerts(alts);
    setPage('overview');
  };

  const navItems: { id: Page; label: string; icon: typeof Shield; badge?: number }[] = [
    { id: 'overview', label: 'Overview', icon: LayoutDashboard },
    { id: 'alerts', label: 'Alerts', icon: AlertTriangle, badge: alerts.length },
    { id: 'upload', label: 'Log Upload', icon: Upload },
    { id: 'events', label: 'Events', icon: List, badge: events.length },
    { id: 'sessions', label: 'Sessions', icon: Database },
    { id: 'rules', label: 'Rules', icon: BookOpen, badge: rules.length },
    { id: 'tests', label: 'Tests', icon: FlaskConical },
    { id: 'docs', label: 'Docs', icon: FileText },
  ];

  const criticalCount = alerts.filter((a) => a.severity === 'critical').length;
  const highCount = alerts.filter((a) => a.severity === 'high').length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-200 flex flex-col">
      {/* Header */}
      <header className="bg-slate-900/90 border-b border-slate-800 backdrop-blur-sm sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center justify-between h-14">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 bg-teal-600 rounded-lg flex items-center justify-center">
              <Shield className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-white font-bold text-lg leading-none">LogGuard</h1>
              <p className="text-slate-500 text-xs leading-none mt-0.5">Log Detection & Alerting</p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {alerts.length > 0 && (
              <div className="hidden sm:flex items-center gap-3 text-xs">
                {criticalCount > 0 && (
                  <span className="flex items-center gap-1.5 text-rose-300">
                    <span className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                    {criticalCount} Critical
                  </span>
                )}
                {highCount > 0 && (
                  <span className="flex items-center gap-1.5 text-orange-300">
                    <span className="w-2 h-2 rounded-full bg-orange-500" />
                    {highCount} High
                  </span>
                )}
                <span className="flex items-center gap-1.5 text-slate-400">
                  <Activity className="w-3 h-3" />
                  {events.length} events
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Nav */}
        <nav className="border-t border-slate-800/50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 flex items-center gap-1 overflow-x-auto">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <button
                  key={item.id}
                  onClick={() => setPage(item.id)}
                  className={`flex items-center gap-2 px-3 py-2.5 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                    page === item.id
                      ? 'text-teal-400 border-teal-500'
                      : 'text-slate-400 border-transparent hover:text-slate-200'
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  {item.label}
                  {item.badge != null && item.badge > 0 && (
                    <span className="text-xs bg-slate-800 text-slate-400 px-1.5 py-0.5 rounded-full font-mono">
                      {item.badge}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </nav>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-7xl mx-auto w-full px-4 sm:px-6 py-6">
        {page === 'overview' && (
          <Overview
            alerts={alerts}
            totalEvents={events.length}
            rulesCount={rules.length}
            onViewAlert={setSelectedAlert}
            onNavigate={(p) => setPage(p as Page)}
          />
        )}
        {page === 'alerts' && <AlertsList alerts={alerts} onViewAlert={setSelectedAlert} />}
        {page === 'upload' && <LogUpload onResults={handleUploadResults} />}
        {page === 'events' && <EventsList events={events} />}
        {page === 'sessions' && (
          <Sessions
            onLoadSession={(evts, alts) => {
              setEvents(evts);
              setAlerts(alts);
              setPage('overview');
            }}
          />
        )}
        {page === 'rules' && <RulesList rules={rules} />}
        {page === 'tests' && <TestRunner />}
        {page === 'docs' && <DocsViewer initialDoc={docsPage} />}
      </main>

      {/* Alert Detail Modal */}
      {selectedAlert && <AlertDetail alert={selectedAlert} onClose={() => setSelectedAlert(null)} />}

      {/* Footer */}
      <footer className="border-t border-slate-800 bg-slate-900/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>LogGuard — Sigma-style log detection with MITRE ATT&CK mapping</span>
          <span className="hidden sm:inline">All processing runs locally · Sessions persist to Supabase</span>
        </div>
      </footer>
    </div>
  );
}
