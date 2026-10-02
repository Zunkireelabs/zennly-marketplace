import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

/** Null until DATABASE_URL is set, so local dev keeps running on placeholder data. */
function create(): PrismaClient | null {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) return null;
  // Small pool: `next build` prerenders in parallel workers, each with its own client, and the
  // Supabase pooler caps total connections. DATABASE_URL should be the transaction pooler (6543).
  return new PrismaClient({ adapter: new PrismaPg({ connectionString, max: 3 }) });
}

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient | null };

export const prisma = globalForPrisma.prisma !== undefined ? globalForPrisma.prisma : create();

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
