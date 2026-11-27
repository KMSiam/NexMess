-- Add electricity, water (pani), and waste (moyla) bill categories to public.fixed_costs
ALTER TABLE public.fixed_costs
  DROP CONSTRAINT IF EXISTS fixed_costs_category_check;

ALTER TABLE public.fixed_costs
  ADD CONSTRAINT fixed_costs_category_check
  CHECK (
    category = ANY (
      ARRAY[
        'rent'::text,
        'utilities'::text,
        'electricity'::text,
        'water'::text,
        'gas'::text,
        'internet'::text,
        'maid'::text,
        'waste'::text,
        'other'::text
      ]
    )
  );
