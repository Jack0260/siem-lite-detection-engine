import type { TestCase, LogType, LogFormat } from '@/types';

export const sampleLogs: Record<string, { content: string; type: LogType; format: LogFormat; description: string }> = {
  bruteForce: {
    description: 'SSH brute force attack — 20 failed logins from 203.0.113.50',
    type: 'auth',
    format: 'ssh',
    content: `Jan 15 10:23:41 webserver01 sshd[12341]: Failed password for invalid user admin from 203.0.113.50 port 50234 ssh2
Jan 15 10:23:43 webserver01 sshd[12342]: Failed password for invalid user root from 203.0.113.50 port 50235 ssh2
Jan 15 10:23:45 webserver01 sshd[12343]: Failed password for invalid user admin from 203.0.113.50 port 50236 ssh2
Jan 15 10:23:47 webserver01 sshd[12344]: Failed password for invalid user test from 203.0.113.50 port 50237 ssh2
Jan 15 10:23:49 webserver01 sshd[12345]: Failed password for invalid user oracle from 203.0.113.50 port 50238 ssh2
Jan 15 10:23:51 webserver01 sshd[12346]: Failed password for invalid user postgres from 203.0.113.50 port 50239 ssh2
Jan 15 10:23:53 webserver01 sshd[12347]: Failed password for invalid user guest from 203.0.113.50 port 50240 ssh2
Jan 15 10:23:55 webserver01 sshd[12348]: Failed password for invalid user info from 203.0.113.50 port 50241 ssh2
Jan 15 10:23:57 webserver01 sshd[12349]: Failed password for invalid user mysql from 203.0.113.50 port 50242 ssh2
Jan 15 10:23:59 webserver01 sshd[12350]: Failed password for invalid user user from 203.0.113.50 port 50243 ssh2
Jan 15 10:24:01 webserver01 sshd[12351]: Failed password for invalid user admin from 203.0.113.50 port 50244 ssh2
Jan 15 10:24:03 webserver01 sshd[12352]: Failed password for invalid user root from 203.0.113.50 port 50245 ssh2
Jan 15 10:24:05 webserver01 sshd[12353]: Failed password for invalid user operator from 203.0.113.50 port 50246 ssh2
Jan 15 10:24:07 webserver01 sshd[12354]: Failed password for invalid user service from 203.0.113.50 port 50247 ssh2
Jan 15 10:24:09 webserver01 sshd[12355]: Failed password for invalid user nagios from 203.0.113.50 port 50248 ssh2
Jan 15 10:24:11 webserver01 sshd[12356]: Failed password for invalid user backup from 203.0.113.50 port 50249 ssh2
Jan 15 10:24:13 webserver01 sshd[12357]: Failed password for invalid user vpn from 203.0.113.50 port 50250 ssh2
Jan 15 10:24:15 webserver01 sshd[12358]: Failed password for invalid user demo from 203.0.113.50 port 50251 ssh2
Jan 15 10:24:17 webserver01 sshd[12359]: Failed password for invalid userftp from 203.0.113.50 port 50252 ssh2
Jan 15 10:24:19 webserver01 sshd[12360]: Failed password for invalid user sa from 203.0.113.50 port 50253 ssh2`,
  },
  impossibleTravel: {
    description: 'Impossible travel — login from Moscow then Singapore within 30 min',
    type: 'auth',
    format: 'ssh',
    content: `Jan 15 14:05:00 webserver01 sshd[20001]: Accepted password for jdoe from 203.0.113.50 port 40001 ssh2
Jan 15 14:32:00 webserver01 sshd[20002]: Accepted password for jdoe from 139.59.10.20 port 40002 ssh2
Jan 15 14:35:00 webserver01 sshd[20003]: Failed password for jdoe from 139.59.10.20 port 40003 ssh2
Jan 15 14:36:00 webserver01 sshd[20004]: Accepted password for jdoe from 139.59.10.20 port 40004 ssh2`,
  },
  suspiciousUA: {
    description: 'Suspicious user-agents — curl, sqlmap, nikto scanning a web server',
    type: 'web',
    format: 'apache_combined',
    content: `203.0.113.50 - - [15/Jan/2026:10:30:01 +0000] "GET /admin HTTP/1.1" 404 200 "-" "curl/7.68.0"
203.0.113.50 - - [15/Jan/2026:10:30:02 +0000] "GET /etc/passwd HTTP/1.1" 404 196 "-" "curl/7.68.0"
198.51.100.10 - - [15/Jan/2026:10:30:05 +0000] "GET /index.php?id=1' OR 1=1-- HTTP/1.1" 200 1200 "-" "sqlmap/1.7.2#stable (https://sqlmap.org)"
198.51.100.10 - - [15/Jan/2026:10:30:06 +0000] "GET /wp-admin/ HTTP/1.1" 404 180 "-" "sqlmap/1.7.2#stable (https://sqlmap.org)"
45.155.205.30 - - [15/Jan/2026:10:30:10 +0000] "GET /robots.txt HTTP/1.1" 200 45 "-" "Mozilla/5.0 (compatible; Nikto/2.1.6) (https://cirt.net/Nikto2)"
45.155.205.30 - - [15/Jan/2026:10:30:11 +0000] "GET /.env HTTP/1.1" 404 170 "-" "Mozilla/5.0 (compatible; Nikto/2.1.6) (https://cirt.net/Nikto2)"
45.155.205.30 - - [15/Jan/2026:10:30:12 +0000] "GET /phpinfo.php HTTP/1.1" 404 170 "-" "Mozilla/5.0 (compatible; Nikto/2.1.6) (https://cirt.net/Nikto2)"
91.219.50.40 - - [15/Jan/2026:10:30:15 +0000] "GET / HTTP/1.1" 200 2300 "-" "python-requests/2.28.1"
91.219.50.40 - - [15/Jan/2026:10:30:16 +0000] "GET /api/v1/users HTTP/1.1" 401 85 "-" "python-requests/2.28.1"
80.82.5.10 - - [15/Jan/2026:10:30:20 +0000] "GET /admin/login HTTP/1.1" 200 1500 "-" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Hydra v9.1"
185.220.10.5 - - [15/Jan/2026:10:30:25 +0000] "GET / HTTP/1.1" 200 2300 "-" "Mozilla/5.0 (compatible; zgrab/0.2.1)"`,
  },
  combined: {
    description: 'Mixed attack scenario — brute force followed by impossible travel and web scanning',
    type: 'auth',
    format: 'auto',
    content: `Jan 15 10:23:41 webserver01 sshd[12341]: Failed password for invalid user admin from 203.0.113.50 port 50234 ssh2
Jan 15 10:23:43 webserver01 sshd[12342]: Failed password for invalid user root from 203.0.113.50 port 50235 ssh2
Jan 15 10:23:45 webserver01 sshd[12343]: Failed password for invalid user admin from 203.0.113.50 port 50236 ssh2
Jan 15 10:23:47 webserver01 sshd[12344]: Failed password for invalid user test from 203.0.113.50 port 50237 ssh2
Jan 15 10:23:49 webserver01 sshd[12345]: Failed password for invalid user oracle from 203.0.113.50 port 50238 ssh2
Jan 15 10:23:51 webserver01 sshd[12346]: Failed password for invalid user admin from 203.0.113.50 port 50239 ssh2
Jan 15 10:23:53 webserver01 sshd[12347]: Failed password for invalid user guest from 203.0.113.50 port 50240 ssh2
Jan 15 10:23:55 webserver01 sshd[12348]: Accepted password for admin from 203.0.113.50 port 50241 ssh2
Jan 15 14:05:00 webserver01 sshd[20001]: Accepted password for admin from 203.0.113.50 port 40001 ssh2
Jan 15 14:25:00 webserver01 sshd[20002]: Accepted password for admin from 139.59.10.20 port 40002 ssh2
203.0.113.50 - - [15/Jan/2026:10:30:01 +0000] "GET /admin HTTP/1.1" 404 200 "-" "curl/7.68.0"
198.51.100.10 - - [15/Jan/2026:10:30:05 +0000] "GET /index.php?id=1' OR 1=1-- HTTP/1.1" 200 1200 "-" "sqlmap/1.7.2#stable"
45.155.205.30 - - [15/Jan/2026:10:30:10 +0000] "GET /robots.txt HTTP/1.1" 200 45 "-" "Mozilla/5.0 (compatible; Nikto/2.1.6)"`,
  },
  clean: {
    description: 'Clean log — normal user activity, should NOT trigger alerts',
    type: 'auth',
    format: 'ssh',
    content: `Jan 15 09:00:00 webserver01 sshd[1001]: Accepted password for jdoe from 192.168.1.50 port 40001 ssh2
Jan 15 09:15:00 webserver01 sshd[1002]: Accepted password for asmith from 192.168.1.51 port 40002 ssh2
Jan 15 09:30:00 webserver01 sshd[1003]: Accepted password for jdoe from 192.168.1.50 port 40003 ssh2
Jan 15 10:00:00 webserver01 sshd[1004]: Failed password for jdoe from 192.168.1.50 port 40004 ssh2
Jan 15 10:00:05 webserver01 sshd[1005]: Accepted password for jdoe from 192.168.1.50 port 40005 ssh2`,
  },
  cleanWeb: {
    description: 'Clean web log — normal browser traffic, should NOT trigger alerts',
    type: 'web',
    format: 'apache_combined',
    content: `192.168.1.50 - - [15/Jan/2026:09:00:01 +0000] "GET /index.html HTTP/1.1" 200 2300 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
192.168.1.50 - - [15/Jan/2026:09:00:03 +0000] "GET /style.css HTTP/1.1" 200 4500 "https://example.com/" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
192.168.1.51 - - [15/Jan/2026:09:01:00 +0000] "GET /about HTTP/1.1" 200 1800 "https://example.com/" "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15"
192.168.1.50 - - [15/Jan/2026:09:05:00 +0000] "POST /login HTTP/1.1" 302 0 "https://example.com/login" "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"`,
  },
};

