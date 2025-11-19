import { pool } from '../server/db';

async function checkUpdates() {
  console.log('========================================');
  console.log('CHECKING UPDATES TABLE IN DATABASE');
  console.log('========================================\n');

  try {
    // Query 1: Count total updates
    console.log('1. Counting total updates in database...');
    const countResult = await pool.query('SELECT COUNT(*) as count FROM updates');
    const totalCount = parseInt(countResult.rows[0].count);
    console.log(`   Total updates in database: ${totalCount}\n`);

    if (totalCount === 0) {
      console.log('⚠️  WARNING: No updates found in database!');
      console.log('   The updates table is empty. Data may have been deleted.\n');

      // Check if table exists
      console.log('2. Verifying table structure...');
      const tableCheck = await pool.query(`
        SELECT column_name, data_type
        FROM information_schema.columns
        WHERE table_name = 'updates'
        ORDER BY ordinal_position
      `);

      console.log('   Table columns:');
      tableCheck.rows.forEach(col => {
        console.log(`   - ${col.column_name}: ${col.data_type}`);
      });

      await pool.end();
      return;
    }

    // Query 2: Get all updates with details
    console.log('2. Fetching all updates...');
    const updatesResult = await pool.query(`
      SELECT
        id,
        title,
        status,
        visibility,
        created_by,
        created_at,
        updated_at,
        publish_date
      FROM updates
      ORDER BY created_at DESC
      LIMIT 20
    `);

    console.log(`   Found ${updatesResult.rows.length} updates:\n`);

    updatesResult.rows.forEach((update, index) => {
      console.log(`   ${index + 1}. ${update.title}`);
      console.log(`      ID: ${update.id}`);
      console.log(`      Status: ${update.status}`);
      console.log(`      Visibility: ${update.visibility}`);
      console.log(`      Created: ${update.created_at}`);
      console.log(`      Published: ${update.publish_date}`);
      console.log('');
    });

    // Query 3: Check for specific titles the user mentioned
    console.log('3. Searching for specific known updates...');
    const knownTitles = [
      'Vitas Patient Expiration Update - Midstate',
      'Vitas Patient Expiration Update - Citrus',
      'AdventHealth Hospice Training',
      'Vitas After-Hours Phone Number'
    ];

    for (const title of knownTitles) {
      const searchResult = await pool.query(
        'SELECT id, title, status FROM updates WHERE title ILIKE $1',
        [`%${title}%`]
      );

      if (searchResult.rows.length > 0) {
        console.log(`   ✅ FOUND: "${title}"`);
        searchResult.rows.forEach(row => {
          console.log(`      ID: ${row.id}, Status: ${row.status}`);
        });
      } else {
        console.log(`   ❌ NOT FOUND: "${title}"`);
      }
    }

    console.log('\n========================================');
    console.log('DIAGNOSIS COMPLETE');
    console.log('========================================\n');

    await pool.end();

  } catch (error) {
    console.error('ERROR querying database:', error);
    await pool.end();
    process.exit(1);
  }
}

checkUpdates();
