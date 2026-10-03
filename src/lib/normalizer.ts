import type { NormalizedEvent, LogType, LogFormat } from '@/types';

let eventCounter = 0;

function genId(): string {
  eventCounter += 1;
  return `evt-${eventCounter}-${Date.now()}`;
}

function parseSyslogTimestamp(dateStr: string, timeStr: string): number {
  const now = new Date();
  const year = now.getFullYear();
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthIdx = months.indexOf(dateStr.split(' ')[0]);
  if (monthIdx < 0) return Date.now();
  const day = parseInt(dateStr.split(' ')[1] || '1', 10);
  const [h, m, s] = timeStr.split(':').map((x) => parseInt(x, 10));
  return new Date(year, monthIdx, day, h || 0, m || 0, s || 0).getTime();
}

function parseIsoTimestamp(ts: string): number {
  const d = new Date(ts);
  return isNaN(d.getTime()) ? Date.now() : d.getTime();
}

interface ParsedAuthLine {
  timestamp: number;
  timestampStr: string;
  sourceIp: string;
  username: string | null;
  action: string;
  success: boolean;
  rawLine: string;
}

function parseAuthLine(line: string): ParsedAuthLine | null {
  // SSH: "Jan 15 10:23:45 sshd[1234]: Failed password for invalid user admin from 192.168.1.100 port 50234 ssh2"
  // SSH success: "Jan 15 10:23:45 sshd[1234]: Accepted password for admin from 192.168.1.100 port 50234 ssh2"
  // auth.log: "Jan 15 10:23:45 myhost sshd[1234]: Failed password for invalid user root from 10.0.0.5 port 42200 ssh2"
  // sudo: "Jan 15 10:23:45 myhost sudo: admin : TTY=pts/0 ; PWD=/home/admin ; COMMAND=/bin/su"

  const sshPattern =
    /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+sshd\[\d+\]:\s+(Failed|Accepted)\s+\w+\s+(?:for\s+(?:invalid\s+user\s+)?(\S+)\s+from\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}))\s+port\s+\d+/;
  const match = line.match(sshPattern);
  if (match) {
    const [, datePart, result, username, ip] = match;
    const timeStr = datePart.split(' ').slice(1).join(' ');
    const dateStr = datePart.split(' ')[0] + ' ' + (datePart.split(' ')[1] || '');
    const ts = parseSyslogTimestamp(dateStr, timeStr);
    return {
      timestamp: ts,
      timestampStr: datePart,
      sourceIp: ip,
      username,
      action: result === 'Failed' ? 'login_failed' : 'login_success',
      success: result === 'Accepted',
      rawLine: line,
    };
  }

  // Generic auth.log with "from <ip>"
  const genericPattern =
    /^(\w{3}\s+\d{1,2}\s+\d{2}:\d{2}:\d{2})\s+\S+\s+(\S+?)(?:\[\d+\])?:\s+(.*)$/;
  const gMatch = line.match(genericPattern);
  if (gMatch) {
    const [, datePart, service, message] = gMatch;
    const ipMatch = message.match(/from\s+(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})/);
    const userMatch = message.match(/user\s+(\S+)/);
    const failedMatch = message.match(/failed|authentication failure|invalid/i);
    const successMatch = message.match(/accepted|session opened|pam_unix.*session.*opened/i);
    return {
      timestamp: parseSyslogTimestamp(
        datePart.split(' ')[0] + ' ' + (datePart.split(' ')[1] || ''),
        datePart.split(' ').slice(1).join(' ')
      ),
      timestampStr: datePart,
      sourceIp: ipMatch ? ipMatch[1] : '',
      username: userMatch ? userMatch[1] : null,
      action: failedMatch ? 'login_failed' : successMatch ? 'login_success' : 'auth_event',
      success: !!successMatch && !failedMatch,
      rawLine: line,
    };
  }

  return null;
}

interface ParsedWebLine {
  timestamp: number;
  timestampStr: string;
  sourceIp: string;
  username: string | null;
  userAgent: string | null;
  httpMethod: string;
  httpPath: string;
  httpStatus: number;
  rawLine: string;
}