export const testCases: TestCase[] = [
  {
    name: 'Brute Force — triggers on 20 failed logins',
    description: 'Feeds 20 failed SSH login attempts from a single IP and expects an alert.',
    ruleId: 'ssh_brute_force',
    logContent: sampleLogs.bruteForce.content,
    logType: 'auth',
    logFormat: 'ssh',
    shouldAlert: true,
    minAlerts: 1,
  },
  {
    name: 'Brute Force — no alert on clean log',
    description: 'Feeds a normal auth log with 1 failed attempt and expects no brute force alert.',
    ruleId: 'ssh_brute_force',
    logContent: sampleLogs.clean.content,
    logType: 'auth',
    logFormat: 'ssh',
    shouldAlert: false,
  },
  {
    name: 'Impossible Travel — triggers on rapid geo jump',
    description: 'Feeds a successful login from Moscow followed by Singapore 27 minutes later.',
    ruleId: 'impossible_travel',
    logContent: sampleLogs.impossibleTravel.content,
    logType: 'auth',
    logFormat: 'ssh',
    shouldAlert: true,
    minAlerts: 1,
  },
  {
    name: 'Impossible Travel — no alert on normal local logins',
    description: 'Feeds logins from the same local network and expects no impossible travel alert.',
    ruleId: 'impossible_travel',
    logContent: sampleLogs.clean.content,
    logType: 'auth',
    logFormat: 'ssh',
    shouldAlert: false,
  },
  {
    name: 'Suspicious UA — triggers on curl/sqlmap/nikto',
    description: 'Feeds web logs with curl, sqlmap, nikto, and python-requests user agents.',
    ruleId: 'suspicious_user_agent',
    logContent: sampleLogs.suspiciousUA.content,
    logType: 'web',
    logFormat: 'apache_combined',
    shouldAlert: true,
    minAlerts: 1,
  },
  {
    name: 'Suspicious UA — no alert on normal browsers',
    description: 'Feeds web logs with standard browser user agents and expects no alert.',
    ruleId: 'suspicious_user_agent',
    logContent: sampleLogs.cleanWeb.content,
    logType: 'web',
    logFormat: 'apache_combined',
    shouldAlert: false,
  },
  {
    name: 'Normalizer — parses SSH auth log correctly',
    description: 'Parses an SSH failed password line and verifies field extraction.',
    ruleId: '_normalizer',
    logContent: 'Jan 15 10:23:41 webserver01 sshd[12341]: Failed password for invalid user admin from 203.0.113.50 port 50234 ssh2',
    logType: 'auth',
    logFormat: 'ssh',
    shouldAlert: true,
    minAlerts: 1,
  },
  {
    name: 'Normalizer — parses Apache combined log correctly',
    description: 'Parses an Apache combined log line and verifies field extraction.',
    ruleId: '_normalizer_web',
    logContent: '203.0.113.50 - - [15/Jan/2026:10:30:01 +0000] "GET /admin HTTP/1.1" 404 200 "-" "curl/7.68.0"',
    logType: 'web',
    logFormat: 'apache_combined',
    shouldAlert: true,
    minAlerts: 1,
  },
];
