require('dotenv').config();
const db = require('../config/db');
const GoogleSheetsService = require('../services/googleSheetsService');
const EmailService = require('../services/emailService');
const UnsubscribeService = require('../services/unsubscribeService');

// Helper: Async Pool for controlled parallel processing
async function asyncPool(poolLimit, array, iteratorFn) {
    const ret = [];
    const executing = [];
    for (const item of array) {
        const p = Promise.resolve().then(() => iteratorFn(item));
        ret.push(p);
        if (poolLimit <= array.length) {
            const e = p.then(() => executing.splice(executing.indexOf(e), 1));
            executing.push(e);
            if (executing.length >= poolLimit) {
                await Promise.race(executing); // Wait for one to finish before starting another
            }
        }
    }
    return Promise.all(ret);
}

class CampaignWorker {
    static async processCampaign(campaignId) {
        console.log(`\n🚀 Starting Campaign Worker (Async Parallel) for Campaign ID: ${campaignId}\n`);

        try {
            // 1. Fetch Campaign and Google Sheet details
            const [campaignRows] = await db.query(`
        SELECT c.*, gs.spreadsheet_id, gs.worksheet_name 
        FROM campaigns c
        JOIN google_sheets gs ON c.google_sheet_id = gs.id
        WHERE c.id = ?
      `, [campaignId]);

            if (campaignRows.length === 0) {
                throw new Error(`Campaign ID ${campaignId} not found.`);
            }

            const campaign = campaignRows[0];
            console.log(`📋 Campaign: ${campaign.campaign_name}`);

            // 2. Update Campaign Status
            await db.query(`UPDATE campaigns SET status = 'processing', started_at = NOW() WHERE id = ?`, [campaignId]);
            console.log('✅ Campaign status updated to "processing".\n');

            // 3. Read and Validate Google Sheet Data
            console.log('📖 Reading Google Sheet...');
            const validRows = await GoogleSheetsService.getSheetData(campaign.spreadsheet_id, `${campaign.worksheet_name}!A:Z`);
            console.log(`✅ Found ${validRows.length} valid rows to process.\n`);

            if (validRows.length === 0) {
                console.log('⚠️ No valid rows to process. Finishing.');
                await db.query(`UPDATE campaigns SET status = 'completed', completed_at = NOW() WHERE id = ?`, [campaignId]);
                return;
            }

            // 4. Process rows in PARALLEL with a concurrency limit
            // Limit set to 5 to prevent Gmail API "429 Too Many Requests" errors
            const concurrencyLimit = 5;
            console.log(`⚡ Processing up to ${concurrencyLimit} emails concurrently...\n`);

            const results = await asyncPool(concurrencyLimit, validRows, async (row) => {
                try {
                    console.log(`➡️  Processing Row ${row._rowNumber}: ${row.email}`);

                    // A. Check Unsubscribes
                    const [unsubRows] = await db.query('SELECT id FROM unsubscribes WHERE email = ?', [row.email]);
                    if (unsubRows.length > 0) {
                        console.log(`   ⏭️  Skipped: Unsubscribed`);
                        await this.logResult(campaignId, row, 'unsubscribed', null, 'Unsubscribed');
                        await this.updateSheetStatus(campaign.spreadsheet_id, campaign.worksheet_name, row._rowNumber, 'Unsubscribed');
                        return 'skipped';
                    }

                    // B. Check for Duplicates
                    const [logRows] = await db.query(
                        'SELECT id, status FROM campaign_logs WHERE campaign_id = ? AND email = ?',
                        [campaignId, row.email]
                    );

                    if (logRows.length > 0 && logRows[0].status === 'sent') {
                        console.log(`   ⏭️  Skipped: Already Sent`);
                        await this.updateSheetStatus(campaign.spreadsheet_id, campaign.worksheet_name, row._rowNumber, 'Already Sent');
                        return 'skipped';
                    }

                    // C. Fetch Template
                    const [templateRows] = await db.query('SELECT * FROM templates WHERE template_name = ?', [row.templateName]);
                    if (templateRows.length === 0) {
                        throw new Error(`Template '${row.templateName}' not found`);
                    }
                    const template = templateRows[0];

                    // D. Generate Unsubscribe Token & URL
                    // D. Generate Unsubscribe Token & Smart Dynamic URL
                    const token = await UnsubscribeService.generateToken(row.email, campaignId);

                    // 1. Extract domain from the sender's email (e.g., 'worldwidejournals.co.in' or 'gmail.com')
                    const senderDomain = campaign.sender_email.split('@')[1];

                    // 2. Get your actual app's domain from .env (e.g., 'worldwidejournals.co.in' or 'localhost')
                    const appUrl = new URL(process.env.BASE_URL);
                    const appDomain = appUrl.hostname;
                    const protocol = appUrl.protocol.replace(':', ''); // 'https' or 'http'

                    // 3. CRITICAL: If the sender is a free public email (gmail, yahoo, etc.), 
                    // we MUST use your app's actual domain, otherwise the link will be dead.
                    // If it's a custom business domain, we use the sender's domain for perfect branding.
                    const freeEmailProviders = ['gmail.com', 'yahoo.com', 'outlook.com', 'hotmail.com', 'aol.com'];
                    const finalDomain = freeEmailProviders.includes(senderDomain) ? appDomain : senderDomain;

                    const unsubscribeUrl = `${protocol}://${finalDomain}/unsubscribe/${token}`;

                    console.log(`   🔗 Unsubscribe URL: ${unsubscribeUrl}`);
                    // E. Personalize Content (Name only; Footer is auto-injected by EmailService)
                    const rawHtml = template.html_content || '<p>Hello {{Name}}</p>';
                    const rawText = template.text_content || 'Hello {{Name}}';

                    const finalHtml = rawHtml.replace(/\{\{Name\}\}/gi, row.name || 'Subscriber');
                    const finalText = rawText.replace(/\{\{Name\}\}/gi, row.name || 'Subscriber');

                    // F. Log as 'processing'
                    await this.logResult(campaignId, row, 'processing', null, 'Sending...');

                    // G. Send Email via Unified EmailService (Handles BOTH Workspace & Personal Gmail)
                    console.log(`   📤 Sending...`);
                    const sendResult = await EmailService.sendEmail({
                        to: row.email,
                        subject: template.subject || 'No Subject',
                        htmlContent: finalHtml,
                        textContent: finalText,
                        recipientName: row.name,
                        senderEmail: campaign.sender_email,
                        senderRefreshToken: campaign.sender_refresh_token,
                        unsubscribeUrl: unsubscribeUrl,
                    });

                    // H. Handle Result
                    if (sendResult && sendResult.success) {
                        console.log(`   ✅ Success: ${row.email} (ID: ${sendResult.messageId})`);
                        await this.logResult(campaignId, row, 'sent', sendResult.messageId, null);
                        await this.updateSheetStatus(campaign.spreadsheet_id, campaign.worksheet_name, row._rowNumber, 'Sent');
                        return 'sent';
                    } else {
                        const errMsg = sendResult ? sendResult.error : 'Unknown send error';
                        console.log(`   ❌ Failed: ${errMsg}`);
                        await this.logResult(campaignId, row, 'failed', null, errMsg);
                        await this.updateSheetStatus(campaign.spreadsheet_id, campaign.worksheet_name, row._rowNumber, `Failed: ${errMsg.substring(0, 30)}`);
                        return 'failed';
                    }

                } catch (rowError) {
                    console.log(`   💥 Row Error: ${row.email} - ${rowError.message}`);
                    await this.logResult(campaignId, row, 'failed', null, rowError.message);
                    await this.updateSheetStatus(campaign.spreadsheet_id, campaign.worksheet_name, row._rowNumber, `Failed: ${rowError.message.substring(0, 30)}`);
                    return 'failed';
                }
            });
            // 5. Aggregate and Finalize
            const successCount = results.filter(r => r === 'sent').length;
            const failedCount = results.filter(r => r === 'failed').length;
            const skippedCount = results.filter(r => r === 'skipped').length;

            console.log('\n🏁 Campaign Processing Complete!');
            console.log(`   ✅ Sent: ${successCount}`);
            console.log(`   ❌ Failed: ${failedCount}`);
            console.log(`   ⏭️  Skipped: ${skippedCount}`);

            await db.query(
                `UPDATE campaigns SET status = 'completed', completed_at = NOW() WHERE id = ?`,
                [campaignId]
            );

        } catch (error) {
            console.error('\n💥 Fatal Campaign Error:', error.message);
            await db.query(
                `UPDATE campaigns SET status = 'failed', completed_at = NOW() WHERE id = ?`,
                [campaignId]
            );
        }
    }

