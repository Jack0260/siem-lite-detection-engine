import { load as yamlLoad, dump as yamlDump } from 'js-yaml';
import type { DetectionRule, LogType, Severity } from '@/types';

import bruteForceYml from '@/rules/ssh_brute_force.yml?raw';
import impossibleTravelYml from '@/rules/impossible_travel.yml?raw';
import suspiciousUAYml from '@/rules/suspicious_user_agent.yml?raw';

interface RawRule {
  title: string;
  id: string;
  description: string;
  logType: string;
  severity: string;
  mitre: {
    tactic: string;
    technique: string;
    techniqueId: string;
  };
  detection: {
    matchers?: Record<string, unknown>[];
    condition?: string;
    threshold?: number;
    timeframeMinutes?: number;
    groupBy?: string;
    minDistanceKm?: number;
    maxTimeMinutes?: number;
  };
  falsePositives?: string[];
  tags: string[];
}

function normalizeRule(raw: RawRule): DetectionRule {
  const matchers = (raw.detection.matchers || []).map((m) => ({
    field: String(m.field),
    value: (m.value === undefined ? null : m.value) as string | number | boolean | null,
    type: (m.type as RuleMatcherType) || 'equals',
    values: m.values as (string | number)[] | undefined,
  }));

  return {
    id: raw.id,
    title: raw.title,
    description: raw.description,
    logType: raw.logType as LogType,
    severity: raw.severity as Severity,
    mitre: raw.mitre,
    detection: {
      matchers,
      condition: (raw.detection.condition as 'AND' | 'OR') || 'AND',
      threshold: raw.detection.threshold,
      timeframeMinutes: raw.detection.timeframeMinutes,
      groupBy: raw.detection.groupBy,
      minDistanceKm: raw.detection.minDistanceKm,
      maxTimeMinutes: raw.detection.maxTimeMinutes,
    },
    falsePositives: raw.falsePositives || [],
    tags: raw.tags || [],
  };
}

type RuleMatcherType = 'equals' | 'contains' | 'regex' | 'not_equals' | 'in' | 'not_in' | 'exists' | 'not_exists';

export function parseRule(yamlContent: string): DetectionRule {
  const raw = yamlLoad(yamlContent) as RawRule;
  return normalizeRule(raw);
}

export function parseRules(yamlContents: string[]): DetectionRule[] {
  return yamlContents.map((c) => parseRule(c));
}

export function loadBuiltinRules(): DetectionRule[] {
  return parseRules([bruteForceYml, impossibleTravelYml, suspiciousUAYml]);
}

export function ruleToYaml(rule: DetectionRule): string {
  const raw: RawRule = {
    title: rule.title,
    id: rule.id,
    description: rule.description,
    logType: rule.logType,
    severity: rule.severity,
    mitre: rule.mitre,
    detection: {
      matchers: rule.detection.matchers?.map((m) => ({
        field: m.field,
        value: m.value,
        type: m.type,
        values: m.values,
      })),
      condition: rule.detection.condition,
      threshold: rule.detection.threshold,
      timeframeMinutes: rule.detection.timeframeMinutes,
      groupBy: rule.detection.groupBy,
      minDistanceKm: rule.detection.minDistanceKm,
      maxTimeMinutes: rule.detection.maxTimeMinutes,
    },
    falsePositives: rule.falsePositives,
    tags: rule.tags,
  };
  return yamlDump(raw, { lineWidth: 120 });
}
