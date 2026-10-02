-- CreateTable
CREATE TABLE "collections" (
    "slug" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "intro" TEXT NOT NULL,
    "tone" TEXT NOT NULL,
    "image" TEXT NOT NULL,
    "image_alt" TEXT NOT NULL,
    "sort_order" INTEGER NOT NULL DEFAULT 0,

    CONSTRAINT "collections_pkey" PRIMARY KEY ("slug")
);

-- CreateTable
CREATE TABLE "collection_providers" (
    "collection_slug" TEXT NOT NULL,
    "provider_slug" TEXT NOT NULL,
    "position" INTEGER NOT NULL,

    CONSTRAINT "collection_providers_pkey" PRIMARY KEY ("collection_slug","provider_slug")
);

-- CreateIndex
CREATE INDEX "collection_providers_provider_slug_idx" ON "collection_providers"("provider_slug");

-- AddForeignKey
ALTER TABLE "collection_providers" ADD CONSTRAINT "collection_providers_collection_slug_fkey" FOREIGN KEY ("collection_slug") REFERENCES "collections"("slug") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "collection_providers" ADD CONSTRAINT "collection_providers_provider_slug_fkey" FOREIGN KEY ("provider_slug") REFERENCES "providers"("slug") ON DELETE CASCADE ON UPDATE CASCADE;
