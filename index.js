/**
 * index.js - Master Control Entry Point
 * 
 * Coordinates:
 * - Express Web Dashboard on port 3000
 * - Supabase PostgreSQL Database pooling
 * - Background Cron Campaign Scheduler
 * - Graceful shutdown and process signal handling
 */

require('dotenv').config();
const app = require('./src/app');
const db = require('./src/config/db');
const campaignScheduler = require('./src/services/campaignScheduler');

// CLI Flag Handling
const args = process.argv.slice(2);

if (args.includes('--status')) {
    (async () => {
        console.log('\n🔍 Running Gmail Mail Merge CLI Diagnostics...');
        try {
            await db.query('SELECT 1 + 1 AS solution');
            console.log('✅ Database Connection: CONNECTED (Supabase PostgreSQL)');
            const [counts] = await db.query(`
                SELECT 
                    SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                    SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) AS running,
                    SUM(CASE WHEN status = 'COMPLETED' THEN 1 ELSE 0 END) AS completed,
                    SUM(CASE WHEN status = 'FAILED' THEN 1 ELSE 0 END) AS failed
                FROM campaigns
            `);
            console.log('📊 Campaign Stats:');
            console.log(`   - Pending   : ${counts[0]?.pending || 0}`);
            console.log(`   - Running   : ${counts[0]?.running || 0}`);
            console.log(`   - Completed : ${counts[0]?.completed || 0}`);
            console.log(`   - Failed    : ${counts[0]?.failed || 0}`);
            console.log(`📡 Outbound Route: ${process.env.PROXY_SERVER ? 'Proxy' : 'Direct Broadband'}`);
        } catch (err) {
            console.error('❌ Database Connection FAILED:', err.message);
        } finally {
            if (db && db.end) await db.end().catch(() => {});
            process.exit(0);
        }
    })();
    return;
}

const triggerIndex = args.indexOf('--trigger');
if (triggerIndex !== -1 && args[triggerIndex + 1]) {
    const campaignId = Number(args[triggerIndex + 1]);
    (async () => {
        console.log(`\n⚡ Triggering Campaign #${campaignId} via CLI...`);
        try {
            await campaignScheduler.runCampaign(campaignId);
            console.log(`✅ Campaign #${campaignId} execution finished.`);
        } catch (err) {
            console.error(`❌ Campaign #${campaignId} failed:`, err.message);
        } finally {
            if (db && db.end) await db.end().catch(() => {});
            process.exit(0);
        }
    })();
    return;
}

// Inject universal DB pool into app
app.set('db', db);

const PORT = process.env.PORT || 3000;

const server = app.listen(PORT, async () => {
    console.log('\n======================================================');
    console.log('🚀 Gmail Native Mail Merge - Operations Control Center');
    console.log(`🌐 Dashboard URL  : http://localhost:${PORT}`);
    console.log(`📁 Environment    : ${process.env.NODE_ENV || 'local-production'}`);
    console.log(`📡 Outbound Route : Direct Residential Broadband`);
    console.log('======================================================\n');

    // Recover any stale running campaigns from previous unexpected exits
    await campaignScheduler.recoverStaleOnBoot();

    // Start background cron scheduler (polls every 1 minute)
    campaignScheduler.start();
});

// Clean, graceful shutdown
function gracefulShutdown(signal) {
    console.log(`\n🛑 Received ${signal}. Shutting down cleanly...`);
    campaignScheduler.stop();
    server.close(() => {
        console.log('✅ Web server closed.');
        if (db && db.end) {
            db.end().catch(() => {});
        }
        console.log('👋 Control Center stopped.');
        process.exit(0);
    });
}

process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
