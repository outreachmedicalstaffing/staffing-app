# Knowledge Base Visibility Migration Instructions

## Overview
This migration adds visibility controls to Knowledge Base articles, allowing articles to be targeted to specific programs.

## What This Migration Does
Adds two columns to the `knowledge_articles` table:
- `visibility` (TEXT, default: 'all')
- `target_group_ids` (TEXT[])

The migration script is **safe to run multiple times** - it will only add columns if they don't exist.

## How to Run the Migration

### Option 1: Run in Replit (Recommended)
1. Open the Replit Shell
2. Run: `npm run db:migrate-knowledge-visibility`
3. The script will:
   - Check if columns exist
   - Add them if they don't exist
   - Verify the columns were created

### Option 2: Run SQL Directly
If you have direct access to the Neon PostgreSQL database:
1. Copy the contents of `scripts/add-knowledge-visibility-columns.sql`
2. Run it in your PostgreSQL client or Neon SQL Editor

## After Migration
Once the migration completes successfully:
- The schema, UI, and backend code are already updated
- Owner/Admin will see ALL articles (no filtering)
- Regular users will see articles based on visibility settings
- Existing articles without visibility will display normally (treated as "all")

## Verification
After running, you should see output like:
```
✅ Migration completed successfully!
✅ Columns verified:
  - target_group_ids: ARRAY (default: none)
  - visibility: text (default: 'all'::text)
```

## Rollback (if needed)
If you need to remove the columns:
```sql
ALTER TABLE knowledge_articles DROP COLUMN IF EXISTS visibility;
ALTER TABLE knowledge_articles DROP COLUMN IF EXISTS target_group_ids;
```
