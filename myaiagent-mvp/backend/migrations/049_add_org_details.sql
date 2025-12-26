-- Migration 049: Add details columns to organizations table
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'organizations') THEN
    
    -- Add address column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'address') THEN
      ALTER TABLE organizations ADD COLUMN address TEXT;
    END IF;

    -- Add phone column
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'organizations' AND column_name = 'phone') THEN
      ALTER TABLE organizations ADD COLUMN phone VARCHAR(50);
    END IF;

  END IF;
END $$;
