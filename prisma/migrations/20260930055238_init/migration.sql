-- CreateTable
CREATE TABLE "providers" (
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "city" TEXT NOT NULL,
    "region" TEXT NOT NULL,
    "location" TEXT NOT NULL,
    "modality" TEXT NOT NULL,
    "modalities" TEXT[],
    "rating" DOUBLE PRECISION NOT NULL,
    "review_count" INTEGER NOT NULL DEFAULT 0,
    "is_new" BOOLEAN NOT NULL DEFAULT false,
    "is_recommended" BOOLEAN NOT NULL DEFAULT false,
    "tone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "gallery" TEXT[],
    "tour" JSONB,
    "intro" TEXT[],
    "great_for" TEXT[],
    "features" JSONB NOT NULL,
    "service_categories" TEXT[],
    "services" JSONB NOT NULL,
    "included" TEXT[],
    "add_ons" JSONB NOT NULL,
    "amenities" TEXT[],
    "address" TEXT NOT NULL,
    "hours" JSONB NOT NULL,
    "nearby" JSONB NOT NULL,
    "review_summary" TEXT NOT NULL DEFAULT '',
    "reviews" JSONB NOT NULL,
    "from_price" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "engine_provider_id" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "providers_pkey" PRIMARY KEY ("slug")
);

-- CreateIndex
CREATE UNIQUE INDEX "providers_engine_provider_id_key" ON "providers"("engine_provider_id");
