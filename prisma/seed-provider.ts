/**
 * Upserts ONE real provider by slug and touches nothing else (no other providers, no collections).
 * Run: npx tsx prisma/seed-provider.ts <slug> [--apply]
 * Without --apply it only prints what it would do. Uses DIRECT_URL / DATABASE_URL from the environment.
 */
import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { realProviders } from "../src/lib/providers-real";
import { realProviderData } from "./real-provider-data";

const slug = process.argv[2];
const apply = process.argv.includes("--apply");
const connectionString = process.env.DIRECT_URL ?? process.env.DATABASE_URL;
if (!slug || !connectionString) throw new Error("Usage: seed-provider.ts <slug> [--apply] (needs DIRECT_URL)");
const p = realProviders.find((r) => r.slug === slug);
if (!p) throw new Error(`No real provider with slug ${slug}`);

const prisma = new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
async function main() {
  const before = await prisma.provider.count();
  const existing = await prisma.provider.findUnique({ where: { slug }, select: { slug: true } });
  console.log(`providers before: ${before}; ${slug} ${existing ? "exists (update)" : "missing (create)"}`);
  if (!apply) return console.log("dry run, nothing written");
  const data = realProviderData(p!);
  await prisma.provider.upsert({ where: { slug }, create: { slug, ...data }, update: data });
  console.log(`providers after: ${await prisma.provider.count()}`);
}
main().finally(() => prisma.$disconnect());
