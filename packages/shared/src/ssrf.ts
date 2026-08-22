import { promises as dns } from "dns";
import { isIP } from "net";

const PRIVATE_RANGES = [
  /^127\./,
  /^10\./,
  /^172\.(1[6-9]|2\d|3[01])\./,
  /^192\.168\./,
  /^169\.254\./,
  /^100\.(6[4-9]|[7-9]\d|1[01]\d|12[0-7])\./,
  /^0\./,
  /^::1$/,
  /^fc00:/i,
  /^fd[0-9a-f]{2}:/i,
  /^fe80:/i,
];

function isPrivateIpLiteral(ip: string): boolean {
  return PRIVATE_RANGES.some((re) => re.test(ip));
}

export async function isPrivateHostname(hostname: string): Promise<boolean> {
  const normalized = hostname.toLowerCase();
  if (normalized === "localhost") return true;
  if (isIP(hostname)) return isPrivateIpLiteral(hostname);

  try {
    const results = await dns.lookup(hostname, { all: true, verbatim: true });
    return results.length === 0 || results.some((r) => isPrivateIpLiteral(r.address));
  } catch {
    return true;
  }
}
