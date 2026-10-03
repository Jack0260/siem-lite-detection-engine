import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables. Check .env file.');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface LogSessionRow {
  id: string;
  name: string;
  log_type: string;
  log_format: string;
  total_events: number;
  total_alerts: number;
  raw_content: string | null;
  created_at: string;
}

export interface EventRow {
  id: string;
  session_id: string;
  timestamp: number;
  timestamp_str: string;
  source_ip: string;
  username: string | null;
  user_agent: string | null;
  action: string;
  http_method: string | null;
  http_path: string | null;
  http_status: number | null;
  success: boolean;
  log_type: string;
  raw_line: string;
  geo_country: string | null;
  geo_country_code: string | null;
  geo_region: string | null;
  geo_city: string | null;
  geo_lat: number | null;
  geo_lon: number | null;
}

export interface AlertRow {
  id: string;
  session_id: string;
  rule_id: string;
  rule_title: string;
  severity: string;
  score: number;
  entity: string;
  entity_type: string;
  event_count: number;
  time_start: number;
  time_end: number;
  mitre_tactic: string;
  mitre_technique: string;
  mitre_technique_id: string;
  description: string;
  false_positives: string[];
  recommended_actions: string[];
  created_at: string;
}
