-- Migration 011: Search History Table
-- Tracks web search queries and results for audit and analytics

CREATE TABLE IF NOT EXISTS search_history (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  query TEXT NOT NULL,
  results_count INTEGER NOT NULL DEFAULT 0,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  searched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  metadata JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_search_history_user_id ON search_history(user_id);
CREATE INDEX IF NOT EXISTS idx_search_history_user_searched_at ON search_history(user_id, searched_at DESC);
CREATE INDEX IF NOT EXISTS idx_search_history_conversation_id ON search_history(conversation_id);
CREATE INDEX IF NOT EXISTS idx_search_history_searched_at ON search_history(searched_at DESC);

-- Trigger for updated_at (if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_search_history_updated_at
             BEFORE UPDATE ON search_history
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

COMMENT ON TABLE search_history IS 'Tracks web search queries and results for audit and analytics';
COMMENT ON COLUMN search_history.user_id IS 'User who performed the search';
COMMENT ON COLUMN search_history.query IS 'The actual search query string';
COMMENT ON COLUMN search_history.results_count IS 'Number of search results returned';
COMMENT ON COLUMN search_history.conversation_id IS 'Optional link to a conversation';
COMMENT ON COLUMN search_history.searched_at IS 'When the search was performed';
COMMENT ON COLUMN search_history.metadata IS 'Flexible field for additional search metadata';
