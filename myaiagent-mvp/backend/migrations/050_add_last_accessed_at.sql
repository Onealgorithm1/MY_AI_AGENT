-- Add last_accessed_at to organization_users to track active organization
ALTER TABLE organization_users 
ADD COLUMN IF NOT EXISTS last_accessed_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;
