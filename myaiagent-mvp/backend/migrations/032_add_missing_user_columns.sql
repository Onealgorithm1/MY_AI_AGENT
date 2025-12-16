-- Migration 032: Add Missing User Columns
-- Adds columns referenced by authentication middleware

DO $$
BEGIN
  -- Add is_active column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add phone column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(20);
  END IF;

  -- Add profile_image column
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_image TEXT;
  END IF;

  -- Add google_id column for Google OAuth
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'google_id'
  ) THEN
    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
  END IF;

  -- Add settings column (JSONB)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'settings'
  ) THEN
    ALTER TABLE users ADD COLUMN settings JSONB DEFAULT '{}'::jsonb;
  END IF;
END $$;

COMMENT ON COLUMN users.is_active IS 'Whether the user account is active';
COMMENT ON COLUMN users.phone IS 'User phone number';
COMMENT ON COLUMN users.profile_image IS 'URL to user profile image';
COMMENT ON COLUMN users.google_id IS 'Google OAuth ID for authentication';
COMMENT ON COLUMN users.settings IS 'User-specific settings stored as JSON';
