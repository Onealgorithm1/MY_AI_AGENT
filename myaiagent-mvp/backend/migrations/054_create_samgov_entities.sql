CREATE TABLE IF NOT EXISTS samgov_entities (
    uei VARCHAR(12) PRIMARY KEY,
    cage_code VARCHAR(10),
    legal_business_name VARCHAR(255) NOT NULL,
    dba_name VARCHAR(255),
    registration_status VARCHAR(50),
    expiration_date DATE,
    full_data JSONB NOT NULL,
    last_updated_from_api TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_samgov_entities_legal_name ON samgov_entities(legal_business_name);
CREATE INDEX IF NOT EXISTS idx_samgov_entities_cage ON samgov_entities(cage_code);
CREATE INDEX IF NOT EXISTS idx_samgov_entities_status ON samgov_entities(registration_status);
