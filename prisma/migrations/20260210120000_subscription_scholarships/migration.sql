-- Add scholarship overrides on allowed phones
ALTER TABLE IF EXISTS "AllowedPhoneNumber"
  ADD COLUMN IF NOT EXISTS "scholarshipOverride" BOOLEAN;

-- Add optional labeling / source info on subscriptions
ALTER TABLE IF EXISTS "Subscription"
  ADD COLUMN IF NOT EXISTS "source" TEXT;

ALTER TABLE IF EXISTS "Subscription"
  ADD COLUMN IF NOT EXISTS "label" TEXT;
