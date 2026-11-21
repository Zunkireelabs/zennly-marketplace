-- Seed providers' prices were dollar figures, converted to rupees at a placeholder rate of 133
-- when a page rendered. The seed file now holds real NPR amounts and the render-time rate is 1,
-- so a database still holding the old dollar numbers would show them as rupees verbatim -- an
-- 85 dollar cut reading "Rs 85" instead of "Rs 11,300". Deploy runs `prisma migrate deploy` and
-- never seeds, so the data has to be corrected here or production renders a hundredth of every
-- price.
--
-- Same arithmetic as the seed file's conversion: x * 133, rounded to the nearest hundred, with a
-- floor of 100 so the cheapest add-on does not round to nothing. Verified against every distinct
-- value in the pre-change seed (0,3,4,...,260): this expression reproduces the committed seed
-- figures exactly, and none of them lands on a .5 boundary where rounding conventions differ.
--
-- Guarded twice, because the obvious single guard is wrong. `from_price < 200` alone would also
-- match the two engine-connected studios -- sbal at 99 and nuad-thai-spa at 150 -- whose prices
-- are ALREADY real NPR straight from book-spa (confirmed against public_get_bookable_services:
-- those are genuinely their cheapest services). Converting them would inflate real studios'
-- prices 133-fold. Hence `engine_provider_id IS NULL` as well.
--
-- Re-runnable in effect: converted rows land at 2700+, so the `< 200` guard no longer matches
-- them. A database already seeded with NPR (local dev) is untouched.
--
-- Written by hand rather than generated: `prisma migrate dev` builds a shadow database and
-- replays every migration into it, and 20261119120000_profile_factors references Supabase's
-- `auth.users`, which does not exist there. Apply with `prisma migrate deploy`.

CREATE FUNCTION pg_temp_usd_to_npr(amount double precision)
RETURNS double precision
LANGUAGE sql
IMMUTABLE
AS $$
  SELECT CASE
    WHEN amount IS NULL OR amount = 0 THEN amount
    ELSE GREATEST(100, ROUND((amount * 133.0 / 100.0)::numeric) * 100)::double precision
  END;
$$;

UPDATE "providers" p
SET
  "from_price" = pg_temp_usd_to_npr(p."from_price"),
  "services" = COALESCE((
    SELECT jsonb_agg(
      CASE WHEN s ? 'price'
        THEN jsonb_set(s, '{price}', to_jsonb(pg_temp_usd_to_npr((s->>'price')::double precision)))
        ELSE s
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(p."services") WITH ORDINALITY AS t(s, ord)
  ), p."services"),
  "add_ons" = COALESCE((
    SELECT jsonb_agg(
      CASE WHEN a ? 'price'
        THEN jsonb_set(a, '{price}', to_jsonb(pg_temp_usd_to_npr((a->>'price')::double precision)))
        ELSE a
      END
      ORDER BY ord
    )
    FROM jsonb_array_elements(p."add_ons") WITH ORDINALITY AS t(a, ord)
  ), p."add_ons")
WHERE p."engine_provider_id" IS NULL
  AND p."from_price" > 0
  AND p."from_price" < 200;

DROP FUNCTION pg_temp_usd_to_npr(double precision);
