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
