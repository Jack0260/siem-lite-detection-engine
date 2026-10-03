export type LogType = 'auth' | 'web';
export type LogFormat = 'ssh' | 'auth_log' | 'apache_common' | 'apache_combined' | 'nginx' | 'auto';

export type Severity = 'low' | 'medium' | 'high' | 'critical';

export type LogLevel = 'info' | 'warning' | 'error' | 'critical';

export interface NormalizedEvent {
  id: string;
  timestamp: number;
  timestampStr: string;
  sourceIp: string;
  username: string | null;
  userAgent: string | null;
  action: string;
  httpMethod: string | null;
  httpPath: string | null;
  httpStatus: number | null;
  success: boolean;
  logType: LogType;
  rawLine: string;
  // Geo data (populated by geo module for impossible travel)
  geo?: GeoLocation;
}

export interface GeoLocation {
  country: string;
  countryCode: string;
  region: string;
  city: string;
  lat: number;
  lon: number;
}

export interface RuleMatcher {
  field: string;
  value: string | number | boolean | null;
  type?: 'equals' | 'contains' | 'regex' | 'not_equals' | 'in' | 'not_in' | 'exists' | 'not_exists';
  values?: (string | number)[];
}

export interface RuleDetection {
  matchers?: RuleMatcher[];
  condition?: 'AND' | 'OR';
  threshold?: number;
  timeframeMinutes?: number;
  groupBy?: string;
  minDistanceKm?: number;
  maxTimeMinutes?: number;
}

export interface DetectionRule {
  id: string;
  title: string;
  description: string;
  logType: LogType;
  severity: Severity;
  mitre: {
    tactic: string;
    technique: string;
    techniqueId: string;
  };
  detection: RuleDetection;
  falsePositives?: string[];
  tags: string[];
}

export interface Alert {
  id: string;
  ruleId: string;
  ruleTitle: string;
  severity: Severity;
  score: number;
  entity: string;
  entityType: 'ip' | 'username' | 'user_agent';
  eventCount: number;
  timeRange: { start: number; end: number };
  mitre: {
    tactic: string;
    technique: string;
    techniqueId: string;
  };
  events: NormalizedEvent[];
  description: string;
  falsePositives: string[];
  recommendedActions: string[];
  createdAt: number;
}

export interface DetectionResult {
  alerts: Alert[];
  totalEvents: number;
  processedAt: number;
  rulesRun: number;
}

export interface TestCase {
  name: string;
  description: string;
  ruleId: string;
  logContent: string;
  logType: LogType;
  logFormat: LogFormat;
  shouldAlert: boolean;
  minAlerts?: number;
}

export interface TestResult {
  name: string;
  description: string;
  ruleId: string;
  passed: boolean;
  shouldAlert: boolean;
  actualAlerts: number;
  expectedMinAlerts: number;
  message: string;
}