    static async logResult(campaignId, row, status, messageId, errorMessage) {
        const [existing] = await db.query(
            'SELECT id, attempt_count FROM campaign_logs WHERE campaign_id = ? AND email = ?',
            [campaignId, row.email]
        );

        if (existing.length > 0) {
            await db.query(`
        UPDATE campaign_logs 
        SET status = ?, gmail_message_id = ?, error_message = ?, attempt_count = attempt_count + 1, sent_at = NOW()
        WHERE id = ?
      `, [status, messageId, errorMessage, existing[0].id]);
        } else {
            await db.query(`
        INSERT INTO campaign_logs 
        (campaign_id, email, recipient_name, template_name, status, gmail_message_id, error_message, attempt_count, sent_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, 1, NOW())
      `, [campaignId, row.email, row.name, row.templateName, status, messageId, errorMessage]);
        }
    }

    static async updateSheetStatus(spreadsheetId, worksheetName, rowNumber, statusText) {
        try {
            const cellRange = `${worksheetName}!D${rowNumber}`;
            await GoogleSheetsService.updateCell(spreadsheetId, cellRange, statusText);
        } catch (error) {
            console.error(`   ⚠️  Warning: Could not update Sheet cell ${worksheetName}!D${rowNumber}: ${error.message}`);
        }
    }
}

if (require.main === module) {
    const campaignId = process.argv[2];
    if (!campaignId) {
        console.error('Usage: node src/workers/campaignWorker.js <campaign_id>');
        process.exit(1);
    }

    CampaignWorker.processCampaign(campaignId).finally(() => {
        db.end();
    });
}

module.exports = CampaignWorker;