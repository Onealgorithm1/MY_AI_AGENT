-- Fix duplicate triggers that might exist from previous migration runs

-- Drop existing triggers safely (they'll be recreated if needed)
DO $$
BEGIN
  -- Opportunities triggers
  DROP TRIGGER IF EXISTS update_opportunities_timestamp ON opportunities;
  
  -- Search history triggers
  DROP TRIGGER IF EXISTS update_search_history_updated_at ON search_history;
  
  -- URL cache triggers
  DROP TRIGGER IF EXISTS update_url_cache_updated_at ON url_cache;
  DROP TRIGGER IF EXISTS update_url_summaries_updated_at ON url_summaries;
  
  -- SAM.gov cache triggers
  DROP TRIGGER IF EXISTS update_samgov_cache_timestamp ON samgov_cache;
  
  -- SAM.gov document analysis triggers
  DROP TRIGGER IF EXISTS samgov_documents_updated_at ON samgov_documents;
  DROP TRIGGER IF EXISTS samgov_analysis_queue_updated_at ON samgov_analysis_queue;
  
  -- FPDS contract awards triggers
  DROP TRIGGER IF EXISTS fpds_awards_updated_at_trigger ON fpds_contract_awards;
  DROP TRIGGER IF EXISTS incumbent_analysis_updated_at_trigger ON incumbent_analysis;
  DROP TRIGGER IF EXISTS competitive_intelligence_updated_at_trigger ON competitive_intelligence;
  
  -- EVM tracking triggers
  DROP TRIGGER IF EXISTS evm_updates_updated_at_trigger ON evm_updates;
  
  -- User ai agents triggers
  DROP TRIGGER IF EXISTS update_user_agents_timestamp ON user_ai_agents;
  DROP TRIGGER IF EXISTS update_ai_providers_timestamp ON ai_agent_providers;
  
  RAISE NOTICE 'Dropped all duplicate triggers successfully';
END $$;

-- Recreate the update function if it doesn't exist
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Recreate opportunity timestamp function
CREATE OR REPLACE FUNCTION update_opportunities_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
