# STEALTH SCANNING GUIDE

## Problem: `tcpwrapped` Results

Ketika Anda mendapatkan hasil seperti ini:

```
1/tcp    open   tcpwrapped
2/tcp    open   tcpwrapped
3/tcp    open   tcpwrapped
```

Ini berarti target mendeteksi scanning Anda dan mengaktifkan proteksi.

## Root Causes

1. **Cloudflare/WAF Protection**
   - Domain dilindungi CDN
   - Firewall rules mendeteksi port scanning
   - Response: Fake "tcpwrapped" untuk semua port

2. **Aggressive Scanning**
   - Default nmap terlalu cepat (`-T3`)
   - Banyak SYN packets dalam waktu singkat
   - Pattern mudah dideteksi IDS/IPS

3. **Default Parameters**
   - JAEGER AI menggunakan `-sV` (version detection)
   - Tidak ada delay atau randomization
   - Mudah di-fingerprint sebagai scanner

---

## Solutions

### 1. Stealth Nmap Scanning

#### Ultra Stealth (Lambat tapi Aman)
```bash
nmap -sS -T1 -Pn -f --data-length 32 \
  --scan-delay 10s --max-retries 1 \
  -p 80,443,8080,8443 target.com
```

**Parameter Explanation:**
- `-sS`: SYN stealth scan (half-open)
- `-T1`: Paranoid timing (very slow, avoid IDS)
- `-Pn`: Skip host discovery (assume up)
- `-f`: Fragment packets (bypass packet filters)
- `--data-length 32`: Add random payload
- `--scan-delay 10s`: 10 seconds between probes
- `--max-retries 1`: Reduce retries

#### Moderate Stealth (Balanced)
```bash
nmap -sS -T2 -Pn -p 80,443,8080,8443,3000,5000 target.com
```

**Parameter Explanation:**
- `-T2`: Polite timing (slower than default)
- Focus on common web ports only

#### Quick Scan (Risk Detection)
```bash
nmap -sV -T3 --top-ports 100 target.com
```
⚠️ **Warning:** Akan terdeteksi WAF!

---

### 2. Bypass Cloudflare

#### Method A: Find Real IP
```bash
# 1. DNS History (may reveal origin IP)
host target.com
nslookup target.com

# 2. Subdomain enumeration (find non-CF subdomains)
subfinder -d target.com | httpx -title

# 3. Scan origin IP directly
nmap -sV -p- <ORIGIN_IP>
```

#### Method B: Use Censys/Shodan
```bash
# Search for SSL certificate
# Censys: search for "target.com" certificate
# Find IPs with same cert → Origin IP
```

---

### 3. Alternative Tools (Tidak Trigger WAF)

#### HTTP Probing
```bash
# httpx - HTTP toolkit
httpx -u https://target.com \
  -status-code \
  -tech-detect \
  -title \
  -web-server \
  -content-length

# More URLs
cat urls.txt | httpx -silent -tech-detect
```

#### Subdomain Enumeration
```bash
# subfinder - Passive subdomain discovery
subfinder -d target.com -silent | \
  httpx -silent -title -status-code

# amass - Comprehensive OSINT
amass enum -passive -d target.com
```

#### Web Crawling
```bash
# katana - Web crawler
katana -u https://target.com -d 2 -jc -kf all

# gospider - Go spider
gospider -s https://target.com -d 2
```

#### Vulnerability Scanning
```bash
# nuclei - Template-based scanner
nuclei -u https://target.com -t cves/ -severity critical,high

# nikto - Web server scanner
nikto -h https://target.com -Tuning 1,2,3
```

---

## JAEGER AI Integration

### Via Telegram Bot

#### Stealth Mode (Recommended)
```
stealth scan digitalamoeba.id
```

#### Specific Tool
```
httpx digitalamoeba.id
subfinder digitalamoeba.id
nuclei digitalamoeba.id
```

#### Custom Nmap (Manual Override)
Request admin untuk menambahkan stealth parameters di konfigurasi.

---

### Via Web Interface

**Current:** Quick Scan menggunakan default nmap parameters

