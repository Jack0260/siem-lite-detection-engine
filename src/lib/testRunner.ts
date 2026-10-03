import type { TestCase, TestResult, NormalizedEvent, LogType, LogFormat } from '@/types';
import { normalizeLine, normalizeLog } from './normalizer';
import { runDetection } from './detector';
import { loadBuiltinRules } from './ruleLoader';
import { testCases } from './sampleLogs';

export function runTests(): TestResult[] {
  const rules = loadBuiltinRules();
  const results: TestResult[] = [];

  for (const tc of testCases) {
    if (tc.ruleId === '_normalizer') {
      results.push(runNormalizerAuthTest(tc));
      continue;
    }
    if (tc.ruleId === '_normalizer_web') {
      results.push(runNormalizerWebTest(tc));
      continue;
    }

    const rule = rules.find((r) => r.id === tc.ruleId);
    if (!rule) {
      results.push({
        name: tc.name,
        description: tc.description,
        ruleId: tc.ruleId,
        passed: false,
        shouldAlert: tc.shouldAlert,
        actualAlerts: 0,
        expectedMinAlerts: tc.minAlerts || 0,
        message: `Rule ${tc.ruleId} not found`,
      });
      continue;
    }

    const events = normalizeLog(tc.logContent, tc.logType as LogType, tc.logFormat as LogFormat);
    const alerts = runDetection(events, [rule]);
    const actualAlerts = alerts.length;
    const expectedMin = tc.minAlerts || 0;

    let passed: boolean;
    let message: string;

    if (tc.shouldAlert) {
      passed = actualAlerts >= expectedMin;
      message = passed
        ? `Generated ${actualAlerts} alert(s) (expected >= ${expectedMin})`
        : `Expected at least ${expectedMin} alert(s) but got ${actualAlerts}`;
    } else {
      passed = actualAlerts === 0;
      message = passed
        ? 'No alerts generated (correct — benign input)'
        : `Expected 0 alerts but got ${actualAlerts} (false positive)`;
    }

    results.push({
      name: tc.name,
      description: tc.description,
      ruleId: tc.ruleId,
      passed,
      shouldAlert: tc.shouldAlert,
      actualAlerts,
      expectedMinAlerts: expectedMin,
      message,
    });
  }

  return results;
}

function runNormalizerAuthTest(tc: TestCase): TestResult {
  const event = normalizeLine(tc.logContent, tc.logType as LogType, tc.logFormat as LogFormat);
  const passed =
    event !== null &&
    event.sourceIp === '203.0.113.50' &&
    event.username === 'admin' &&
    event.action === 'login_failed' &&
    event.success === false;

  return {
    name: tc.name,
    description: tc.description,
    ruleId: tc.ruleId,
    passed,
    shouldAlert: tc.shouldAlert,
    actualAlerts: passed ? 1 : 0,
    expectedMinAlerts: 1,
    message: passed
      ? 'Fields extracted correctly: ip=203.0.113.50, user=admin, action=login_failed'
      : `Field extraction failed: ${JSON.stringify(event)}`,
  };
}

function runNormalizerWebTest(tc: TestCase): TestResult {
  const event = normalizeLine(tc.logContent, tc.logType as LogType, tc.logFormat as LogFormat);
  const passed =
    event !== null &&
    event.sourceIp === '203.0.113.50' &&
    event.httpMethod === 'GET' &&
    event.httpPath === '/admin' &&
    event.httpStatus === 404 &&
    event.userAgent === 'curl/7.68.0';

  return {
    name: tc.name,
    description: tc.description,
    ruleId: tc.ruleId,
    passed,
    shouldAlert: tc.shouldAlert,
    actualAlerts: passed ? 1 : 0,
    expectedMinAlerts: 1,
    message: passed
      ? 'Fields extracted correctly: ip=203.0.113.50, method=GET, path=/admin, status=404, ua=curl/7.68.0'
      : `Field extraction failed: ${JSON.stringify(event)}`,
  };
}

export function getTestSummary(results: TestResult[]): {
  total: number;
  passed: number;
  failed: number;
  passRate: number;
} {
  const total = results.length;
  const passed = results.filter((r) => r.passed).length;
  const failed = total - passed;
  const passRate = total > 0 ? Math.round((passed / total) * 100) : 0;
  return { total, passed, failed, passRate };
}
