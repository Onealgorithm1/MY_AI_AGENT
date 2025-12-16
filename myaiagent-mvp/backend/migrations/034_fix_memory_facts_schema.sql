-- Migration 034: Fix memory_facts table schema to match application code
-- Updates memory_facts table to use correct column names and types

-- Drop and recreate memory_facts table with correct schema
DROP TABLE IF EXISTS memory_facts CASCADE;

CREATE TABLE memory_facts (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    fact TEXT NOT NULL,
    category VARCHAR(100),
    source_conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
    source_message_id INTEGER REFERENCES messages(id) ON DELETE SET NULL,
    confidence FLOAT DEFAULT 1.0,
    manually_added BOOLEAN DEFAULT false,
    approved BOOLEAN DEFAULT true,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    last_referenced_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    times_referenced INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}'::jsonb
);

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_memory_facts_user_id ON memory_facts(user_id);
CREATE INDEX IF NOT EXISTS idx_memory_facts_category ON memory_facts(category);
CREATE INDEX IF NOT EXISTS idx_memory_facts_approved ON memory_facts(approved);
CREATE INDEX IF NOT EXISTS idx_memory_facts_user_referenced ON memory_facts(user_id, last_referenced_at DESC);

-- Log migration
CREATE TABLE IF NOT EXISTS schema_migrations (
  version INTEGER PRIMARY KEY,
  executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  description VARCHAR(500)
);

INSERT INTO schema_migrations (version, description) 
VALUES (34, 'Fix memory_facts table schema to match application code')
ON CONFLICT (version) DO NOTHING;
