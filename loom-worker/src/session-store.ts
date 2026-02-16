import { StoredSession } from './types';
import { redis } from './redis';

// Session TTL: 7 days in seconds
const SESSION_TTL = 7 * 24 * 60 * 60;

// Session considered too old after 24 hours
const SESSION_MAX_AGE = 24 * 60 * 60 * 1000;

function getSessionKey(accountId: string): string {
  return `threads:session:${accountId}`;
}

export async function getSession(accountId: string): Promise<StoredSession | null> {
  const key = getSessionKey(accountId);
  const data = await redis.get(key);

  if (!data) {
    return null;
  }

  try {
    return JSON.parse(data) as StoredSession;
  } catch (err) {
    console.error(`Failed to parse session for ${accountId}:`, err);
    return null;
  }
}

export async function saveSession(accountId: string, session: StoredSession): Promise<void> {
  const key = getSessionKey(accountId);
  const data = JSON.stringify(session);

  await redis.setex(key, SESSION_TTL, data);
  console.log(`Session saved for account ${accountId}`);
}

export async function deleteSession(accountId: string): Promise<void> {
  const key = getSessionKey(accountId);
  await redis.del(key);
  console.log(`Session deleted for account ${accountId}`);
}

export function isSessionValid(session: StoredSession): boolean {
  const now = Date.now();

  // Check if session is too old (>24h since last refresh)
  if (now - session.lastRefreshed > SESSION_MAX_AGE) {
    return false;
  }

  // Check if any cookies have expired
  const hasExpiredCookies = session.cookies.some((cookie) => {
    // expires is in seconds (Unix timestamp), convert to milliseconds
    return cookie.expires * 1000 < now;
  });

  if (hasExpiredCookies) {
    return false;
  }

  return true;
}
