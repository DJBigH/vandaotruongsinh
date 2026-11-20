const WINDOW_MS = 10 * 60_000;
type Bucket = { failures: number; until: number };

export class LoginThrottle {
  private readonly buckets = new Map<string, Bucket>();

  private bucket(key: string, now: number): Bucket {
    const existing = this.buckets.get(key);
    if (existing && existing.until > now) return existing;
    const fresh = { failures: 0, until: now + WINDOW_MS };
    this.buckets.set(key, fresh);
    return fresh;
  }

  retryAfterSeconds(ip: string, username: string, now = Date.now()): number {
    for (const [key, limit] of [[`ip:${ip}`, 20], [`user:${username.toLowerCase()}`, 5]] as const) {
      const item = this.bucket(key, now);
      if (item.failures >= limit) return Math.ceil((item.until - now) / 1000);
    }
    return 0;
  }

  recordFailure(ip: string, username: string, now = Date.now()): void {
    this.bucket(`ip:${ip}`, now).failures++;
    this.bucket(`user:${username.toLowerCase()}`, now).failures++;
  }

  recordSuccess(_ip: string, username: string): void {
    this.buckets.delete(`user:${username.toLowerCase()}`);
  }
}

export const loginThrottle = new LoginThrottle();
