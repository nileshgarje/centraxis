import { Ratelimit } from "@upstash/ratelimit";
import { Redis } from "@upstash/redis";

/**
 * In-memory fallback rate limiter implementing sliding-window tracking
 * for environments without Upstash Redis credentials.
 */
class MemoryRateLimiter {
  private windows = new Map<string, { count: number; expiresAt: number }>();
  private readonly maxRequests: number;
  private readonly windowMs: number;

  constructor(maxRequests: number, windowSeconds: number) {
    this.maxRequests = maxRequests;
    this.windowMs = windowSeconds * 1000;
  }

  async limit(identifier: string): Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }> {
    const now = Date.now();
    const entry = this.windows.get(identifier);

    if (!entry || entry.expiresAt <= now) {
      this.windows.set(identifier, {
        count: 1,
        expiresAt: now + this.windowMs,
      });
      return {
        success: true,
        limit: this.maxRequests,
        remaining: this.maxRequests - 1,
        reset: now + this.windowMs,
      };
    }

    if (entry.count >= this.maxRequests) {
      return {
        success: false,
        limit: this.maxRequests,
        remaining: 0,
        reset: entry.expiresAt,
      };
    }

    entry.count += 1;
    return {
      success: true,
      limit: this.maxRequests,
      remaining: this.maxRequests - entry.count,
      reset: entry.expiresAt,
    };
  }

  // Helper for tests to reset in-memory state
  reset(identifier?: string) {
    if (identifier) {
      this.windows.delete(identifier);
    } else {
      this.windows.clear();
    }
  }
}

type RateLimiterInstance = {
  limit: (identifier: string) => Promise<{
    success: boolean;
    limit: number;
    remaining: number;
    reset: number;
  }>;
};

// Check if Upstash Redis credentials are provided
const hasUpstashConfig =
  Boolean(process.env.UPSTASH_REDIS_REST_URL) &&
  Boolean(process.env.UPSTASH_REDIS_REST_TOKEN);

let redis: Redis | null = null;
if (hasUpstashConfig) {
  try {
    redis = new Redis({
      url: process.env.UPSTASH_REDIS_REST_URL!,
      token: process.env.UPSTASH_REDIS_REST_TOKEN!,
    });
  } catch (err) {
    console.warn("Failed to initialize Upstash Redis, falling back to in-memory:", err);
  }
}

function createLimiter(
  requests: number,
  windowDuration: `${number} s` | `${number} m`,
  windowSeconds: number,
  prefix: string,
): RateLimiterInstance {
  if (redis) {
    return new Ratelimit({
      redis,
      limiter: Ratelimit.slidingWindow(requests, windowDuration),
      prefix: `centraxis:${prefix}`,
      analytics: true,
    });
  }
  return new MemoryRateLimiter(requests, windowSeconds);
}

/**
 * 1. Public Auth & Uploads: Strict limit (10 requests per 60 seconds per IP)
 */
export const authAndUploadLimiter = createLimiter(10, "60 s", 60, "auth");

/**
 * 2. AI Story Generation: Controlled limit (10 requests per minute per user ID)
 */
export const aiGenerationLimiter = createLimiter(10, "1 m", 60, "ai");

/**
 * 3. General tRPC Mutators: Moderate limit (60 requests per minute per user)
 */
export const mutationLimiter = createLimiter(60, "1 m", 60, "mutation");

/**
 * 4. General Reads / Queries: Relaxed limit (300 requests per minute per IP/user)
 */
export const queryLimiter = createLimiter(300, "1 m", 60, "query");

export type RateLimitTier = "auth" | "ai" | "mutation" | "query";

/**
 * Unified rate limit check helper
 */
export async function checkRateLimit(
  tier: RateLimitTier,
  identifier: string,
) {
  switch (tier) {
    case "auth":
      return authAndUploadLimiter.limit(identifier);
    case "ai":
      return aiGenerationLimiter.limit(identifier);
    case "mutation":
      return mutationLimiter.limit(identifier);
    case "query":
      return queryLimiter.limit(identifier);
  }
}
