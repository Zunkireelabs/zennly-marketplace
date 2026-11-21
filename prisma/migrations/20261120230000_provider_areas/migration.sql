-- Areas a studio trades in: one entry per connected book-spa branch, plus the municipality
-- when its outlets straddle more than one. Searched alongside city/region so a visitor who
-- types a neighbourhood finds the studio.
--
-- Written by hand rather than generated: `prisma migrate dev` builds a shadow database and
-- replays every migration into it, and 20261119120000_profile_factors references Supabase's
-- `auth.users`, which does not exist there. Apply with `prisma migrate deploy`, which does not
-- use a shadow database.
ALTER TABLE "providers" ADD COLUMN "areas" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[];
