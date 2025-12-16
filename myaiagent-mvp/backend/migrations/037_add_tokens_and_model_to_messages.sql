-- Migration 037: Add tokens_used and model columns to messages table
-- Fixes errors from streaming responses and model tracking

DO $$
BEGIN
  -- Add tokens_used column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'tokens_used'
  ) THEN
    ALTER TABLE messages ADD COLUMN tokens_used INTEGER DEFAULT 0;
  END IF;
  
  -- Add model column if it doesn't exist
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'messages' AND column_name = 'model'
  ) THEN
    ALTER TABLE messages ADD COLUMN model VARCHAR(255);
  END IF;
END $$;

-- Create index for tokens_used queries
CREATE INDEX IF NOT EXISTS idx_messages_tokens_used ON messages(tokens_used);
CREATE INDEX IF NOT EXISTS idx_messages_model ON messages(model);
