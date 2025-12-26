-- Add branding_settings column to organizations table if it doesn't exist
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'branding_settings') THEN
      ALTER TABLE organizations ADD COLUMN branding_settings JSONB DEFAULT '{}'::jsonb;
    END IF;
  END IF;
END $$;