**Workaround:**
1. Use "Reconnaissance" mode → subfinder + httpx
2. Use "OSINT" mode → passive enumeration
3. Avoid "Quick Scan" untuk Cloudflare targets

---

## Best Practices

### 1. Reconnaissance Phase
```bash
# Step 1: Passive OSINT (tidak terdeteksi)
subfinder -d target.com > subdomains.txt
amass enum -passive -d target.com >> subdomains.txt

# Step 2: HTTP probing (gentle)
cat subdomains.txt | httpx -silent -tech-detect > alive.txt

# Step 3: Technology detection
cat alive.txt | httpx -tech-detect -title
```

### 2. Active Scanning Phase
```bash
# Step 4: Stealth port scan (only alive hosts)
nmap -sS -T2 -Pn -iL alive_ips.txt

# Step 5: Service detection (slower)
nmap -sV -T1 -p $(cat ports.txt) target.com
```

### 3. Vulnerability Assessment
```bash
# Step 6: Template-based scanning
nuclei -l alive.txt -t cves/ -severity high,critical

# Step 7: Custom testing
# Manual testing based on discovered services
```

---

## Common Targets & Their Protections

### Cloudflare Protected Sites
**Indicators:**
- DNS: 104.x.x.x or 172.x.x.x
- Headers: `CF-RAY`, `server: cloudflare`

**Approach:**
1. Find origin IP via subdomain enumeration
2. Use httpx/nuclei (not nmap)
3. Stealth timing if scanning origin

### AWS CloudFront
**Indicators:**
- DNS: *.cloudfront.net
- Headers: `X-Cache: Hit from cloudfront`

**Approach:**
1. Similar to Cloudflare
2. Look for S3 buckets
3. Check for misconfigurations

### Direct Server (No CDN)
**Indicators:**
- Real IP in DNS
- No CDN headers

**Approach:**
1. Can use moderate stealth
2. Still avoid aggressive scanning
3. Rate limit requests

---

## Troubleshooting

### All Ports Show "tcpwrapped"
**Cause:** WAF/IDS detected scanning

**Solution:**
```bash
# 1. Slow down
nmap -sS -T1 --scan-delay 10s target.com

# 2. Use different source IP (VPN/proxy)
nmap --source-port 53 target.com  # Spoof DNS

# 3. Use alternative tools
httpx -u https://target.com
```

### "No response" or Timeout
**Cause:** Firewall blocking all probes

**Solution:**
```bash
# 1. Try different scan types
nmap -sT target.com  # TCP connect (may work through firewall)
nmap -sA target.com  # ACK scan (firewall mapping)

# 2. Try different ports
nmap -p 80,443 target.com  # Only web ports

# 3. Use application-layer tools
curl -I https://target.com
```

### "Filtered" Results
**Cause:** Firewall dropping packets

**Solution:**
```bash
# 1. Fragment packets
nmap -f target.com

# 2. Use decoys
nmap -D RND:10 target.com  # 10 decoy IPs

# 3. Spoof source port
nmap --source-port 53 target.com  # Appear as DNS
```

---

## Example: Scanning digitalamoeba.id

### Current Result (Failed)
```bash
# Command: nmap digitalamoeba.id
# Result: tcpwrapped (WAF detected)
```

### Recommended Approach

#### Step 1: Reconnaissance
```bash
# Check if Cloudflare
curl -I https://digitalamoeba.id | grep -i cloudflare

# Output: server: cloudflare
# Confirmed: Cloudflare protected
```

#### Step 2: Alternative Tools
```bash
# HTTP probing
httpx -u https://digitalamoeba.id \
  -title -tech-detect -status-code -web-server

# Subdomain enumeration
subfinder -d digitalamoeba.id -silent

# Web crawling
katana -u https://digitalamoeba.id -d 2
```

#### Step 3: Vulnerability Scanning
```bash
# Template-based (tidak trigger WAF)
nuclei -u https://digitalamoeba.id \
  -t cves/ -t exposures/ -severity high,critical
```

