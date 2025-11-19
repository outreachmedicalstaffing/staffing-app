import { pool } from '../server/db';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function migrateKnowledgeVisibility() {
  console.log('🔄 Starting Knowledge Base visibility migration...\n');

  try {
    // Read the SQL migration file
    const sqlPath = join(__dirname, 'add-knowledge-visibility-columns.sql');
    const sql = readFileSync(sqlPath, 'utf-8');

    console.log('📝 Executing migration SQL...');
    const result = await pool.query(sql);

    console.log('\n✅ Migration completed successfully!');
    console.log('📊 Result:', result);

    // Verify the columns exist
    console.log('\n🔍 Verifying columns...');
    const checkResult = await pool.query(`
      SELECT column_name, data_type, column_default
      FROM information_schema.columns
      WHERE table_name = 'knowledge_articles'
      AND column_name IN ('visibility', 'target_group_ids')
      ORDER BY column_name;
    `);

    if (checkResult.rows.length === 2) {
      console.log('✅ Columns verified:');
      checkResult.rows.forEach(row => {
        console.log(`  - ${row.column_name}: ${row.data_type} (default: ${row.column_default || 'none'})`);
      });
    } else {
      console.log('⚠️ Warning: Expected 2 columns, found', checkResult.rows.length);
    }

  } catch (error) {
    console.error('❌ Migration failed:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

migrateKnowledgeVisibility();
