-- Migration: Add groups table
-- Created: 2025-11-04
-- Description: Creates the groups table for managing user groups with categories

CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  member_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  assignment_ids TEXT[] DEFAULT ARRAY[]::TEXT[],
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);

-- Create index on name for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_name ON groups(name);
