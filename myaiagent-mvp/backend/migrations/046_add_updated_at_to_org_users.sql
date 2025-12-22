
-- Add updated_at column to organization_users table
ALTER TABLE organization_users ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create trigger to automatically update the updated_at column
CREATE OR REPLACE FUNCTION update_organization_users_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

DROP TRIGGER IF EXISTS update_organization_users_updated_at_trigger ON organization_users;

CREATE TRIGGER update_organization_users_updated_at_trigger
    BEFORE UPDATE ON organization_users
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_users_updated_at_column();
