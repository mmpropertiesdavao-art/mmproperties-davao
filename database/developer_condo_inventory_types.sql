-- Run this in Supabase before adding condominium inventory types in the admin.
-- It keeps existing house model / lot-only inventory and allows condo unit types.

ALTER TABLE public.developer_house_models
  DROP CONSTRAINT IF EXISTS developer_house_models_model_type_check;

ALTER TABLE public.developer_house_models
  ADD CONSTRAINT developer_house_models_model_type_check
  CHECK (
    model_type IN (
      'house_model',
      'lot_only',
      'studio',
      'one_bedroom',
      'two_bedroom',
      'three_bedroom',
      'four_bedroom',
      'penthouse'
    )
  );
