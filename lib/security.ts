import net from 'net';

/**
 * Checks whether an IP address is in a private, loopback, link-local,
 * or cloud metadata IP range (SSRF prevention).
 */
export function isPrivateOrReservedIp(ip: string): boolean {
  // Normalize IPv6 mapped IPv4: ::ffff:192.168.1.1 -> 192.168.1.1
  const cleanIp = ip.replace(/^::ffff:/i, '');

  // Check IPv4
  const ipv4Match = cleanIp.match(/^(\d{1,3})\.(\d{1,3})\.(\d{1,3})\.(\d{1,3})$/);
  if (ipv4Match) {
    const [_, aStr, bStr, cStr, dStr] = ipv4Match;
    const a = parseInt(aStr, 10);
    const b = parseInt(bStr, 10);
    const c = parseInt(cStr, 10);
    const d = parseInt(dStr, 10);

    if (a > 255 || b > 255 || c > 255 || d > 255) return true;

    // 0.0.0.0/8 (Broadcast / Current Network)
    if (a === 0) return true;

    // 10.0.0.0/8 (Private)
    if (a === 10) return true;

    // 127.0.0.0/8 (Loopback)
    if (a === 127) return true;

    // 100.64.0.0/10 (Carrier-Grade NAT)
    if (a === 100 && b >= 64 && b <= 127) return true;

    // 169.254.0.0/16 (Link-Local / Cloud Instance Metadata - AWS, Azure, GCP, DigitalOcean)
    if (a === 169 && b === 254) return true;

    // 172.16.0.0/12 (Private)
    if (a === 172 && b >= 16 && b <= 31) return true;

    // 192.0.0.0/24 (IETF Protocol Assignments)
    if (a === 192 && b === 0 && c === 0) return true;

    // 192.0.2.0/24 (TEST-NET-1)
    if (a === 192 && b === 0 && c === 2) return true;

    // 192.168.0.0/16 (Private)
    if (a === 192 && b === 168) return true;

    // 198.51.100.0/24 (TEST-NET-2)
    if (a === 198 && b === 51 && c === 100) return true;

    // 203.0.113.0/24 (TEST-NET-3)
    if (a === 203 && b === 0 && c === 113) return true;

    // 224.0.0.0/4 (Multicast) & 240.0.0.0/4 (Reserved / Future Use) & 255.255.255.255 (Broadcast)
    if (a >= 224) return true;

    return false;
  }

  // Check IPv6
  const lowerIp = cleanIp.toLowerCase();
  // Loopback (::1)
  if (lowerIp === '::1' || lowerIp === '0:0:0:0:0:0:0:1') return true;
  // Unspecified (::)
  if (lowerIp === '::' || lowerIp === '0:0:0:0:0:0:0:0') return true;
  // Unique Local (fc00::/7)
  if (lowerIp.startsWith('fc') || lowerIp.startsWith('fd')) return true;
  // Link-Local (fe80::/10)
  if (
    lowerIp.startsWith('fe8') ||
    lowerIp.startsWith('fe9') ||
    lowerIp.startsWith('fea') ||
    lowerIp.startsWith('feb')
  ) {
    return true;
  }

  return false;
}

const BLOCKED_HOSTNAMES = new Set([
  'localhost',
  'localhost.localdomain',
  'metadata.google.internal',
  'instance-data',
  'metadata.nic.in',
]);

const BLOCKED_PORTS = new Set([
  21,   // FTP
  22,   // SSH
  23,   // Telnet
  25,   // SMTP
  53,   // DNS
  110,  // POP3
  143,  // IMAP
  445,  // SMB
  1433, // MSSQL
  1521, // Oracle
  2375, // Docker
  2376, // Docker SSL
  3306, // MySQL
  5432, // PostgreSQL
  6379, // Redis
  8500, // Consul
  9200, // Elasticsearch
  11211,// Memcached
  27017,// MongoDB
]);

export interface SafeUrlResult {
  safe: boolean;
  reason?: string;
  url?: URL;
}

/**
 * Validates external URLs for media proxies, subtitle proxies, and stream resolvers.
 * Protects against Server-Side Request Forgery (SSRF), internal network scanning,
 * and cloud instance metadata theft (AWS/GCP/Azure 169.254.169.254).
 */
