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

export type RateLimitStatus =
  | "ALLOWED"
  | "RATE_LIMITED"
  | "SERVICE_UNAVAILABLE"
  | "CONFIG_ERROR";

export interface RateLimitResult {
  success: boolean;
  status: RateLimitStatus;
  limit: number;
  remaining: number;
  resetMs: number;
  isDistributed?: boolean;
  message?: string;
}

function sanitizeConfig(val?: string): string {
  if (!val) return "";
  let s = val.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s;
}

export function getUpstashConfig() {
  const rawUrl = process.env.UPSTASH_REDIS_REST_URL;
  const rawToken = process.env.UPSTASH_REDIS_REST_TOKEN;

  const url = sanitizeConfig(rawUrl).replace(/\/+$/, "");
  let token = sanitizeConfig(rawToken);
  if (token.startsWith("Bearer ")) {
    token = token.slice(7).trim();
  }

  return {
    url: url || undefined,
    token: token || undefined,
  };
}

/**
 * Checks and increments rate limit for a given key.
 * Uses Upstash Redis if configured; otherwise uses local memory store in dev/test.
 */
export async function rateLimit(
  key: string,
  limit = 5,
  windowMs = 15 * 60 * 1000
): Promise<RateLimitResult> {
  const { url: upstashUrl, token: upstashToken } = getUpstashConfig();

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
          ["EXPIRE", key, windowSeconds, "NX"],
          ["TTL", key],
        ]),
        cache: "no-store",
      });

      if (pipelineRes.ok) {
        const data = await pipelineRes.json();
        const count = Number(data[0]?.result ?? 1);
        const remaining = Math.max(0, limit - count);
        const ttlSeconds = Number(data[2]?.result ?? windowSeconds);
        const resetMs = ttlSeconds > 0 ? ttlSeconds * 1000 : windowMs;
        const isAllowed = count <= limit;

        return {
          success: isAllowed,
          status: isAllowed ? "ALLOWED" : "RATE_LIMITED",
          limit,
          remaining,
          resetMs,
          isDistributed: true,
          message: isAllowed
            ? undefined
            : `Too many attempts. Please wait ${Math.ceil(resetMs / 60000)} minutes before trying again.`,
        };
      } else {
        const isAuthError = pipelineRes.status === 401 || pipelineRes.status === 403;
        console.error(
          `[RateLimit Error]: Upstash Redis returned HTTP ${pipelineRes.status}${
            isAuthError ? " (Unauthorized / Forbidden: Check UPSTASH_REDIS_REST_TOKEN)" : ""
          }`
        );
        if (process.env.NODE_ENV === "production") {
          return {
            success: false,
            status: isAuthError ? "CONFIG_ERROR" : "SERVICE_UNAVAILABLE",
            limit,
            remaining: 0,
            resetMs: windowMs,
            isDistributed: true,
            message: isAuthError
              ? "Rate limiting service configuration error."
              : "Rate limiting service is temporarily unavailable. Please try again shortly.",
          };
        }
      }
    } catch (err) {
      console.error("[RateLimit Error]: Distributed Upstash check failed:", err);
      if (process.env.NODE_ENV === "production") {
        return {
          success: false,
          status: "SERVICE_UNAVAILABLE",
          limit,
          remaining: 0,
          resetMs: windowMs,
          isDistributed: true,
          message: "Rate limiting service is temporarily unavailable. Please try again shortly.",
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
      status: "CONFIG_ERROR",
      limit,
      remaining: 0,
      resetMs: windowMs,
      isDistributed: false,
      message: "Rate limiting configuration error. Required credentials missing.",
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
      status: "ALLOWED",
      limit,
      remaining: limit - 1,
      resetMs: windowMs,
      isDistributed: false,
    };
  }

  if (existing.count >= limit) {
    const remainingResetMs = Math.max(0, existing.resetAt - now);
    return {
      success: false,
      status: "RATE_LIMITED",
      limit,
      remaining: 0,
      resetMs: remainingResetMs,
      isDistributed: false,
      message: `Too many attempts. Please wait ${Math.ceil(remainingResetMs / 60000)} minutes before trying again.`,
    };
  }

  existing.count += 1;
  const remaining = limit - existing.count;
  return {
    success: true,
    status: "ALLOWED",
    limit,
    remaining,
    resetMs: Math.max(0, existing.resetAt - now),
    isDistributed: false,
  };
}

/**
 * Resets rate limit for a key upon successful authentication
 */
export async function resetRateLimit(key: string): Promise<void> {
  const { url: upstashUrl, token: upstashToken } = getUpstashConfig();

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
