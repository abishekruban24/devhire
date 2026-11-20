import { PrismaClient } from "@prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";


// Global declaration for PrismaClient to prevent multiple instances in development hot-reloading
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function cleanConnectionString(url?: string): string | undefined {
  if (!url) return undefined;
  let s = url.trim();
  if (
    (s.startsWith('"') && s.endsWith('"')) ||
    (s.startsWith("'") && s.endsWith("'"))
  ) {
    s = s.slice(1, -1).trim();
  }
  return s || undefined;
}

function createPrismaClient(): PrismaClient {
  const connectionString = cleanConnectionString(process.env.DATABASE_URL);

  // In Prisma 7, PostgreSQL utilizes a driver adapter for standard SQL workflows
  const adapter = connectionString ? new PrismaPg(connectionString) : undefined;

  return new PrismaClient({
    ...(adapter ? { adapter } : {}),
    log: process.env.DEBUG_PRISMA_QUERIES === "true" ? ["query", "error", "warn"] : ["error", "warn"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export default prisma;

