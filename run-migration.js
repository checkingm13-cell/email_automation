const fs = require('fs');
const path = require('path');
const db = require('./src/config/db');

async function runMigration() {
    try {
        console.log('🔄 Running database schema migration...');
        const sql = fs.readFileSync(path.join(__dirname, 'src', 'config', 'schema_update.sql'), 'utf-8');
        
        // Check if existing campaigns table exists and has old schema
        const [tables] = await db.query("SHOW TABLES LIKE 'campaigns'");
        if (tables.length > 0) {
            const [oldCols] = await db.query("SHOW COLUMNS FROM campaigns LIKE 'campaign_name'");
            if (oldCols.length > 0) {
                console.log('📦 Backing up legacy campaigns table to campaigns_legacy_backup...');
                await db.query("RENAME TABLE campaigns TO campaigns_legacy_backup");
            }
        }
        // Strip comments and split by statements
        const cleanedSql = sql
            .split('\n')
            .map(line => line.trim().startsWith('--') ? '' : line)
            .join('\n');

        const statements = cleanedSql
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const stmt of statements) {
            await db.query(stmt);
        }

        // Ensure columns exist if table was already created earlier
        try {
            const [cols] = await db.query("SHOW COLUMNS FROM campaigns LIKE 'spreadsheet_url'");
            if (cols.length === 0) {
                console.log('➕ Adding spreadsheet_url column to campaigns table...');
                await db.query("ALTER TABLE campaigns ADD COLUMN spreadsheet_url TEXT NULL AFTER spreadsheet_title");
            }
            await db.query("ALTER TABLE campaigns MODIFY COLUMN spreadsheet_title VARCHAR(255) NULL");
        } catch (colErr) {
            console.warn('Column update warning:', colErr.message);
        }

        console.log('✅ Schema migration completed successfully.');
        process.exit(0);
    } catch (err) {
        console.error('❌ Migration failed:', err.message);
        process.exit(1);
    }
}

runMigration();
