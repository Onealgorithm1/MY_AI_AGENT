-- Migration 011: Search History Table
-- Tracks web search queries and results for audit and analytics
-- This migration safely handles both new tables and existing ones

-- Create table if it doesn't exist with all required columns
CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  result_count INTEGER DEFAULT 0,
  clicked_result_index INTEGER,
  search_type VARCHAR(50) DEFAULT 'general',
  results_count INTEGER DEFAULT 0,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Add missing columns to existing search_history table
DO $$
BEGIN
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

  -- Ensure created_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' AND column_name = 'created_at'
  ) THEN
    ALTER TABLE search_history ADD COLUMN created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;

  -- Ensure updated_at exists
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'search_history' AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE search_history ADD COLUMN updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP;
  END IF;
END $$;

-- Safely create indexes using direct SQL instead of DO blocks to avoid issues
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_conversation_id ON search_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_searched_at ON search_history(user_id, searched_at DESC);

-- Create trigger function if it doesn't exist
CREATE OR REPLACE FUNCTION update_search_history_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create trigger for updated_at column
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.triggers
    WHERE trigger_name = 'update_search_history_updated_at'
  ) THEN
    CREATE TRIGGER update_search_history_updated_at
      BEFORE UPDATE ON search_history
      FOR EACH ROW
      EXECUTE FUNCTION update_search_history_updated_at();
  END IF;
END $$;
