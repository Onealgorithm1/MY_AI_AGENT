-- Migration: Fix Authentication Schema
-- Adds missing columns required by auth routes and middleware

-- Add missing columns to users table
DO $$
BEGIN
  -- Add is_active column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'is_active'
  ) THEN
    ALTER TABLE users ADD COLUMN is_active BOOLEAN DEFAULT TRUE;
  END IF;

  -- Add phone column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'phone'
  ) THEN
    ALTER TABLE users ADD COLUMN phone VARCHAR(50);
  END IF;

  -- Add profile_image column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'profile_image'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_image TEXT;
  END IF;

  -- Add google_id column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'google_id'
  ) THEN
    ALTER TABLE users ADD COLUMN google_id VARCHAR(255) UNIQUE;
  END IF;

  -- Add profile_picture column if it doesn't exist (used in google-auth)
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'users' AND column_name = 'profile_picture'
  ) THEN
    ALTER TABLE users ADD COLUMN profile_picture TEXT;
  END IF;

END $$;

-- Fix search_history table - ensure all columns exist
DO $$
BEGIN
  -- Recreate table if it's missing the searched_at column
  -- First, check if table exists
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'search_history') THEN
    -- Add searched_at column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'searched_at'
    ) THEN
      ALTER TABLE search_history ADD COLUMN searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Add results_count column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'results_count'
    ) THEN
      ALTER TABLE search_history ADD COLUMN results_count INTEGER DEFAULT 0;
    END IF;

    -- Add conversation_id column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'conversation_id'
    ) THEN
      ALTER TABLE search_history ADD COLUMN conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL;
    END IF;

    -- Add metadata column if it doesn't exist
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'metadata'
    ) THEN
      ALTER TABLE search_history ADD COLUMN metadata JSONB DEFAULT '{}'::jsonb;
    END IF;

    -- Ensure created_at exists with default
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'created_at'
    ) THEN
      ALTER TABLE search_history ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;

    -- Ensure updated_at exists with default
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_name = 'search_history' AND column_name = 'updated_at'
    ) THEN
      ALTER TABLE search_history ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
    END IF;
  ELSE
    -- If table doesn't exist, create it with all required columns
    CREATE TABLE search_history (
      id SERIAL PRIMARY KEY,
      user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      query TEXT NOT NULL,
      results_count INTEGER DEFAULT 0,
      conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
      searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
      metadata JSONB DEFAULT '{}'::jsonb,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX idx_search_history_user_id ON search_history(user_id);
    CREATE INDEX idx_search_history_user_searched_at ON search_history(user_id, searched_at DESC);
    CREATE INDEX idx_search_history_conversation_id ON search_history(conversation_id);
    CREATE INDEX idx_search_history_searched_at ON search_history(searched_at DESC);
  END IF;
END $$;

-- Create indexes on users table if they don't exist
CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active);
CREATE INDEX IF NOT EXISTS idx_users_google_id ON users(google_id);

-- Update google_id column to have UNIQUE constraint if missing
DO $$
BEGIN
  -- This is handled by the ALTER TABLE statement above since we added UNIQUE to google_id
END $$;

-- Log completion
DO $$
BEGIN
  RAISE NOTICE 'Auth schema migration completed - added missing columns to users and search_history tables';
END $$;
