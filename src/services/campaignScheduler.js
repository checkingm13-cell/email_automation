const cron = require('node-cron');
const db = require('../config/db');
const GmailMailMergeWorker = require('../workers/gmailMailMergeWorker');

class CampaignScheduler {
    constructor() {
        this.isProcessing = false;
        this.cronJob = null;
    }

    /**
     * Starts the cron scheduler
     */
    start() {
        if (this.cronJob) {
            console.log('⚠️ Campaign scheduler is already running.');
            return;
        }

        console.log('⏰ Starting Campaign Cron Scheduler (Polls every 1 minute)...');
        
        // Schedule every minute
        this.cronJob = cron.schedule('* * * * *', async () => {
            await this.processDueCampaigns();
        });

        // Run an immediate check on startup
        this.processDueCampaigns().catch(err => {
            console.error('Error during initial campaign scheduler check:', err.message);
        });
    }

    /**
     * Stops the cron scheduler
     */
    stop() {
        if (this.cronJob) {
            this.cronJob.stop();
            this.cronJob = null;
            console.log('🛑 Campaign scheduler stopped.');
        }
    }

    /**
     * Fails any stale RUNNING jobs on server startup to prevent duplicate sending
     */
    async recoverStaleOnBoot() {
        try {
            const [result] = await db.query(`
                UPDATE campaigns 
                SET status = 'FAILED', 
                    last_error = 'Server stopped during execution',
                    completed_at = NOW()
                WHERE status = 'RUNNING'
            `);
            if (result.affectedRows > 0) {
                console.log(`🧹 Cleaned up ${result.affectedRows} stale RUNNING campaign(s) on startup -> marked as FAILED.`);
            }
        } catch (err) {
            console.error('Error recovering stale jobs on boot:', err.message);
        }
    }

    /**
     * Polls the database for due campaigns (1 at a time) and processes sequentially
     */
    async processDueCampaigns() {
        // Enforce sequential lock to ensure only 1 Playwright session runs at a time
        if (this.isProcessing) {
            console.log('🔒 Scheduler is already processing a campaign. Skipping tick.');
            return;
        }

        this.isProcessing = true;

        try {
            // Find next due campaign: 1 at a time
            const [dueCampaigns] = await db.query(`
                SELECT * FROM campaigns 
                WHERE status = 'PENDING' 
                  AND scheduled_at <= NOW() 
                ORDER BY scheduled_at ASC
                LIMIT 1
            `);

            if (dueCampaigns.length === 0) {
                return;
            }

            const campaign = dueCampaigns[0];
            console.log(`\n📋 Found due campaign #${campaign.id} ready for execution.`);

            await this.runCampaign(campaign.id);

        } catch (error) {
            console.error('❌ Scheduler Error:', error.message);
        } finally {
            this.isProcessing = false;
        }
    }

    /**
     * Runs a single campaign immediately
     * @param {number} campaignId 
     */
    async runCampaign(campaignId) {
        try {
            // Fetch campaign
            const [rows] = await db.query('SELECT * FROM campaigns WHERE id = ?', [campaignId]);
            if (rows.length === 0) {
                console.warn(`Campaign #${campaignId} not found.`);
                return;
            }

            const campaign = rows[0];

            if (campaign.status === 'RUNNING' || campaign.status === 'COMPLETED') {
                console.log(`Campaign #${campaignId} is already ${campaign.status}. Skipping.`);
                return;
            }

            // 1. Mark status as RUNNING
            await db.query(
                `UPDATE campaigns SET status = 'RUNNING', started_at = NOW(), last_error = NULL WHERE id = ?`,
                [campaignId]
            );

            // 2. Execute via Playwright Worker
            await GmailMailMergeWorker.executeCampaign(campaign);

            // 3. Mark as COMPLETED
            await db.query(
                `UPDATE campaigns SET status = 'COMPLETED', completed_at = NOW() WHERE id = ?`,
                [campaignId]
            );

            console.log(`✨ [Campaign #${campaignId}] Successfully processed and marked COMPLETED.`);

        } catch (error) {
            console.error(`💥 [Campaign #${campaignId}] Execution failed:`, error.message);

            const lastError = error.screenshotPath 
                ? `${error.message} | Screenshot: ${error.screenshotPath}`
                : (error.message || 'Unknown execution failure');

            await db.query(
                `UPDATE campaigns SET status = 'FAILED', completed_at = NOW(), last_error = ? WHERE id = ?`,
                [lastError, campaignId]
            );
        }
    }
}

// Export singleton instance
module.exports = new CampaignScheduler();
