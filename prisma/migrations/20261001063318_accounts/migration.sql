-- CreateTable
CREATE TABLE "profiles" (
    "id" UUID NOT NULL,
    "name" TEXT,
    "avatar" TEXT,
    "country" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "profiles_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "saved_studios" (
    "user_id" UUID NOT NULL,
    "provider_slug" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "saved_studios_pkey" PRIMARY KEY ("user_id","provider_slug")
);

-- CreateTable
CREATE TABLE "consents" (
    "id" UUID NOT NULL,
    "user_id" UUID NOT NULL,
    "purpose" TEXT NOT NULL,
    "granted" BOOLEAN NOT NULL,
    "source" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "consents_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "events" (
    "id" UUID NOT NULL,
    "user_id" UUID,
    "anon_id" TEXT NOT NULL,
    "event" TEXT NOT NULL,
    "provider_slug" TEXT,
    "props" JSONB NOT NULL DEFAULT '{}',
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "events_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "consents_user_id_idx" ON "consents"("user_id");

-- CreateIndex
CREATE INDEX "events_user_id_idx" ON "events"("user_id");

-- CreateIndex
CREATE INDEX "events_event_at_idx" ON "events"("event", "at");

-- Safety net: Prisma connects as a role that bypasses RLS, so app queries are scoped in code.
-- RLS on with no policies means Supabase's public API (anon/authenticated keys) can read nothing.
ALTER TABLE "profiles" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "saved_studios" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "consents" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "events" ENABLE ROW LEVEL SECURITY;
