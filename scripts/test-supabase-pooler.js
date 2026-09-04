const { Client } = require('pg');

const regions = ['ap-south-1', 'ap-southeast-1', 'us-east-1', 'us-west-1', 'eu-west-1', 'eu-central-1'];
const password = process.env.SUPABASE_PASSWORD || 'y3IlnfmJcii8fYpI';
const projectRef = 'pipgorampefcpdxkqcgd';

(async () => {
    for (const reg of regions) {
        // Try session mode port 5432 and transaction mode 6543
        for (const port of [5432, 6543]) {
            const host = `aws-0-${reg}.pooler.supabase.com`;
            const connStr = `postgresql://postgres.${projectRef}:${password}@${host}:${port}/postgres`;
            const client = new Client({
                connectionString: connStr,
                ssl: { rejectUnauthorized: false },
                connectionTimeoutMillis: 4000
            });
            try {
                await client.connect();
                console.log(`✅ CONNECTED TO SUPABASE POOLER! Region: ${reg}, Port: ${port}`);
                const res = await client.query('SELECT COUNT(*) AS count FROM campaigns');
                console.log(`✅ Table campaigns has ${res.rows[0].count} rows!`);
                await client.end();
                console.log(`FOUND_CONNECTION_STRING=${connStr}`);
                process.exit(0);
            } catch (err) {
                // Ignore and try next
            }
        }
    }
    console.error('❌ Could not connect to any pooler region.');
    process.exit(1);
})();
