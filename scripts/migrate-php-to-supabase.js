/**
 * scripts/migrate-php-to-supabase.js
 * 
 * Migrates campaigns from local MySQL to Supabase PostgreSQL.
 * Synchronizes Postgres sequence after migration.
 */
require('dotenv').config();
const mysql = require('mysql2/promise');
const { Client } = require('pg');

async function migrate() {
    console.log('🚀 Starting migration from MySQL to Supabase PostgreSQL...');

    if (!process.env.DATABASE_URL) {
        console.error('❌ Error: DATABASE_URL environment variable is not set.');
        process.exit(1);
    }

    let mysqlConn = null;
    let pgClient = null;

    try {
        console.log('Connecting to MySQL...');
        mysqlConn = await mysql.createConnection({
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PASSWORD || '',
            database: process.env.DB_NAME || 'email_automation_db',
            port: Number(process.env.DB_PORT) || 3306
        });
        console.log('✅ Connected to MySQL.');

        console.log('Connecting to PostgreSQL / Supabase...');
        pgClient = new Client({
            connectionString: process.env.DATABASE_URL,
            ssl: process.env.DATABASE_URL.includes('localhost') ? false : { rejectUnauthorized: false }
        });
        await pgClient.connect();
        console.log('✅ Connected to Supabase PostgreSQL.');

        console.log('Fetching campaigns from MySQL...');
        const [rows] = await mysqlConn.query('SELECT * FROM campaigns ORDER BY id ASC');
        console.log(`Found ${rows.length} campaign(s) in MySQL.`);

        if (rows.length > 0) {
            const insertQuery = `
                INSERT INTO campaigns (
                    id, spreadsheet_title, spreadsheet_url, recipient_column,
                    subject, body_template, scheduled_at, status,
                    sender_email, chrome_profile, started_at, completed_at,
                    last_error, created_at
                ) VALUES (
                    $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14
                )
                ON CONFLICT (id) DO UPDATE SET
                    spreadsheet_title = EXCLUDED.spreadsheet_title,
                    spreadsheet_url = EXCLUDED.spreadsheet_url,
                    recipient_column = EXCLUDED.recipient_column,
                    subject = EXCLUDED.subject,
                    body_template = EXCLUDED.body_template,
                    scheduled_at = EXCLUDED.scheduled_at,
                    status = EXCLUDED.status,
                    sender_email = EXCLUDED.sender_email,
                    chrome_profile = EXCLUDED.chrome_profile,
                    started_at = EXCLUDED.started_at,
                    completed_at = EXCLUDED.completed_at,
                    last_error = EXCLUDED.last_error,
                    created_at = EXCLUDED.created_at;
            `;

            let migratedCount = 0;
            for (const row of rows) {
                const values = [
                    row.id,
                    row.spreadsheet_title || null,
                    row.spreadsheet_url || null,
                    row.recipient_column || 'email',
                    row.subject,
                    row.body_template,
                    row.scheduled_at,
                    row.status || 'PENDING',
                    row.sender_email || null,
                    row.chrome_profile || null,
                    row.started_at || null,
                    row.completed_at || null,
                    row.last_error || null,
                    row.created_at || new Date()
                ];

                await pgClient.query(insertQuery, values);
                migratedCount++;
            }
            console.log(`✅ Migrated ${migratedCount} campaign(s) to PostgreSQL.`);
        }

        // Synchronize sequence with campaigns_id_seq
        console.log('Synchronizing PostgreSQL sequence...');
        const seqResult = await pgClient.query("SELECT setval('campaigns_id_seq', COALESCE((SELECT MAX(id) FROM campaigns), 1));");
        const nextVal = seqResult.rows[0]?.setval;
        console.log(`✅ Sequence 'campaigns_id_seq' synchronized to: ${nextVal}`);

        console.log('🎉 Migration completed successfully.');
    } catch (error) {
        console.error('❌ Migration failed:', error.message);
        process.exit(1);
    } finally {
        if (mysqlConn) {
            await mysqlConn.end().catch(() => {});
        }
        if (pgClient) {
            await pgClient.end().catch(() => {});
        }
    }
}

if (require.main === module) {
    migrate();
}

module.exports = { migrate };
