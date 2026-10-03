import { useState, useEffect } from 'react';
import type { TestResult } from '@/types';
import { runTests, getTestSummary } from '@/lib/testRunner';
import { CheckCircle2, XCircle, Play, Loader2, FlaskConical, RefreshCw } from 'lucide-react';

export default function TestRunner() {
  const [results, setResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasRun, setHasRun] = useState(false);

  const execute = () => {
    setLoading(true);
    setTimeout(() => {
      const r = runTests();
      setResults(r);
      setLoading(false);
      setHasRun(true);
    }, 400);
  };

  useEffect(() => {
    execute();
  }, []);

  const summary = getTestSummary(results);

  return (
    <div className="space-y-4">
      {/* Summary Header */}
      <div className="bg-slate-900/80 border border-slate-800 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <FlaskConical className="w-5 h-5 text-teal-400" />
            <h3 className="text-white font-semibold">Unit Tests</h3>
          </div>
          <button
            onClick={execute}
            disabled={loading}
            className="flex items-center gap-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium px-3 py-1.5 rounded-lg transition-colors"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Re-run Tests
          </button>
        </div>

        {hasRun && (
          <div className="grid grid-cols-4 gap-3">
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{summary.total}</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mt-0.5">Total</div>
            </div>
            <div className="bg-teal-950/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-teal-300">{summary.passed}</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mt-0.5">Passed</div>
            </div>
            <div className="bg-rose-950/40 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-rose-300">{summary.failed}</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mt-0.5">Failed</div>
            </div>
            <div className="bg-slate-800/50 rounded-lg p-3 text-center">
              <div className="text-2xl font-bold text-white">{summary.passRate}%</div>
              <div className="text-slate-500 text-xs uppercase tracking-wider mt-0.5">Pass Rate</div>
            </div>
          </div>
        )}
      </div>

      {/* Test Results */}
      <div className="space-y-2">
        {loading && (
          <div className="flex items-center justify-center gap-3 py-12 text-slate-500">
            <Loader2 className="w-6 h-6 animate-spin" />
            <span className="text-sm">Running tests...</span>
          </div>
        )}

        {!loading && results.map((result, idx) => (
          <div
            key={idx}
            className={`bg-slate-900/80 border rounded-lg p-4 ${
              result.passed ? 'border-teal-800/40' : 'border-rose-800/40'
            }`}
          >
            <div className="flex items-start gap-3">
              {result.passed ? (
                <CheckCircle2 className="w-5 h-5 text-teal-400 shrink-0 mt-0.5" />
              ) : (
                <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-white text-sm font-medium">{result.name}</span>
                  <span className="text-slate-500 text-xs font-mono">{result.ruleId}</span>
                </div>
                <p className="text-slate-400 text-xs leading-relaxed mb-1.5">{result.description}</p>
                <div className="flex items-center gap-3 text-xs">
                  <span className={result.passed ? 'text-teal-400' : 'text-rose-400'}>
                    {result.message}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">
                    Expected: {result.shouldAlert ? `>= ${result.expectedMinAlerts} alert(s)` : 'no alerts'}
                  </span>
                  <span className="text-slate-600">·</span>
                  <span className="text-slate-500">Actual: {result.actualAlerts}</span>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
