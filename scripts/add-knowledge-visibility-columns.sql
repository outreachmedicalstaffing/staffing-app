-- Migration: Add visibility columns to knowledge_articles table
-- This script is safe to run multiple times - it will only add columns if they don't exist

-- Add visibility column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_articles' AND column_name = 'visibility'
  ) THEN
    ALTER TABLE knowledge_articles ADD COLUMN visibility TEXT NOT NULL DEFAULT 'all';
    RAISE NOTICE 'Added visibility column';
  ELSE
    RAISE NOTICE 'visibility column already exists';
  END IF;
END $$;

-- Add target_group_ids column if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'knowledge_articles' AND column_name = 'target_group_ids'
  ) THEN
    ALTER TABLE knowledge_articles ADD COLUMN target_group_ids TEXT[];
    RAISE NOTICE 'Added target_group_ids column';
  ELSE
    RAISE NOTICE 'target_group_ids column already exists';
  END IF;
END $$;
