import "dotenv/config";
import { rateLimit, resetRateLimit } from "../src/lib/rate-limit";

async function testUpstash() {
  console.log("==================================================================");
  console.log("            DEVHIRE UPSTASH REDIS INTEGRATION TEST               ");
  console.log("==================================================================");

  const testKey = `test:devhire:ratelimit:${Date.now()}`;

  try {
    console.log("[1/3] Testing Upstash Redis REST Rate Limiter...");
    const res1 = await rateLimit(testKey, 3, 60000);
    console.log("  Attempt 1 result:", res1);

    if (!res1.isDistributed) {
      console.error("  ✗ Rate limiter did not use distributed Upstash Redis!");
      process.exit(1);
    }
    console.log("  ✓ Distributed Upstash Redis is active!");

    console.log("[2/3] Testing threshold enforcement (limit: 3)...");
    const res2 = await rateLimit(testKey, 3, 60000);
    const res3 = await rateLimit(testKey, 3, 60000);
    const res4 = await rateLimit(testKey, 3, 60000);

    console.log(`  Attempt 2: remaining=${res2.remaining}, success=${res2.success}`);
    console.log(`  Attempt 3: remaining=${res3.remaining}, success=${res3.success}`);
    console.log(`  Attempt 4 (should block): success=${res4.success}, remaining=${res4.remaining}`);

    if (res4.success) {
      console.error("  ✗ Expected attempt 4 to be blocked!");
      process.exit(1);
    }
    console.log("  ✓ 4th attempt successfully blocked by Upstash Redis!");

    console.log("[3/3] Testing resetRateLimit on Upstash...");
    await resetRateLimit(testKey);

    const resPostReset = await rateLimit(testKey, 3, 60000);
    console.log(`  Post-reset attempt 1: remaining=${resPostReset.remaining}, success=${resPostReset.success}`);

    if (!resPostReset.success || resPostReset.remaining !== 2) {
      console.error("  ✗ Reset failed to clear Upstash Redis key!");
      process.exit(1);
    }
    console.log("  ✓ Upstash Redis key successfully reset and functional!");

    // Final cleanup
    await resetRateLimit(testKey);

    console.log("\n==================================================================");
    console.log("    ALL UPSTASH REDIS DISTRIBUTED RATE LIMITER TESTS PASSED!      ");
    console.log("==================================================================");
  } catch (err) {
    console.error("Upstash test failed with error:", err);
    process.exit(1);
  }
}

testUpstash();
