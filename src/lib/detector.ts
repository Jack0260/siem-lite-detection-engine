import type { DetectionRule, NormalizedEvent, RuleMatcher, Alert } from '@/types';
import { haversineKm, enrichEventsWithGeo } from './geo';

function getFieldValue(event: NormalizedEvent, field: string): unknown {
  const parts = field.split('.');
  let val: unknown = event;
  for (const part of parts) {
    if (val && typeof val === 'object' && part in (val as Record<string, unknown>)) {
      val = (val as Record<string, unknown>)[part];
    } else {
      val = undefined;
      break;
    }
  }
  return val;
}

function matchField(event: NormalizedEvent, matcher: RuleMatcher): boolean {
  const val = getFieldValue(event, matcher.field);

  switch (matcher.type) {
    case 'exists':
      return val !== undefined && val !== null && val !== '';
    case 'not_exists':
      return val === undefined || val === null || val === '';
    case 'not_equals':
      return val !== matcher.value;
    case 'contains':
      return val != null && String(val).toLowerCase().includes(String(matcher.value).toLowerCase());
    case 'regex': {
      if (val == null) return false;
      try {
        const regex = new RegExp(String(matcher.value), 'i');
        return regex.test(String(val));
      } catch {
        return false;
      }
    }
    case 'in':
      return matcher.values != null && matcher.values.includes(val as string | number);
    case 'not_in':
      return matcher.values == null || !matcher.values.includes(val as string | number);
    case 'equals':
    default:
      return val === matcher.value;
  }
}

function matchEvent(event: NormalizedEvent, rule: DetectionRule): boolean {
  if (!rule.detection.matchers || rule.detection.matchers.length === 0) return true;
  const condition = rule.detection.condition || 'AND';
  if (condition === 'OR') {
    return rule.detection.matchers.some((m) => matchField(event, m));
  }
  return rule.detection.matchers.every((m) => matchField(event, m));
}