function parseWebLine(line: string): ParsedWebLine | null {
  // Apache/Nginx Common: "127.0.0.1 - - [10/Oct/2023:13:55:36 +0000] "GET /index.html HTTP/1.1" 200 2326"
  // Apache/Nginx Combined: adds '"http://referer" "Mozilla/5.0..."'
  // Also support ISO timestamp: '127.0.0.1 - - [2023-10-10T13:55:36Z] "GET / HTTP/1.1" 200 2326'

  const commonPattern =
    /^(\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3})\s+\S+\s+(\S+)\s+\[([^\]]+)\]\s+"([^"]*)"\s+(\d{3})\s+(\S+)(?:\s+"([^"]*)"\s+"([^"]*)")?/;
  const match = line.match(commonPattern);
  if (match) {
    const [, ip, user, tsStr, request, status, , referer, ua] = match;
    const requestParts = request.split(' ');
    const method = requestParts[0] || 'GET';
    const path = requestParts[1] || '/';

    let ts: number;
    if (tsStr.includes('T')) {
      // ISO format: 2023-10-10T13:55:36Z or 2023-10-10T13:55:36+00:00
      ts = parseIsoTimestamp(tsStr);
    } else {
      // Apache format: 10/Oct/2023:13:55:36 +0000
      const d = tsStr.replace(':', ' ');
      ts = parseIsoTimestamp(d);
    }

    return {
      timestamp: ts,
      timestampStr: tsStr,
      sourceIp: ip,
      username: user === '-' ? null : user,
      userAgent: ua || null,
      httpMethod: method,
      httpPath: path,
      httpStatus: parseInt(status, 10),
      rawLine: line,
    };
  }

  // JSON format web logs
  if (line.trim().startsWith('{')) {
    try {
      const obj = JSON.parse(line);
      if (obj.remote_addr || obj.ip || obj.client_ip) {
        const ts = obj.timestamp ? parseIsoTimestamp(obj.timestamp) : obj.time_local ? parseIsoTimestamp(obj.time_local) : Date.now();
        return {
          timestamp: ts,
          timestampStr: obj.timestamp || obj.time_local || new Date(ts).toISOString(),
          sourceIp: obj.remote_addr || obj.ip || obj.client_ip || '',
          username: obj.remote_user && obj.remote_user !== '-' ? obj.remote_user : null,
          userAgent: obj.http_user_agent || obj.user_agent || null,
          httpMethod: obj.method || obj.request_method || 'GET',
          httpPath: obj.path || obj.request_uri || '/',
          httpStatus: obj.status || obj.status_code || 200,
          rawLine: line,
        };
      }
    } catch {
      // Not valid JSON
    }
  }

  return null;
}

export function normalizeLine(line: string, logType: LogType, format: LogFormat): NormalizedEvent | null {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith('#')) return null;

  if (logType === 'auth') {
    const parsed = parseAuthLine(trimmed);
    if (!parsed) return null;
    return {
      id: genId(),
      timestamp: parsed.timestamp,
      timestampStr: parsed.timestampStr,
      sourceIp: parsed.sourceIp,
      username: parsed.username,
      userAgent: null,
      action: parsed.action,
      httpMethod: null,
      httpPath: null,
      httpStatus: null,
      success: parsed.success,
      logType: 'auth',
      rawLine: parsed.rawLine,
    };
  }

  const parsed = parseWebLine(trimmed);
  if (!parsed) return null;
  const action = parsed.httpStatus >= 400 ? 'http_error' : 'http_request';
  return {
    id: genId(),
    timestamp: parsed.timestamp,
    timestampStr: parsed.timestampStr,
    sourceIp: parsed.sourceIp,
    username: parsed.username,
    userAgent: parsed.userAgent,
    action,
    httpMethod: parsed.httpMethod,
    httpPath: parsed.httpPath,
    httpStatus: parsed.httpStatus,
    success: parsed.httpStatus < 400,
    logType: 'web',
    rawLine: parsed.rawLine,
  };
}

export function normalizeLog(content: string, logType: LogType, format: LogFormat = 'auto'): NormalizedEvent[] {
  const lines = content.split('\n');
  const events: NormalizedEvent[] = [];

  for (const line of lines) {
    let actualFormat = format;
    let actualType = logType;

    if (format === 'auto') {
      if (line.includes('sshd') || line.includes('sudo') || line.includes('pam_')) {
        actualType = 'auth';
        actualFormat = 'ssh';
      } else if (line.match(/\d+\.\d+\.\d+\.\d+.*\[.*\].*".*HTTP/)) {
        actualType = 'web';
        actualFormat = 'apache_combined';
      }
    }

    const event = normalizeLine(line, actualType, actualFormat);
    if (event) events.push(event);
  }

  events.sort((a, b) => a.timestamp - b.timestamp);
  return events;
}