export function validateSafeExternalUrl(rawUrl: string | null | undefined): SafeUrlResult {
  if (!rawUrl || typeof rawUrl !== 'string') {
    return { safe: false, reason: 'Empty or non-string URL' };
  }

  let parsed: URL;
  try {
    parsed = new URL(rawUrl.trim());
  } catch {
    return { safe: false, reason: 'Malformed URL' };
  }

  // 1. Strict protocol whitelist (HTTP / HTTPS only)
  if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
    return { safe: false, reason: `Disallowed protocol: ${parsed.protocol}` };
  }

  // 2. Reject credentials embedded in URL (e.g. http://user:pass@host)
  if (parsed.username || parsed.password) {
    return { safe: false, reason: 'Embedded credentials are not permitted' };
  }

  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');

  // 3. Known blocked hostnames / TLDs
  if (
    BLOCKED_HOSTNAMES.has(hostname) ||
    hostname.endsWith('.localhost') ||
    hostname.endsWith('.local') ||
    hostname.endsWith('.internal') ||
    hostname.endsWith('.lan') ||
    hostname === 'local'
  ) {
    return { safe: false, reason: `Blocked internal hostname: ${hostname}` };
  }

  // 4. IP address validation (both raw IP and canonicalized)
  if (net.isIP(hostname) && isPrivateOrReservedIp(hostname)) {
    return { safe: false, reason: `Private or reserved IP blocked: ${hostname}` };
  }

  // 5. Port check
  if (parsed.port) {
    const portNum = parseInt(parsed.port, 10);
    if (isNaN(portNum) || portNum <= 0 || portNum > 65535) {
      return { safe: false, reason: `Invalid port number: ${parsed.port}` };
    }
    if (BLOCKED_PORTS.has(portNum)) {
      return { safe: false, reason: `Blocked dangerous port: ${portNum}` };
    }
  }

  return { safe: true, url: parsed };
}

/**
 * Sliding window in-memory rate limiter for API endpoints (Anti-DoS & Anti-Scraping)
 */
interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const rateLimitMap = new Map<string, RateLimitRecord>();

// Periodic garbage collection every 60 seconds
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(() => {
    const now = Date.now();
    for (const [key, record] of rateLimitMap.entries()) {
      if (record.resetAt <= now) {
        rateLimitMap.delete(key);
      }
    }
  }, 60000);
  if (timer.unref) timer.unref();
}

export function checkRateLimit(
  identifier: string,
  limit: number = 60,
  windowMs: number = 60000
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  let record = rateLimitMap.get(identifier);

  if (!record || record.resetAt <= now) {
    record = { count: 1, resetAt: now + windowMs };
    rateLimitMap.set(identifier, record);
    return { allowed: true, remaining: limit - 1, resetTime: record.resetAt };
  }

  record.count += 1;
  const remaining = Math.max(0, limit - record.count);
  const allowed = record.count <= limit;

  return { allowed, remaining, resetTime: record.resetAt };
}

export function getClientIp(req: any): string {
  if (!req) return '127.0.0.1';
  const xForwardedFor = req.headers?.get ? req.headers.get('x-forwarded-for') : req.headers?.['x-forwarded-for'];
  if (xForwardedFor) {
    const first = String(xForwardedFor).split(',')[0].trim();
    if (first) return first;
  }
  const cfConnectingIp = req.headers?.get ? req.headers.get('cf-connecting-ip') : req.headers?.['cf-connecting-ip'];
  if (cfConnectingIp) return String(cfConnectingIp).trim();
  const realIp = req.headers?.get ? req.headers.get('x-real-ip') : req.headers?.['x-real-ip'];
  if (realIp) return String(realIp).trim();
  return '127.0.0.1';
}

const SUSPICIOUS_UA_PATTERNS = [
  /sqlmap/i,
  /nikto/i,
  /wpscan/i,
  /acunetix/i,
  /havij/i,
  /nmap/i,
  /masscan/i,
  /zgrab/i,
  /dirbuster/i,
  /gobuster/i,
  /fimap/i,
  /jbrofuzz/i,
  /wfuzz/i,
  /python-requests/i,
  /python-urllib/i,
  /aiohttp/i,
  /Go-http-client/i,
  /Java\//i,
  /HttpClient/i,
  /libwww-perl/i,
];

export function isSuspiciousScraper(userAgent: string | null | undefined): boolean {
  if (!userAgent) return false;
  return SUSPICIOUS_UA_PATTERNS.some(regex => regex.test(userAgent));
}

export function sanitizeErrorMessage(err: unknown, fallbackMessage = 'Internal Server Error'): string {
  if (process.env.NODE_ENV === 'development') {
    return err instanceof Error ? err.message : String(err);
  }
  return fallbackMessage;
}


