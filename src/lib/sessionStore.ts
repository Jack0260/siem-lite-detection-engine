import { supabase } from './supabase';
import type { NormalizedEvent, Alert, LogType, LogFormat } from '@/types';
import type { LogSessionRow, EventRow, AlertRow } from './supabase';
import { normalizeLog } from './normalizer';
import { runDetection } from './detector';
import { loadBuiltinRules } from './ruleLoader';

export interface SavedSession {
  session: LogSessionRow;
  events: NormalizedEvent[];
  alerts: Alert[];
}

export async function saveSession(
  name: string,
  logType: LogType,
  logFormat: LogFormat,
  rawContent: string,
  events: NormalizedEvent[],
  alerts: Alert[]
): Promise<string | null> {
  const { data: sessionData, error: sessionErr } = await supabase
    .from('log_sessions')
    .insert({
      name,
      log_type: logType,
      log_format: logFormat,
      total_events: events.length,
      total_alerts: alerts.length,
      raw_content: rawContent,
    })
    .select('id')
    .single();

  if (sessionErr || !sessionData) {
    return null;
  }

  const sessionId = sessionData.id;

  // Insert events in batches of 500
  const eventBatches: Record<string, unknown>[][] = [];
  for (let i = 0; i < events.length; i += 500) {
    eventBatches.push(
      events.slice(i, i + 500).map((e) => ({
        session_id: sessionId,
        timestamp: e.timestamp,
        timestamp_str: e.timestampStr,
        source_ip: e.sourceIp,
        username: e.username,
        user_agent: e.userAgent,
        action: e.action,
        http_method: e.httpMethod,
        http_path: e.httpPath,
        http_status: e.httpStatus,
        success: e.success,
        log_type: e.logType,
        raw_line: e.rawLine,
        geo_country: e.geo?.country ?? null,
        geo_country_code: e.geo?.countryCode ?? null,
        geo_region: e.geo?.region ?? null,
        geo_city: e.geo?.city ?? null,
        geo_lat: e.geo?.lat ?? null,
        geo_lon: e.geo?.lon ?? null,
      }))
    );
  }

  for (const batch of eventBatches) {
    const { error } = await supabase.from('events').insert(batch);
    if (error) return null;
  }

  // Insert alerts
  if (alerts.length > 0) {
    const alertRows = alerts.map((a) => ({
      session_id: sessionId,
      rule_id: a.ruleId,
      rule_title: a.ruleTitle,
      severity: a.severity,
      score: a.score,
      entity: a.entity,
      entity_type: a.entityType,
      event_count: a.eventCount,
      time_start: a.timeRange.start,
      time_end: a.timeRange.end,
      mitre_tactic: a.mitre.tactic,
      mitre_technique: a.mitre.technique,
      mitre_technique_id: a.mitre.techniqueId,
      description: a.description,
      false_positives: a.falsePositives,
      recommended_actions: a.recommendedActions,
    }));

    const { error: alertErr } = await supabase.from('alerts').insert(alertRows);
    if (alertErr) return null;
  }

  return sessionId;
}

export async function listSessions(): Promise<LogSessionRow[]> {
  const { data, error } = await supabase
    .from('log_sessions')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !data) return [];
  return data as LogSessionRow[];
}