#### Step 4: Origin IP Discovery (Advanced)
```bash
# Find subdomains
subfinder -d digitalamoeba.id > subs.txt

# Check which ones NOT behind Cloudflare
while read sub; do
  ip=$(dig +short $sub | grep -v cloudflare)
  if [ ! -z "$ip" ]; then
    echo "$sub: $ip"
  fi
done < subs.txt

# Scan origin IP with stealth
nmap -sS -T2 -Pn <ORIGIN_IP>
```

---

## Security & Ethics

### Legal Considerations
⚠️ **WARNING:** Port scanning dapat melanggar hukum di beberapa jurisdiksi

**Before Scanning:**
1. Dapatkan izin tertulis (scope of work)
2. Scan hanya target yang authorized
3. Gunakan VPN/proxy untuk privacy
4. Monitor rate limits

### Responsible Disclosure
**If you find vulnerabilities:**
1. Report ke owner (security@target.com)
2. Berikan waktu 90 days untuk patch
3. Jangan exploit untuk gain

### Rate Limiting
```bash
# Good practice
--scan-delay 5s    # 5 seconds between probes
-T1 or -T2        # Slow timing
--max-rate 10     # Max 10 packets/sec

# Bad practice
-T5               # Insane timing
--min-rate 1000   # 1000 packets/sec
```

---

## Advanced: Custom Nmap Scripts

### Web Application Scan
```bash
#!/bin/bash
# stealth-web-scan.sh

TARGET=$1
OUTPUT="scan_${TARGET}_$(date +%Y%m%d_%H%M%S).txt"

echo "[*] Starting stealth web scan for $TARGET"

# Phase 1: Discovery
echo "[*] Phase 1: HTTP/HTTPS Discovery"
nmap -sS -T2 -Pn -p 80,443,8080,8443,3000,5000,8000,9000 \
  --open $TARGET -oN ${OUTPUT}_discovery.txt

# Phase 2: Service Detection
echo "[*] Phase 2: Service Detection"
PORTS=$(grep "^[0-9]" ${OUTPUT}_discovery.txt | cut -d'/' -f1 | tr '\n' ',')
if [ ! -z "$PORTS" ]; then
  nmap -sV -T1 -Pn -p $PORTS --scan-delay 5s \
    $TARGET -oN ${OUTPUT}_service.txt
fi

# Phase 3: Script Scanning
echo "[*] Phase 3: Vulnerability Scripts"
nmap -sC -T1 -Pn -p $PORTS --script-timeout 30s \
  $TARGET -oN ${OUTPUT}_scripts.txt

echo "[*] Scan complete. Results in ${OUTPUT}_*.txt"
```

### Network Host Scan
```bash
#!/bin/bash
# stealth-network-scan.sh

TARGET=$1

# Phase 1: Top ports
nmap -sS -T2 -Pn --top-ports 1000 \
  --open $TARGET -oN network_top1000.txt

# Phase 2: Full port scan (ultra stealth)
nmap -sS -T1 -Pn -p- --scan-delay 10s \
  $TARGET -oN network_fullscan.txt
```

---

## Summary

### Quick Reference

| Scenario | Command | Speed | Detection Risk |
|----------|---------|-------|----------------|
| **Cloudflare Target** | `httpx -u https://target.com -tech-detect` | Fast | Low |
| **Stealth Port Scan** | `nmap -sS -T1 -Pn --scan-delay 10s target.com` | Slow | Very Low |
| **Moderate Scan** | `nmap -sS -T2 -Pn -p 80,443,8080,8443 target.com` | Medium | Low |
| **Aggressive Scan** | `nmap -sV -T4 --top-ports 1000 target.com` | Fast | High |
| **Subdomain Enum** | `subfinder -d target.com \| httpx -silent` | Fast | Low |
| **Vuln Scanning** | `nuclei -u https://target.com -t cves/` | Medium | Low |

### When to Use What

**Use httpx/nuclei when:**
- Target behind Cloudflare/WAF
- Need quick results
- Want to avoid detection

**Use stealth nmap when:**
- Target is origin IP (not CDN)
- Comprehensive port scan needed
- Time is not constraint

**Use aggressive nmap when:**
- Internal network testing
- Authorized pentest with time limit
- Detection is acceptable

---

**JAEGER AI - Stealth Scanning Made Easy**

For integration requests, contact admin.
