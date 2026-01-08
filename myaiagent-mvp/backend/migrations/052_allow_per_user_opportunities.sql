-- Drop the existing global unique constraint on notice_id
ALTER TABLE opportunities DROP CONSTRAINT IF EXISTS opportunities_notice_id_key;

-- Add a new composite unique constraint so a user can't save the same opportunity twice,
-- but different users can save the same opportunity.
ALTER TABLE opportunities ADD CONSTRAINT opportunities_notice_id_created_by_key UNIQUE (notice_id, created_by);

-- Also ensure created_by is NOT NULL for saved opportunities to work correctly with this constraint
-- (Optional, but good practice if we want to enforce ownership for pipeline items)
-- ALTER TABLE opportunities ALTER COLUMN created_by SET NOT NULL;
