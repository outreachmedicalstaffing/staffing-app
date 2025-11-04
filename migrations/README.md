# Database Migrations

This folder contains SQL migration files for the database schema.

## Running Migrations

### Option 1: Using psql (Recommended for production)

If you have `psql` installed and access to your database:

```bash
psql $DATABASE_URL -f migrations/001_add_groups_table.sql
```

### Option 2: Using database GUI tool

Copy the SQL from the migration file and run it in your database management tool (e.g., pgAdmin, DBeaver, Neon Console).

### Option 3: Using Drizzle Kit Push (Development only)

For local development, you can use Drizzle Kit to automatically sync schema changes:

```bash
npm run db:push
```

**Note:** This requires DATABASE_URL environment variable to be set.

## Migration Files

- `001_add_groups_table.sql` - Creates the groups table with categories and metadata tracking

## After Running Migrations

Restart your application server to ensure all schema changes are recognized.