function detectThreshold(events: NormalizedEvent[], rule: DetectionRule): Alert[] {
  const alerts: Alert[] = [];
  const threshold = rule.detection.threshold || 1;
  const windowMs = (rule.detection.timeframeMinutes || 60) * 60 * 1000;
  const groupBy = rule.detection.groupBy || 'sourceIp';

  const groups = new Map<string, NormalizedEvent[]>();
  for (const event of events) {
    if (!matchEvent(event, rule)) continue;
    const key = String(getFieldValue(event, groupBy) || 'unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  for (const [entity, groupEvents] of groups) {
    if (groupEvents.length < threshold) continue;

    // Sliding window: check if threshold is met within the window
    let bestWindow: NormalizedEvent[] | null = null;
    for (let i = 0; i < groupEvents.length; i++) {
      const windowEnd = groupEvents[i].timestamp + windowMs;
      const windowEvents = groupEvents.filter(
        (e) => e.timestamp >= groupEvents[i].timestamp && e.timestamp <= windowEnd
      );
      if (windowEvents.length >= threshold) {
        if (!bestWindow || windowEvents.length > bestWindow.length) {
          bestWindow = windowEvents;
        }
      }
    }

    if (bestWindow && bestWindow.length >= threshold) {
      alerts.push(buildAlert(rule, entity, groupBy, bestWindow));
    }
  }

  return alerts;
}

function detectImpossibleTravel(events: NormalizedEvent[], rule: DetectionRule): Alert[] {
  const alerts: Alert[] = [];
  const groupBy = rule.detection.groupBy || 'username';
  const minDistance = rule.detection.minDistanceKm || 500;
  const maxTimeMin = rule.detection.maxTimeMinutes || 60;
  const maxTimeMs = maxTimeMin * 60 * 1000;

  const groups = new Map<string, NormalizedEvent[]>();
  for (const event of events) {
    if (!matchEvent(event, rule)) continue;
    if (!event.sourceIp) continue;
    const key = String(getFieldValue(event, groupBy) || 'unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  for (const [entity, groupEvents] of groups) {
    const sorted = [...groupEvents].sort((a, b) => a.timestamp - b.timestamp);

    for (let i = 0; i < sorted.length - 1; i++) {
      const e1 = sorted[i];
      const e2 = sorted[i + 1];
      if (!e1.geo || !e2.geo) continue;
      if (e1.geo.lat === 0 && e1.geo.lon === 0) continue;
      if (e2.geo.lat === 0 && e2.geo.lon === 0) continue;

      const distance = haversineKm(e1.geo.lat, e1.geo.lon, e2.geo.lat, e2.geo.lon);
      const timeDiff = e2.timestamp - e1.timestamp;

      if (distance >= minDistance && timeDiff <= maxTimeMs && timeDiff > 0) {
        // Speed required in km/h
        const hours = timeDiff / (1000 * 60 * 60);
        const speed = distance / hours;

        alerts.push(
          buildAlert(rule, entity, groupBy, [e1, e2], {
            extraInfo: `Distance: ${Math.round(distance)}km in ${Math.round(timeDiff / 60000)}min (required speed: ${Math.round(speed)}km/h)`,
          })
        );
        break;
      }
    }
  }

  return alerts;
}

function detectSimpleMatch(events: NormalizedEvent[], rule: DetectionRule): Alert[] {
  const alerts: Alert[] = [];
  const groupBy = rule.detection.groupBy || 'sourceIp';

  const groups = new Map<string, NormalizedEvent[]>();
  for (const event of events) {
    if (!matchEvent(event, rule)) continue;
    const key = String(getFieldValue(event, groupBy) || 'unknown');
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key)!.push(event);
  }

  for (const [entity, groupEvents] of groups) {
    if (groupEvents.length > 0) {
      alerts.push(buildAlert(rule, entity, groupBy, groupEvents));
    }
  }

  return alerts;
}

function buildAlert(
  rule: DetectionRule,
  entity: string,
  groupBy: string,
  events: NormalizedEvent[],
  opts?: { extraInfo?: string }
): Alert {
  const severityScores: Record<string, number> = {
    low: 25,
    medium: 50,
    high: 75,
    critical: 100,
  };

  const baseScore = severityScores[rule.severity] || 50;

  // Contextual multipliers
  let score = baseScore;
  if (events.length > 20) score += 15;
  else if (events.length > 10) score += 10;
  else if (events.length > 5) score += 5;

  // Check if a successful login follows failures (brute force that succeeded)
  if (rule.id === 'ssh_brute_force') {
    const allEventsForEntity = events;
    const hasSuccess = allEventsForEntity.some((e) => e.success);
    if (hasSuccess) score += 20;
  }

  // Impossible travel after brute force gets escalated
  if (rule.id === 'impossible_travel') {
    score += 10;
  }

  score = Math.min(score, 100);

  const entityType = groupBy === 'username' ? 'username' : groupBy === 'userAgent' ? 'user_agent' : 'ip';

  return {
    id: `alert-${rule.id}-${entity}-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    ruleId: rule.id,
    ruleTitle: rule.title,
    severity: rule.severity,
    score,
    entity,
    entityType,
    eventCount: events.length,
    timeRange: {
      start: Math.min(...events.map((e) => e.timestamp)),
      end: Math.max(...events.map((e) => e.timestamp)),
    },
    mitre: { ...rule.mitre },
    events,
    description: opts?.extraInfo ? `${rule.description.trim()}\n${opts.extraInfo}` : rule.description.trim(),
    falsePositives: rule.falsePositives || [],
    recommendedActions: getRecommendedActions(rule.id),
    createdAt: Date.now(),
  };
}

function getRecommendedActions(ruleId: string): string[] {
  const actions: Record<string, string[]> = {
    ssh_brute_force: [
      'Block the source IP at the firewall or fail2ban',
      'Review successful logins from the same IP to identify compromised accounts',
      'Reset passwords for any accounts that had successful logins from this IP',
      'Enable SSH key-based authentication and disable password auth if possible',
      'Check for any unauthorized SSH sessions still active',
    ],
    impossible_travel: [
      'Immediately disable the affected user account pending investigation',
      'Contact the user to verify whether the login was legitimate',
      'Review all sessions and force logout on all devices',
      'Check for any data exfiltration or privilege escalation after the suspicious login',
      'Reset the user password and revoke any active sessions/tokens',
      'Review authentication logs for the user over the past 24-48 hours',
    ],
    suspicious_user_agent: [
      'Block the source IP if the pattern is persistent',
      'Review the requested paths for exploitation attempts (SQLi, XSS, LFI)',
      'Check if any requests resulted in successful exploitation (2xx on sensitive endpoints)',
      'Add the user-agent pattern to WAF block rules',
      'Correlate with other alerts from the same source IP',
    ],
  };
  return actions[ruleId] || ['Investigate the alert and determine if the activity is malicious'];
}

export function runDetection(events: NormalizedEvent[], rules: DetectionRule[]): Alert[] {
  // Enrich events with geo data for impossible travel detection
  enrichEventsWithGeo(events);

  const allAlerts: Alert[] = [];

  for (const rule of rules) {
    let ruleAlerts: Alert[] = [];

    if (rule.id === 'impossible_travel') {
      ruleAlerts = detectImpossibleTravel(events, rule);
    } else if (rule.detection.threshold && rule.detection.threshold > 1) {
      ruleAlerts = detectThreshold(events, rule);
    } else {
      ruleAlerts = detectSimpleMatch(events, rule);
    }

    allAlerts.push(...ruleAlerts);
  }

  allAlerts.sort((a, b) => b.score - a.score);
  return allAlerts;
}
