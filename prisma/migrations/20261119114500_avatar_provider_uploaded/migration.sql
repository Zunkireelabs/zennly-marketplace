-- Rename, not drop+add: the existing `avatar` column holds a live Google photo URL on at least
-- one real account, and a rename carries that value across automatically. Prisma's own diff would
-- have generated a DROP COLUMN "avatar" + two ADD COLUMNs here, which loses that data — written by
-- hand instead specifically to avoid it.
ALTER TABLE "profiles" RENAME COLUMN "avatar" TO "avatar_provider";

-- AlterTable
ALTER TABLE "profiles" ADD COLUMN "avatar_uploaded" TEXT;
