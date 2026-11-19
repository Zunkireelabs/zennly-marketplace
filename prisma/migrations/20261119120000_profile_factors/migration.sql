-- CreateTable
CREATE TABLE "profile_factors" (
    "user_id" UUID NOT NULL,
    "kind" TEXT NOT NULL,
    "value" TEXT NOT NULL,
    "verified_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "profile_factors_pkey" PRIMARY KEY ("user_id","kind","value")
);

-- CreateIndex
CREATE INDEX "profile_factors_user_id_idx" ON "profile_factors"("user_id");

-- One table for both kinds (email/phone) rather than a Prisma enum, same reasoning and posture as
-- profiles.gender's CHECK: free text here is cheaper to extend than a Postgres enum, and Zod
-- enforces the same set independently at the API layer.
ALTER TABLE "profile_factors" ADD CONSTRAINT "profile_factors_kind_check"
  CHECK ("kind" IN ('email', 'phone'));

-- Safety net: Prisma connects as a role that bypasses RLS, so app queries are scoped in code.
ALTER TABLE "profile_factors" ENABLE ROW LEVEL SECURITY;

-- Seed: one kind='email' row per existing profile, from its current CONFIRMED login email in
-- Supabase's own auth.users. Not optional — studio-history's cross-studio lookup only ever fans
-- out over verified factors, so skipping this seed makes every existing user's booking history at
-- every connected studio silently disappear, with nothing logged anywhere to explain why.
-- lower() matches normalizeEmail's lowercase convention defensively; ON CONFLICT is a no-op safety
-- net in case this migration is ever re-run against a partially-seeded database.
INSERT INTO "profile_factors" (user_id, kind, value, verified_at)
SELECT p.id, 'email', lower(u.email), u.email_confirmed_at
FROM "profiles" p
JOIN auth.users u ON u.id = p.id
WHERE u.email_confirmed_at IS NOT NULL
ON CONFLICT (user_id, kind, value) DO NOTHING;
