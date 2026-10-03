import { useState, useRef } from 'react';
import type { LogType, LogFormat, NormalizedEvent, Alert } from '@/types';
import { normalizeLog } from '@/lib/normalizer';
import { runDetection } from '@/lib/detector';
import { loadBuiltinRules } from '@/lib/ruleLoader';
import { sampleLogs } from '@/lib/sampleLogs';
import { saveSession } from '@/lib/sessionStore';
import { Upload, FileText, Play, Loader2, Server, Globe, Zap, Save, CheckCircle2 } from 'lucide-react';

interface LogUploadProps {
  onResults: (events: NormalizedEvent[], alerts: Alert[]) => void;
}

export default function LogUpload({ onResults }: LogUploadProps) {
  const [content, setContent] = useState('');
  const [logType, setLogType] = useState<LogType>('auth');
  const [logFormat, setLogFormat] = useState<LogFormat>('auto');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [fileName, setFileName] = useState('');
  const [lastResults, setLastResults] = useState<{ events: NormalizedEvent[]; alerts: Alert[]; content: string; type: LogType; format: LogFormat } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = (file: File) => {
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      setContent(e.target?.result as string);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFile(file);
  };

  const runAnalysis = (rawContent: string, type: LogType, format: LogFormat) => {
    if (!rawContent.trim()) return;
    setLoading(true);
    setTimeout(() => {
      const events = normalizeLog(rawContent, type, format);
      const rules = loadBuiltinRules();
      const alerts = runDetection(events, rules);
      setLastResults({ events, alerts, content: rawContent, type, format });
      onResults(events, alerts);
      setLoading(false);
    }, 300);
  };

  const handleSave = async () => {
    if (!lastResults) return;
    setSaving(true);
    setSavedMsg(false);
    const name = fileName || `${lastResults.type} log — ${new Date().toLocaleString()}`;
    await saveSession(name, lastResults.type, lastResults.format, lastResults.content, lastResults.events, lastResults.alerts);
    setSaving(false);
    setSavedMsg(true);
    setTimeout(() => setSavedMsg(false), 3000);
  };

  const loadSample = (key: string) => {
    const sample = sampleLogs[key];
    if (!sample) return;
    setContent(sample.content);
    setLogType(sample.type);
    setLogFormat(sample.format);
    setFileName('');
  };

  const lineCount = content ? content.split('\n').filter((l) => l.trim()).length : 0;

  return (
    <div className="space-y-5">
      {/* Sample Log Quick Load */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Zap className="w-4 h-4 text-teal-400" />
          Quick Start — Load Sample Attack Logs
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
          {Object.entries(sampleLogs).map(([key, sample]) => (
            <button
              key={key}
              onClick={() => loadSample(key)}
              className="text-left bg-slate-900/80 border border-slate-800 rounded-lg p-3 hover:border-teal-700 transition-all group"
            >
              <div className="flex items-center gap-2 mb-1">
                {sample.type === 'auth' ? (
                  <Server className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                ) : (
                  <Globe className="w-4 h-4 text-slate-500 group-hover:text-teal-400 transition-colors" />
                )}
                <span className="text-slate-200 text-sm font-medium capitalize">
                  {key.replace(/([A-Z])/g, ' $1').replace(/^./, (c) => c.toUpperCase())}
                </span>
              </div>
              <p className="text-slate-500 text-xs leading-snug">{sample.description}</p>
            </button>
          ))}
        </div>
      </div>

      <div className="h-px bg-slate-800" />

      {/* Upload Area */}
      <div>
        <h3 className="text-white font-semibold text-sm mb-3 flex items-center gap-2">
          <Upload className="w-4 h-4 text-teal-400" />
          Upload Your Own Log File
        </h3>

        <div
          onDrop={handleDrop}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onClick={() => fileInputRef.current?.click()}
          className={`border-2 border-dashed rounded-xl p-8 text-center cursor-pointer transition-all ${
            dragOver ? 'border-teal-500 bg-teal-950/20' : 'border-slate-700 hover:border-slate-600'
          }`}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept=".log,.txt,.csv,.json"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
            className="hidden"
          />
          <Upload className="w-8 h-8 text-slate-600 mx-auto mb-2" />
          <p className="text-slate-400 text-sm">
            {fileName ? <span className="text-teal-300 font-medium">{fileName}</span> : 'Drop a log file here or click to browse'}
          </p>
          <p className="text-slate-600 text-xs mt-1">Supports .log, .txt, .csv, .json</p>
        </div>
      </div>

      {/* Log Type & Format Selection */}
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Log Type</label>
          <select
            value={logType}
            onChange={(e) => setLogType(e.target.value as LogType)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-600"
          >
            <option value="auth">Authentication Log</option>
            <option value="web">Web Server Log</option>
          </select>
        </div>
        <div>
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1.5 block">Log Format</label>
          <select
            value={logFormat}
            onChange={(e) => setLogFormat(e.target.value as LogFormat)}
            className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-teal-600"
          >
            <option value="auto">Auto-detect</option>
            <option value="ssh">SSH / Syslog</option>
            <option value="apache_common">Apache Common</option>
            <option value="apache_combined">Apache Combined</option>
            <option value="nginx">Nginx</option>
          </select>
        </div>
      </div>

      {/* Text Area */}
      <div>
        <div className="flex items-center justify-between mb-1.5">
          <label className="text-slate-400 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5">
            <FileText className="w-3.5 h-3.5" />
            Log Content
          </label>
          {lineCount > 0 && <span className="text-slate-500 text-xs font-mono">{lineCount} lines</span>}
        </div>
        <textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          placeholder="Paste log lines here, or load a sample above..."
          className="w-full h-48 bg-slate-950 border border-slate-800 rounded-lg px-4 py-3 text-sm text-slate-300 font-mono placeholder-slate-600 focus:outline-none focus:border-teal-600 resize-y"
          style={{ fontFamily: 'monospace' }}
        />
      </div>

      {/* Action Buttons */}
      <div className="flex gap-3">
        <button
          onClick={() => runAnalysis(content, logType, logFormat)}
          disabled={!content.trim() || loading}
          className="flex-1 bg-teal-600 hover:bg-teal-500 disabled:bg-slate-800 disabled:text-slate-600 text-white font-semibold py-3 rounded-xl transition-colors flex items-center justify-center gap-2"
        >
          {loading ? (
            <>
              <Loader2 className="w-5 h-5 animate-spin" />
              Analyzing...
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Run Detection Analysis
            </>
          )}
        </button>

        {lastResults && (
          <button
            onClick={handleSave}
            disabled={saving}
            className="bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-200 font-semibold py-3 px-5 rounded-xl transition-colors flex items-center justify-center gap-2"
          >
            {saving ? (
              <Loader2 className="w-5 h-5 animate-spin" />
            ) : savedMsg ? (
              <CheckCircle2 className="w-5 h-5 text-teal-400" />
            ) : (
              <Save className="w-5 h-5" />
            )}
            {saving ? 'Saving...' : savedMsg ? 'Saved!' : 'Save to DB'}
          </button>
        )}
      </div>
    </div>
  );
}