export async function loadSession(sessionId: string): Promise<SavedSession | null> {
  const { data: session, error: sErr } = await supabase
    .from('log_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (sErr || !session) return null;

  const { data: eventRows, error: eErr } = await supabase
    .from('events')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true });

  if (eErr || !eventRows) return null;

  const { data: alertRows, error: aErr } = await supabase
    .from('alerts')
    .select('*')
    .eq('session_id', sessionId)
    .order('score', { ascending: false });

  if (aErr || !alertRows) return null;

  const events: NormalizedEvent[] = (eventRows as EventRow[]).map((r) => ({
    id: r.id,
    timestamp: r.timestamp,
    timestampStr: r.timestamp_str,
    sourceIp: r.source_ip,
    username: r.username,
    userAgent: r.user_agent,
    action: r.action,
    httpMethod: r.http_method,
    httpPath: r.http_path,
    httpStatus: r.http_status,
    success: r.success,
    logType: r.log_type as LogType,
    rawLine: r.raw_line,
    geo: r.geo_country
      ? {
          country: r.geo_country,
          countryCode: r.geo_country_code || '',
          region: r.geo_region || '',
          city: r.geo_city || '',
          lat: r.geo_lat || 0,
          lon: r.geo_lon || 0,
        }
      : undefined,
  }));

  const alerts: Alert[] = (alertRows as AlertRow[]).map((r) => ({
    id: r.id,
    ruleId: r.rule_id,
    ruleTitle: r.rule_title,
    severity: r.severity as Alert['severity'],
    score: r.score,
    entity: r.entity,
    entityType: r.entity_type as Alert['entityType'],
    eventCount: r.event_count,
    timeRange: { start: r.time_start, end: r.time_end },
    mitre: {
      tactic: r.mitre_tactic,
      technique: r.mitre_technique,
      techniqueId: r.mitre_technique_id,
    },
    events: [],
    description: r.description,
    falsePositives: r.false_positives || [],
    recommendedActions: r.recommended_actions || [],
    createdAt: new Date(r.created_at).getTime(),
  }));

  return { session: session as LogSessionRow, events, alerts };
}

export async function deleteSession(sessionId: string): Promise<boolean> {
  const { error } = await supabase.from('log_sessions').delete().eq('id', sessionId);
  return !error;
}

export async function reRunSession(sessionId: string): Promise<SavedSession | null> {
  const { data: session, error } = await supabase
    .from('log_sessions')
    .select('*')
    .eq('id', sessionId)
    .maybeSingle();

  if (error || !session) return null;

  const s = session as LogSessionRow;
  if (!s.raw_content) return null;

  const events = normalizeLog(s.raw_content, s.log_type as LogType, s.log_format as LogFormat);
  const rules = loadBuiltinRules();
  const alerts = runDetection(events, rules);

  // Delete old events and alerts, then re-save
  await supabase.from('events').delete().eq('session_id', sessionId);
  await supabase.from('alerts').delete().eq('session_id', sessionId);

  // Update session counts
  await supabase
    .from('log_sessions')
    .update({ total_events: events.length, total_alerts: alerts.length })
    .eq('id', sessionId);

  // Re-insert events
  const eventBatches: Record<string, unknown>[][] = [];
  for (let i = 0; i < events.length; i += 500) {
    eventBatches.push(
      events.slice(i, i + 500).map((e) => ({
        session_id: sessionId,
        timestamp: e.timestamp,
        timestamp_str: e.timestampStr,
        source_ip: e.sourceIp,
        username: e.username,
        user_agent: e.userAgent,
        action: e.action,
        http_method: e.httpMethod,
        http_path: e.httpPath,
        http_status: e.httpStatus,
        success: e.success,
        log_type: e.logType,
        raw_line: e.rawLine,
        geo_country: e.geo?.country ?? null,
        geo_country_code: e.geo?.countryCode ?? null,
        geo_region: e.geo?.region ?? null,
        geo_city: e.geo?.city ?? null,
        geo_lat: e.geo?.lat ?? null,
        geo_lon: e.geo?.lon ?? null,
      }))
    );
  }

  for (const batch of eventBatches) {
    await supabase.from('events').insert(batch);
  }

  // Re-insert alerts
  if (alerts.length > 0) {
    const alertRows = alerts.map((a) => ({
      session_id: sessionId,
      rule_id: a.ruleId,
      rule_title: a.ruleTitle,
      severity: a.severity,
      score: a.score,
      entity: a.entity,
      entity_type: a.entityType,
      event_count: a.eventCount,
      time_start: a.timeRange.start,
      time_end: a.timeRange.end,
      mitre_tactic: a.mitre.tactic,
      mitre_technique: a.mitre.technique,
      mitre_technique_id: a.mitre.techniqueId,
      description: a.description,
      false_positives: a.falsePositives,
      recommended_actions: a.recommendedActions,
    }));
    await supabase.from('alerts').insert(alertRows);
  }

  return loadSession(sessionId);
}
