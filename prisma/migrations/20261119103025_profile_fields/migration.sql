-- AlterTable
ALTER TABLE "profiles" ADD COLUMN     "first_name" TEXT,
ADD COLUMN     "gender" TEXT,
ADD COLUMN     "last_name" TEXT,
ADD COLUMN     "phone" TEXT,
ADD COLUMN     "phone_verified_at" TIMESTAMP(3),
ADD COLUMN     "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;

-- gender is enforced in Zod at the API layer too (src/app/api/account/route.ts), but the raw CHECK
-- here is the backstop: Prisma bypasses RLS, so app-layer validation is the only other gate, and a
-- Postgres CHECK means a bug in that validation can never park an unexpected value in the column.
-- Lowercase, exactly matching book-spa's CustomerForm.jsx so nothing has to map on the way into
-- p_customer_gender. Not a Prisma enum — see the field's doc comment in schema.prisma for why.
ALTER TABLE "profiles" ADD CONSTRAINT "profiles_gender_check"
  CHECK ("gender" IS NULL OR "gender" IN ('male', 'female', 'other'));
