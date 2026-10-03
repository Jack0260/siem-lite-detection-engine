# Threat Model — LogGuard Log Detection Tool

## 1. System Overview

LogGuard is a client-side log detection and alerting tool that ingests authentication
and web server logs, normalizes them into a unified event schema, applies Sigma-style
YAML detection rules, and generates severity-scored alerts with MITRE ATT&CK mappings.

### Architecture

```
Log Input (file upload / sample)
    │
    ▼
Normalizer (auth + web log parsers)
    │
    ▼
Detection Engine (rule matchers, thresholds, geo analysis)
    │
    ▼
Alert Generation (severity scoring, MITRE mapping)
    │
    ▼
Dashboard (overview, alerts, events, rules, tests)
```

All processing occurs in the browser. No data is transmitted to external servers.

## 2. Assets

| Asset | Description | Criticality |
|-------|-------------|-------------|
| Log data | Raw and normalized log events | Medium — may contain IP addresses, usernames |
| Detection rules | YAML rule definitions | Low — not sensitive, but tampering could suppress alerts |
| Alert data | Generated alerts with scoring | Medium — operational security data |
| Dashboard UI | User interface for viewing results | Low |

## 3. Trust Boundaries

1. **Log Input Boundary** — Raw log data enters the system from user-uploaded files
   or built-in sample logs. This is the primary attack surface.
2. **Rule Definition Boundary** — YAML rules are loaded from built-in files. If users
   can supply custom rules, this becomes a secondary input boundary.
3. **Display Boundary** — Normalized events and alerts are rendered in the browser.
   Malicious log content could attempt XSS if not properly escaped.

## 4. Adversaries

| Adversary | Motivation | Capability |
|-----------|------------|------------|
| Attacker in source logs | Evades detection by crafting log entries that don't trigger rules | Can control content of log lines they generate |
| Malicious log uploader | Attempts to exploit the tool via crafted log files | Can upload arbitrary text files |
| Insider with rule access | Suppresses detection by modifying rules | Can edit rule YAML files |

## 5. Attack Vectors

### 5.1 XSS via Log Content (Risk: Medium)

**Vector:** An attacker crafts log entries containing `<script>` tags or HTML. If the
dashboard renders raw log lines without escaping, malicious JavaScript executes.

**Mitigation:** React automatically escapes all text content rendered via JSX
expressions (`{event.rawLine}`). No `dangerouslySetInnerHTML` is used. All log content
is displayed as text nodes, not HTML.

### 5.2 Regex DoS via Rule Patterns (Risk: Low)

**Vector:** A malicious rule with a catastrophic backtracking regex could freeze the
detection engine when matching against log data.

**Mitigation:** Built-in rules use simple, tested regex patterns. Custom rules are
not currently supported via the UI. If custom rules are added in the future, regex
patterns should be validated and tested with a timeout.

### 5.3 Log Forging / Spoofing (Risk: Medium)

**Vector:** An attacker who controls log content can inject fake log lines to:
- Flood the system with noise, burying real alerts
- Craft log lines that look like benign activity to avoid detection
- Inject fake timestamps to evade time-window-based rules

**Mitigation:** The tool is a detection aid, not a forensic authority. Alerts should
be correlated with other data sources. Log integrity should be ensured at the source
(centralized logging, tamper-evident storage, SIEM forwarding).

### 5.4 IP Spoofing via X-Forwarded-For (Risk: Low)

**Vector:** Web logs may record spoofed IPs if the web server trusts X-Forwarded-For
headers without validation.

**Mitigation:** The tool processes whatever IP is in the log. This is a limitation of
the data source, not the tool. Web server configuration should validate proxy headers.

### 5.5 Rule Bypass (Risk: Low)

**Vector:** An attacker who knows the detection thresholds (e.g., "5 failures in 10
minutes") can stay just below them.

**Mitigation:** Thresholds are configurable in YAML. Correlation between rules
(brute force + impossible travel) increases detection coverage. Anomaly-based
detection could supplement threshold-based rules in future versions.

## 6. Security Controls

| Control | Implementation |
|---------|----------------||
| Input validation | Log lines are parsed with strict regex patterns; unparseable lines are skipped |
| Output encoding | React JSX auto-escaping prevents XSS in the dashboard |
| No network calls | All processing is client-side; no data leaves the browser |
| No code execution | Rules are data-driven (YAML), not code; no eval() or Function() |
| Geo data offline | IP-to-geo mapping is bundled, no external API calls |

## 7. Limitations & Assumptions

1. The tool analyzes logs post-hoc; it is not a real-time IDS.
2. Geo-location is approximate (first-octet + known CIDR mapping). Production use
   requires MaxMind GeoIP2 or similar.
3. Timestamps use the current year for syslog-format dates (standard limitation).
4. The tool does not verify log integrity — it assumes logs are from a trusted source.
5. Detection rules are signature-based; novel attack patterns may be missed.

## 8. MITRE ATT&CK Coverage

| Technique | ID | Rule |
|-----------|----|------|
| Brute Force | T1110 | ssh_brute_force |
| Valid Accounts | T1078 | impossible_travel |
| Active Scanning | T1595 | suspicious_user_agent |
