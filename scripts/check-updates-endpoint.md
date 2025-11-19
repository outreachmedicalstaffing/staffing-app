# Database Updates Diagnostic

This file documents how to check if updates exist in the database.

## Method 1: Add a diagnostic endpoint to the server

Add this endpoint to `server/routes.ts`:

```typescript
// Diagnostic endpoint - remove after investigation
app.get("/api/diagnostic/updates", requireAuth, requireRole("Owner", "Admin"), async (req, res) => {
  try {
    // Count total updates
    const countResult = await storage.db
      .select({ count: sql<number>`count(*)` })
      .from(schema.updates);

    const totalCount = countResult[0]?.count || 0;

    // Get all updates
    const updates = await storage.db
      .select({
        id: schema.updates.id,
        title: schema.updates.title,
        status: schema.updates.status,
        visibility: schema.updates.visibility,
        createdAt: schema.updates.createdAt,
        publishDate: schema.updates.publishDate,
      })
      .from(schema.updates)
      .orderBy(desc(schema.updates.createdAt))
      .limit(20);

    res.json({
      totalCount,
      updates,
      tableExists: true
    });
  } catch (error: any) {
    res.status(500).json({
      error: error.message,
      stack: error.stack
    });
  }
});
```

Then navigate to: `http://localhost:5000/api/diagnostic/updates`

## Method 2: Check Replit database directly

If on Replit:
1. Open the Database tab
2. Click "Console"
3. Run:
```sql
SELECT COUNT(*) FROM updates;
SELECT id, title, status, created_at FROM updates ORDER BY created_at DESC LIMIT 10;
```

## Expected Results

If updates exist, you should see:
- totalCount: 6
- updates array with entries like:
  - "Vitas Patient Expiration Update - Midstate"
  - "Vitas Patient Expiration Update - Citrus"
  - "AdventHealth Hospice Training in Altamonte Springs"
  - "Vitas After-Hours Phone Number"

If totalCount is 0, the data has been lost and may need to be restored from backup.
