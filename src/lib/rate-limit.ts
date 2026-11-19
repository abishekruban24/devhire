/**
 * DevHire Authentication Rate Limiter
 * 
 * Supports:
 * 1. Distributed Serverless Rate Limiting via Upstash Redis REST API (when configured)
 * 2. In-Memory Sliding Window for local development
 * 
 * NOTE FOR PRODUCTION DEPLOYMENT:
 * In serverless environments (Vercel / AWS Lambda), in-memory stores are isolated
 * to individual container instances. For strict distributed brute-force protection
 * across all serverless lambdas, configure:
 * - UPSTASH_REDIS_REST_URL
 * - UPSTASH_REDIS_REST_TOKEN
 */

interface RateLimitRecord {
  count: number;
  resetAt: number;
}

const memoryStore = new Map<string, RateLimitRecord>();

// Clean up expired entries every 5 minutes in persistent runtimes
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const now = Date.now();
    for (const [key, record] of memoryStore.entries()) {
      if (now > record.resetAt) {
        memoryStore.delete(key);
      }
    }
  }, 5 * 60 * 1000).unref?.();
}

export interface RateLimitResult {
  success: boolean;
  limit: number;
  remaining: number;
  resetMs: number;
  isDistributed?: boolean;
}

/**
 * Checks and increments rate limit for a given key.
 * Uses Upstash Redis if configured; otherwise uses local memory store.
 */
export async function rateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  // 1. Distributed Rate Limiting via Upstash Redis REST API
  if (upstashUrl && upstashToken) {
    try {
      const windowSeconds = Math.ceil(windowMs / 1000);
      const pipelineRes = await fetch(`${upstashUrl}/pipeline`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify([
          ["INCR", key],
          ["EXPIRE", key, windowSeconds],
        ]),
        cache: "no-store",
      });

      if (pipelineRes.ok) {
        const data = await pipelineRes.json();
        const count = Number(data[0]?.result ?? 1);
        const remaining = Math.max(0, limit - count);

        return {
          success: count <= limit,
          limit,
          remaining,
          resetMs: windowMs,
          isDistributed: true,
        };
      } else {
        console.error(`[RateLimit Error]: Upstash Redis returned HTTP ${pipelineRes.status}`);
        if (process.env.NODE_ENV === "production") {
          return {
            success: false,
            limit,
            remaining: 0,
            resetMs: windowMs,
            isDistributed: true,
          };
        }
      }
    } catch (err) {
      console.error("[RateLimit Error]: Distributed Upstash check failed:", err);
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          limit,
          remaining: 0,
          resetMs: windowMs,
          isDistributed: true,
        };
      }
    }
  }

  // 2. Fail safely in production if distributed store is missing
  // Never silently fall back to ineffective per-instance in-memory rate limiting on serverless containers.
  if (process.env.NODE_ENV === "production" && (!upstashUrl || !upstashToken)) {
    console.error(
      "[Security Error]: Production deployment requires UPSTASH_REDIS_REST_URL and UPSTASH_REDIS_REST_TOKEN. Failing safely to prevent unprotected authentication."
    );
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: windowMs,
      isDistributed: false,
    };
  }

  // 3. In-Memory Store Fallback (Development & Test Environments Only)
  const now = Date.now();
  const existing = memoryStore.get(key);

  if (!existing || now > existing.resetAt) {
    memoryStore.set(key, {
      count: 1,
      resetAt: now + windowMs,
    });
    return {
      success: true,
      limit,
      remaining: limit - 1,
      resetMs: windowMs,
      isDistributed: false,
    };
  }

  if (existing.count >= limit) {
    return {
      success: false,
      limit,
      remaining: 0,
      resetMs: Math.max(0, existing.resetAt - now),
      isDistributed: false,
    };
  }

  existing.count += 1;
  return {
    success: true,
    limit,
    remaining: limit - existing.count,
    resetMs: Math.max(0, existing.resetAt - now),
    isDistributed: false,
  };
}

/**
 * Resets rate limit for a key upon successful authentication
 */
export async function resetRateLimit(key: string): Promise<void> {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  if (upstashUrl && upstashToken) {
    try {
      await fetch(`${upstashUrl}/del/${encodeURIComponent(key)}`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${upstashToken}`,
        },
        cache: "no-store",
      });
    } catch {
      // Ignore reset failure in background
    }
  }

  memoryStore.delete(key);
}
