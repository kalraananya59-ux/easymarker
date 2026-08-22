const COOKIE_NAME = "em_guest";
const COOKIE_MAX_AGE_DAYS = 30;

export interface GuestIdentity {
  name: string;
  email?: string;
}

export function readGuestIdentity(): GuestIdentity | null {
  if (typeof document === "undefined") return null;
  const match = document.cookie.match(new RegExp(`(?:^|; )${COOKIE_NAME}=([^;]*)`));
  if (!match || !match[1]) return null;
  try {
    return JSON.parse(decodeURIComponent(match[1]));
  } catch {
    return null;
  }
}

export function writeGuestIdentity(identity: GuestIdentity): void {
  const value = encodeURIComponent(JSON.stringify(identity));
  const maxAge = COOKIE_MAX_AGE_DAYS * 24 * 60 * 60;
  document.cookie = `${COOKIE_NAME}=${value}; path=/; max-age=${maxAge}; SameSite=Lax`;
}
