# Incident Response Playbook — LogGuard Alerts

## General IR Process

1. **Detect** — Review alerts in the LogGuard dashboard
2. **Triage** — Assess severity score and MITRE technique
3. **Contain** — Take immediate action to stop the attack
4. **Investigate** — Determine scope, timeline, and impact
5. **Eradicate** — Remove attacker access and artifacts
6. **Recover** — Restore systems to normal operation
7. **Lessons Learned** — Update rules, processes, and defenses

---

## Playbook 1: SSH Brute Force (T1110)

### Alert Characteristics
- **Severity:** High (75-100)
- **MITRE:** Credential Access → Brute Force (T1110)
- **Trigger:** 5+ failed SSH logins from a single IP within 10 minutes

### Immediate Containment (0-15 minutes)
1. Block the source IP at the firewall: `iptables -A INPUT -s <IP> -j DROP`
2. Install/configure fail2ban with appropriate thresholds
3. If the brute force succeeded (check for "Accepted password" from same IP):
   - Immediately disable the compromised account
   - Force-terminate any active SSH sessions: `pkill -u <username>`
4. Check for any new user accounts created by the attacker

### Investigation (15-60 minutes)
1. Review all successful logins from the attacking IP
2. Check command history for the compromised account: `cat ~/.bash_history`
3. Review `/var/log/auth.log` for any privilege escalation (sudo, su)
4. Check for unauthorized SSH keys: `cat ~/.ssh/authorized_keys`
5. Look for lateral movement — logins to other systems from the compromised host
6. Determine what data the attacker could access

### Eradication (1-4 hours)
1. Reset the password for any compromised accounts
2. Remove unauthorized SSH keys
3. Remove any backdoors, cron jobs, or persistence mechanisms
4. Patch the SSH service if a vulnerability was exploited
5. Rotate any credentials stored on the compromised system

### Recovery
1. Enable SSH key-based authentication; disable password auth
2. Change the SSH port from default 22 (reduces noise)
3. Implement rate limiting: `MaxAuthTries 3`, `LoginGraceTime 30`
4. Verify fail2ban is operational with appropriate ban times
5. Monitor for return of the attacker from new IPs

### Lessons Learned
- Update brute force thresholds if the attack pattern was novel
- Consider implementing MFA for SSH access
- Review password policies — enforce strong, unique passwords
- Document the incident timeline and share with the security team

---

## Playbook 2: Impossible Travel / Valid Accounts (T1078)

### Alert Characteristics
- **Severity:** Critical (90-100)
- **MITRE:** Defense Evasion → Valid Accounts (T1078)
- **Trigger:** Successful login from location A, then location B (>500km) within 60 minutes

### Immediate Containment (0-15 minutes)
1. **Disable the user account immediately** — this is likely a compromised credential
2. Force logout on all active sessions for the user
3. Revoke any active tokens, API keys, or session cookies for the user
4. Contact the user via an out-of-band channel (phone, in person) to verify:
   - Did they log in from both locations?
   - Are they currently traveling?
   - Do they recognize the activity?

### Investigation (15-60 minutes)
1. Review the user's authentication history for the past 48 hours
2. Identify what the user did after the suspicious login:
   - Files accessed or modified
   - Commands executed
   - Data downloaded or transferred
3. Check if the user's credentials were recently exposed in a breach
4. Review VPN/proxy logs — could the "impossible travel" be a VPN exit node change?
5. Check for any privilege escalation after the suspicious login
6. Look for data exfiltration: large file transfers, database dumps, archive creation

### Eradication (1-4 hours)
1. Reset the user's password and require MFA enrollment
2. Revoke and regenerate all API keys, SSH keys, and access tokens
3. Remove any persistence the attacker may have installed
4. Check all systems the user had access to for compromise
5. Review and revoke any access grants the attacker may have created

### Recovery
1. Restore the user's access with MFA required
2. Implement geo-fencing or geo-alerting for future logins
3. Set up impossible-travel detection in the organization's SIEM
4. Monitor the user's account closely for 7-14 days
5. Review access logs for any systems the attacker may have pivoted to

### Lessons Learned
- Implement MFA for all remote access if not already in place
- Consider conditional access policies based on location and device
- Review whether VPN configuration could cause false positives
- Update the impossible travel rule's distance/time thresholds if needed
- Educate users on recognizing and reporting suspicious login notifications

---

## Playbook 3: Suspicious User-Agent / Active Scanning (T1595)

### Alert Characteristics
- **Severity:** Medium (50-65)
- **MITRE:** Reconnaissance → Active Scanning (T1595)
- **Trigger:** HTTP requests with suspicious user-agents (curl, sqlmap, nikto, etc.)

### Immediate Containment (0-15 minutes)
1. Check if the scanning IP is also attempting exploitation (brute force, SQLi, etc.)
2. If the pattern is persistent or aggressive, block the IP at the WAF or firewall
3. Add the user-agent pattern to WAF block rules
4. Check if any scanning requests returned 200 OK on sensitive endpoints

### Investigation (15-60 minutes)
1. Review all requests from the scanning IP — look for:
   - SQL injection attempts (`' OR 1=1`, `UNION SELECT`)
   - Path traversal (`../../../etc/passwd`)
   - Directory enumeration (`/admin`, `/.env`, `/phpinfo.php`)
   - vulnerability scanning (`/wp-admin`, `/.git`, `/vendor/`)
2. Check if any exploitation was successful (200/302 on admin endpoints)
3. Review web server error logs for additional context
4. Identify whether multiple IPs are coordinating (same UA, different IPs)
5. Check if the scanning targeted a specific application (WordPress, etc.)

### Eradication (1-4 hours)
1. Block all identified scanning IPs
2. Patch any vulnerabilities the scanner may have discovered
3. Remove any files that should not be publicly accessible (`.env`, `.git`, etc.)
4. Update WAF rules to block known scanner user-agents
5. Review and harden web application configuration

### Recovery
1. Verify the web application is functioning normally
2. Monitor for return of the scanner from new IPs
3. Implement rate limiting on web endpoints
4. Set up alerts for future scanning attempts
5. Consider implementing a CAPTCHA for repeated failed requests

### Lessons Learned
- Add the scanner's user-agent and IP patterns to threat intelligence feeds
- Review whether exposed information (directory listing, error messages) aided the scan
- Update the suspicious user-agent rule with new patterns observed
- Ensure security headers (HSTS, X-Frame-Options, CSP) are properly configured
- Schedule regular vulnerability scans to find issues before attackers do

---

## Escalation Matrix

| Severity | Score | Response Time | Escalate To |
|----------|-------|---------------|-------------|
| Critical | 90-100 | Immediate | Security team lead + IT management |
| High | 70-89 | Within 15 min | Security analyst + team lead |
| Medium | 40-69 | Within 1 hour | Security analyst |
| Low | 0-39 | Within 4 hours | Review in next shift handoff |

## Communication Plan

1. **Internal:** Use the incident response channel (Slack/Teams) for real-time updates
2. **Management:** Brief management on critical incidents within 1 hour
3. **Users:** Notify affected users of account compromise via out-of-band channels
4. **External:** If customer data is impacted, follow legal/regulatory notification requirements
5. **Post-incident:** Share lessons learned in the next team retrospective
