-- CreateTable
CREATE TABLE "referral_codes" (
    "user_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "referral_codes_pkey" PRIMARY KEY ("user_id")
);

-- CreateTable
CREATE TABLE "referrals" (
    "id" UUID NOT NULL,
    "referrer_id" UUID NOT NULL,
    "referred_id" UUID NOT NULL,
    "code" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "booked_at" TIMESTAMP(3),
    "rewarded_at" TIMESTAMP(3),

    CONSTRAINT "referrals_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "referral_codes_code_key" ON "referral_codes"("code");

-- CreateIndex
CREATE UNIQUE INDEX "referrals_referred_id_key" ON "referrals"("referred_id");

-- CreateIndex
CREATE INDEX "referrals_referrer_id_idx" ON "referrals"("referrer_id");

-- Row Level Security: on with no policy, so the public API cannot read or write these rows.
-- Only the server (Prisma, direct connection) touches them, the same as the other account tables.
ALTER TABLE "referral_codes" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "referrals" ENABLE ROW LEVEL SECURITY;
