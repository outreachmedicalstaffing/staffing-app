-- Migration: Add groups table
-- Created: 2025-11-04
-- Description: Creates the groups table for managing user groups with categories and metadata

CREATE TABLE IF NOT EXISTS groups (
  id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  created_by VARCHAR NOT NULL REFERENCES users(id),
  administered_by VARCHAR NOT NULL REFERENCES users(id),
  created_at TIMESTAMP NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

-- Create index on category for faster filtering
CREATE INDEX IF NOT EXISTS idx_groups_category ON groups(category);

-- Create index on created_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_created_by ON groups(created_by);

-- Create index on administered_by for faster lookups
CREATE INDEX IF NOT EXISTS idx_groups_administered_by ON groups(administered_by);
