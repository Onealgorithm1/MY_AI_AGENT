-- Migration 012: URL Content Cache and Summaries
-- Stores fetched URL content and AI-generated summaries

-- Table for URL content cache
CREATE TABLE IF NOT EXISTS url_cache (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  content JSONB NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  fetch_count INTEGER DEFAULT 1,
  fetched_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE(url)
);

-- Table for URL summaries
CREATE TABLE IF NOT EXISTS url_summaries (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  url TEXT NOT NULL,
  summary TEXT NOT NULL,
  analysis JSONB DEFAULT '{}'::jsonb,
  conversation_id INTEGER REFERENCES conversations(id) ON DELETE SET NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Indexes for url_cache
CREATE INDEX IF NOT EXISTS idx_url_cache_user_id ON url_cache(user_id);
CREATE INDEX IF NOT EXISTS idx_url_cache_url ON url_cache(url);
CREATE INDEX IF NOT EXISTS idx_url_cache_user_fetched_at ON url_cache(user_id, fetched_at DESC);
CREATE INDEX IF NOT EXISTS idx_url_cache_fetched_at ON url_cache(fetched_at DESC);

-- Indexes for url_summaries
CREATE INDEX IF NOT EXISTS idx_url_summaries_user_id ON url_summaries(user_id);
CREATE INDEX IF NOT EXISTS idx_url_summaries_url ON url_summaries(url);
CREATE INDEX IF NOT EXISTS idx_url_summaries_user_created_at ON url_summaries(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_url_summaries_conversation_id ON url_summaries(conversation_id);
CREATE INDEX IF NOT EXISTS idx_url_summaries_created_at ON url_summaries(created_at DESC);

-- Triggers for updated_at (if update_updated_at_column function exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_proc WHERE proname = 'update_updated_at_column') THEN
    EXECUTE 'CREATE TRIGGER update_url_cache_updated_at
             BEFORE UPDATE ON url_cache
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';

    EXECUTE 'CREATE TRIGGER update_url_summaries_updated_at
             BEFORE UPDATE ON url_summaries
             FOR EACH ROW
             EXECUTE FUNCTION update_updated_at_column()';
  END IF;
END $$;

-- Comments for url_cache
COMMENT ON TABLE url_cache IS 'Caches fetched URL content to reduce redundant fetches';
COMMENT ON COLUMN url_cache.user_id IS 'User who fetched the URL';
COMMENT ON COLUMN url_cache.url IS 'The URL that was fetched (unique)';
COMMENT ON COLUMN url_cache.content IS 'Extracted content (text, headings, etc.)';
COMMENT ON COLUMN url_cache.metadata IS 'URL metadata (title, description, author, etc.)';
COMMENT ON COLUMN url_cache.fetch_count IS 'Number of times this URL has been fetched';
COMMENT ON COLUMN url_cache.fetched_at IS 'Most recent fetch timestamp';

-- Comments for url_summaries
COMMENT ON TABLE url_summaries IS 'Stores AI-generated summaries and analyses of URLs';
COMMENT ON COLUMN url_summaries.user_id IS 'User who requested the summary';
COMMENT ON COLUMN url_summaries.url IS 'The URL that was summarized';
COMMENT ON COLUMN url_summaries.summary IS 'Text summary of the content';
COMMENT ON COLUMN url_summaries.analysis IS 'Structured analysis data (key points, entities, topics, etc.)';
COMMENT ON COLUMN url_summaries.conversation_id IS 'Optional link to a conversation';
