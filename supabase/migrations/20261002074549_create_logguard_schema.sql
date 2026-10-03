/*
# LogGuard — Create database schema for log detection persistence

## Overview
This migration creates three tables to persist log analysis sessions, normalized events,
and generated alerts. The app is a single-tenant tool with no sign-in screen, so all
policies use `TO anon, authenticated` to allow the anon-key frontend to read and write.

## New Tables

### 1. log_sessions
Stores metadata about each log analysis run (upload or sample load).
- id (uuid, primary key)
- name (text, label for the session — e.g. filename or sample name)
- log_type (text, 'auth' or 'web')
- log_format (text, format used for parsing)
- total_events (int, count of normalized events)
- total_alerts (int, count of alerts generated)
- raw_content (text, the original log content)
- created_at (timestamptz)

### 2. events
Stores normalized log events belonging to a session.
- id (uuid, primary key)
- session_id (uuid, foreign key to log_sessions, ON DELETE CASCADE)
- timestamp (bigint, epoch milliseconds)
- timestamp_str (text, original timestamp string from log)
- source_ip (text)
- username (text, nullable)
- user_agent (text, nullable)
- action (text, e.g. 'login_failed', 'http_request')
- http_method (text, nullable)
- http_path (text, nullable)
- http_status (int, nullable)
- success (boolean)
- log_type (text, 'auth' or 'web')
- raw_line (text, original log line)
- geo_country (text, nullable)
- geo_country_code (text, nullable)
- geo_region (text, nullable)
- geo_city (text, nullable)
- geo_lat (double precision, nullable)
- geo_lon (double precision, nullable)

### 3. alerts
Stores generated alerts from the detection engine.
- id (uuid, primary key)
- session_id (uuid, foreign key to log_sessions, ON DELETE CASCADE)
- rule_id (text, e.g. 'ssh_brute_force')
- rule_title (text)
- severity (text, 'low'|'medium'|'high'|'critical')
- score (int, 0-100)
- entity (text, the flagged IP/username/UA)
- entity_type (text, 'ip'|'username'|'user_agent')
- event_count (int)
- time_start (bigint, epoch ms)
- time_end (bigint, epoch ms)
- mitre_tactic (text)
- mitre_technique (text)
- mitre_technique_id (text)
- description (text)
- false_positives (text[], array of strings)
- recommended_actions (text[], array of strings)
- created_at (timestamptz)

## Security
- RLS enabled on all three tables.
- All policies use `TO anon, authenticated` with `USING (true)` / `WITH CHECK (true)`
  because this is a single-tenant, no-auth app where all data is intentionally shared.
- 4 policies per table (SELECT, INSERT, UPDATE, DELETE).

## Indexes
- events.session_id for filtering events by session
- alerts.session_id for filtering alerts by session
- alerts.severity for severity-based dashboard queries
- log_sessions.created_at desc for listing recent sessions
*/

-- ─── log_sessions ───
CREATE TABLE IF NOT EXISTS log_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  log_type text NOT NULL DEFAULT 'auth',
  log_format text NOT NULL DEFAULT 'auto',
  total_events int NOT NULL DEFAULT 0,
  total_alerts int NOT NULL DEFAULT 0,
  raw_content text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE log_sessions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_log_sessions" ON log_sessions;
CREATE POLICY "anon_select_log_sessions" ON log_sessions FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_log_sessions" ON log_sessions;
CREATE POLICY "anon_insert_log_sessions" ON log_sessions FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_log_sessions" ON log_sessions;
CREATE POLICY "anon_update_log_sessions" ON log_sessions FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_log_sessions" ON log_sessions;
CREATE POLICY "anon_delete_log_sessions" ON log_sessions FOR DELETE
  TO anon, authenticated USING (true);

-- ─── events ───
CREATE TABLE IF NOT EXISTS events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES log_sessions(id) ON DELETE CASCADE,
  timestamp bigint NOT NULL,
  timestamp_str text NOT NULL DEFAULT '',
  source_ip text NOT NULL DEFAULT '',
  username text,
  user_agent text,
  action text NOT NULL DEFAULT '',
  http_method text,
  http_path text,
  http_status int,
  success boolean NOT NULL DEFAULT false,
  log_type text NOT NULL DEFAULT 'auth',
  raw_line text NOT NULL DEFAULT '',
  geo_country text,
  geo_country_code text,
  geo_region text,
  geo_city text,
  geo_lat double precision,
  geo_lon double precision,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_events" ON events;
CREATE POLICY "anon_select_events" ON events FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_events" ON events;
CREATE POLICY "anon_insert_events" ON events FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_events" ON events;
CREATE POLICY "anon_update_events" ON events FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_events" ON events;
CREATE POLICY "anon_delete_events" ON events FOR DELETE
  TO anon, authenticated USING (true);

-- ─── alerts ───
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid NOT NULL REFERENCES log_sessions(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  rule_title text NOT NULL,
  severity text NOT NULL DEFAULT 'medium',
  score int NOT NULL DEFAULT 50,
  entity text NOT NULL DEFAULT '',
  entity_type text NOT NULL DEFAULT 'ip',
  event_count int NOT NULL DEFAULT 0,
  time_start bigint NOT NULL DEFAULT 0,
  time_end bigint NOT NULL DEFAULT 0,
  mitre_tactic text NOT NULL DEFAULT '',
  mitre_technique text NOT NULL DEFAULT '',
  mitre_technique_id text NOT NULL DEFAULT '',
  description text NOT NULL DEFAULT '',
  false_positives text[] NOT NULL DEFAULT '{}',
  recommended_actions text[] NOT NULL DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_alerts" ON alerts;
CREATE POLICY "anon_select_alerts" ON alerts FOR SELECT
  TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_alerts" ON alerts;
CREATE POLICY "anon_insert_alerts" ON alerts FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_alerts" ON alerts;
CREATE POLICY "anon_update_alerts" ON alerts FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_alerts" ON alerts;
CREATE POLICY "anon_delete_alerts" ON alerts FOR DELETE
  TO anon, authenticated USING (true);

-- ─── Indexes ───
CREATE INDEX IF NOT EXISTS idx_events_session_id ON events(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_session_id ON alerts(session_id);
CREATE INDEX IF NOT EXISTS idx_alerts_severity ON alerts(severity);
CREATE INDEX IF NOT EXISTS idx_log_sessions_created_at ON log_sessions(created_at DESC);
