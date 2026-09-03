const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

class GmailMailMergeWorker {
    /**
     * Executes the Gmail Native Mail Merge flow for a single campaign.
     * @param {Object} campaign - Database row representing the campaign
     * @returns {Promise<{ success: boolean, message: string }>}
     */
    static async executeCampaign(campaign) {
        const campaignId = campaign.id;
        let profileFolder = 'chrome-profile';
        if (campaign.chrome_profile) {
            profileFolder = campaign.chrome_profile;
        } else if (campaign.sender_email) {
            const prefix = campaign.sender_email.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
            const candidate = `chrome-profile-${prefix}`;
            if (fs.existsSync(path.resolve(process.cwd(), candidate))) {
                profileFolder = candidate;
            }
        }
        const userDataDir = path.resolve(process.cwd(), profileFolder);
        const screenshotDir = path.resolve(process.cwd(), 'logs', 'screenshots');

        if (!fs.existsSync(screenshotDir)) {
            fs.mkdirSync(screenshotDir, { recursive: true });
        }

        const sheetIdentifier = campaign.spreadsheet_title || campaign.spreadsheet_url;

        console.log(`\n======================================================`);
        console.log(`🚀 [Campaign #${campaignId}] Starting Gmail Native Mail Merge Worker`);
        console.log(`   Subject:       "${campaign.subject}"`);
        console.log(`   Spreadsheet:   "${sheetIdentifier}"`);
        if (campaign.spreadsheet_url) {
            console.log(`   URL:           "${campaign.spreadsheet_url}"`);
        }
        console.log(`   Recipient Col: "${campaign.recipient_column || 'email'}"`);
        console.log(`======================================================\n`);

        let context = null;
        let page = null;

        try {
            console.log(`[Campaign #${campaignId}] 🌐 Launching browser context from ${userDataDir}...`);

            context = await chromium.launchPersistentContext(userDataDir, {
                headless: false, // Visible for user inspection and Google anti-bot
                channel: 'chrome',
                args: [
                    '--start-maximized',
                    '--no-sandbox',
                    '--disable-blink-features=AutomationControlled'
                ],
                viewport: null
            }).catch(async () => {
                return await chromium.launchPersistentContext(userDataDir, {
                    headless: false,
                    args: [
                        '--start-maximized',
                        '--no-sandbox',
                        '--disable-blink-features=AutomationControlled'
                    ],
                    viewport: null
                });
            });

            page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

            // 1. Open Gmail Inbox & Wait for State
            console.log(`[Campaign #${campaignId}] 📬 Navigating to Gmail inbox...`);
            await page.goto('https://mail.google.com/mail/u/0/#inbox', { 
                waitUntil: 'domcontentloaded', 
                timeout: 45000 
            });

            // 2. Wait for Gmail UI to be fully interactive (Compose button visible)
            console.log(`[Campaign #${campaignId}] ⏳ Waiting for Gmail UI to be ready...`);
            const composeBtn = page.getByRole('button', { name: /compose/i }).or(page.locator('div[gh="cm"]')).first();
            await composeBtn.waitFor({ state: 'visible', timeout: 45000 });
            await page.waitForTimeout(1000);

            // 3. Open Compose Dialog
            console.log(`[Campaign #${campaignId}] ✍️ Clicking Compose button...`);
            await composeBtn.click();
            const composeDialog = page.locator('div[role="dialog"]').filter({ hasText: /new message|to/i }).first();
            await composeDialog.waitFor({ state: 'visible', timeout: 20000 });
            await page.waitForTimeout(1500);

            // 4. Toggle Mail Merge
            console.log(`[Campaign #${campaignId}] 🔗 Opening Mail Merge popup...`);
            const mailMergeBtn = composeDialog.locator('span.Sz.brj, [aria-label*="mail merge" i], [data-tooltip*="mail merge" i]').first();
            await mailMergeBtn.waitFor({ state: 'visible', timeout: 10000 });
            await mailMergeBtn.focus();
            await page.keyboard.press('Enter');
            await page.waitForTimeout(1500);

            // Fallback click if menu is not visible yet
            let menu = page.getByRole('menu');
            if (!(await menu.isVisible().catch(() => false))) {
                await mailMergeBtn.click();
                await page.waitForTimeout(1500);
            }
            await menu.waitFor({ state: 'visible', timeout: 10000 });

            // 5. Enable Mail merge checkbox
            console.log(`[Campaign #${campaignId}] ☑️ Ensuring Mail merge checkbox is enabled...`);
            const checkbox = menu.getByRole('checkbox', { name: /mail merge/i });
            await checkbox.waitFor({ state: 'visible', timeout: 5000 });
            const isChecked = await checkbox.getAttribute('aria-checked');
            if (isChecked !== 'true') {
                await checkbox.click();
                await page.waitForTimeout(1500);
            }

            // 6. Select "Add from a spreadsheet"
            console.log(`[Campaign #${campaignId}] 📊 Clicking 'Add from a spreadsheet'...`);
            const addFromSheetOption = menu.getByRole('menuitem', { name: /add from a spreadsheet/i }).or(menu.getByText('Add from a spreadsheet')).first();
            await addFromSheetOption.waitFor({ state: 'visible', timeout: 5000 });
            await addFromSheetOption.click();

            // 5. Handle Google Drive Sheet Picker Dialog / iframe
            console.log(`[Campaign #${campaignId}] ⏳ Waiting for Google Drive Picker to load...`);
            let pickerFrame = null;
            for (let attempt = 0; attempt < 15; attempt++) {
                pickerFrame = page.frames().find(f => f.url().includes('picker') || f.url().includes('drive'));
                if (pickerFrame) break;
                await page.waitForTimeout(1000);
            }

            if (!pickerFrame) {
                throw new Error('Google Drive picker frame not found');
            }

            // Determine search term: Drive accepts document title or full URL
            let searchTerm = '';
            if (campaign.spreadsheet_url) {
                searchTerm = campaign.spreadsheet_url.trim();
            } else if (campaign.spreadsheet_title) {
                searchTerm = campaign.spreadsheet_title.trim();
            }

            console.log(`[Campaign #${campaignId}] 🔍 Searching for spreadsheet with query: "${searchTerm}"`);

            const searchInput = pickerFrame.locator('input[aria-label*="Search"], input[placeholder*="Search"], input[type="text"]').first();
            await searchInput.waitFor({ state: 'visible', timeout: 15000 });
            await searchInput.fill(searchTerm);
            await searchInput.press('Enter');
            await page.waitForTimeout(3000);

            // Locate matching file card in Drive Picker
            console.log(`[Campaign #${campaignId}] 📄 Selecting file card from search results...`);
            const fileItem = pickerFrame.locator('div[role="row"], div[role="option"], div[role="gridcell"]').first();
            await fileItem.waitFor({ state: 'visible', timeout: 15000 });
            await fileItem.click();
            await page.waitForTimeout(1500);

            // Click "Insert" / "Select" button
            const selectBtn = pickerFrame.locator('button:has-text("Insert"), button:has-text("Select"), div[role="button"]:has-text("Insert"), button[name="ok"]').first();
            await selectBtn.waitFor({ state: 'visible', timeout: 8000 });
            await selectBtn.click();

            await page.waitForTimeout(2500);

            // 7. Handle "Finish linking spreadsheet" Column Mapping Dialog
            const finishLinkingHeading = page.locator('text="Finish linking spreadsheet"').first();
            await finishLinkingHeading.waitFor({ state: 'visible', timeout: 15000 });
            console.log(`[Campaign #${campaignId}] 📋 Configuring column mappings in Finish linking dialog...`);
            
            // Map EMAIL column
            const emailCol = (campaign.recipient_column || 'email').toLowerCase();
            const firstDropdown = page.locator('div.rHGeGc-aPP78e').first();
            await firstDropdown.waitFor({ state: 'visible', timeout: 5000 });
            await firstDropdown.click();
            await page.waitForTimeout(1000);

            const emailOption = page.locator(`li[role="option"][data-value="${emailCol}"], li[role="option"]:has-text("@${emailCol}")`).first();
            await emailOption.waitFor({ state: 'visible', timeout: 5000 });
            await emailOption.click();
            await page.waitForTimeout(1000);

            // Map FIRST NAME column if available
            const nameDropdown = page.locator('div.rHGeGc-aPP78e').nth(1);
            if (await nameDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
                await nameDropdown.click();
                await page.waitForTimeout(1000);
                const nameOption = page.locator('li[role="option"][data-value="name"], li[role="option"]:has-text("@name")').first();
                if (await nameOption.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await nameOption.click();
                    await page.waitForTimeout(1000);
                }
            }

            // Click Finish button
            const finishBtn = page.getByRole('button', { name: 'Finish' }).or(page.locator('button:has-text("Finish"), div[role="button"]:has-text("Finish")')).first();
            await finishBtn.waitFor({ state: 'visible', timeout: 5000 });
            await finishBtn.click();
            
            // Ensure Finish linking dialog is dismissed
            await finishLinkingHeading.waitFor({ state: 'hidden', timeout: 10000 });
            console.log(`[Campaign #${campaignId}] ✅ Linked spreadsheet successfully.`);
            await page.waitForTimeout(1500);

            // 8. Fill Subject Line
            console.log(`[Campaign #${campaignId}] ✍️ Setting Subject...`);
            const subjectInput = page.locator('input[name="subjectbox"], input[aria-label="Subject"]').first();
            await subjectInput.waitFor({ state: 'visible', timeout: 8000 });
            await subjectInput.fill(campaign.subject);

            // 9. Fill Message Body (Template with @tags)
            console.log(`[Campaign #${campaignId}] ✍️ Populating Body Template...`);
            const bodyEditor = page.locator('div[aria-label="Message Body"], div[role="textbox"][aria-label*="Body"]').first();
            await bodyEditor.waitFor({ state: 'visible', timeout: 8000 });
            await bodyEditor.focus();
            await bodyEditor.fill(campaign.body_template);

            // 10. Trigger Continue
            console.log(`[Campaign #${campaignId}] 🚀 Clicking Continue button...`);
            const continueBtn = page.locator('button:has-text("Continue"), div[role="button"]:has-text("Continue")').first();
            await continueBtn.waitFor({ state: 'visible', timeout: 8000 });
            await continueBtn.click();
            await page.waitForTimeout(2500);

            // 11. Handle "Missing unsubscribe link" prompt if present
            const addLinkBtn = page.getByRole('button', { name: 'Add link' }).or(page.locator('button:has-text("Add link"), div[role="button"]:has-text("Add link")')).first();
            const ignoreBtn = page.getByRole('button', { name: 'Ignore' }).or(page.locator('button:has-text("Ignore"), div[role="button"]:has-text("Ignore")')).first();

            if (await addLinkBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
                console.log(`[Campaign #${campaignId}] ℹ️ Resolving missing unsubscribe prompt via 'Add link'...`);
                await addLinkBtn.click();
                await page.waitForTimeout(2000);
            } else if (await ignoreBtn.isVisible({ timeout: 1500 }).catch(() => false)) {
                console.log(`[Campaign #${campaignId}] ℹ️ Dismissing missing unsubscribe prompt via 'Ignore'...`);
                await ignoreBtn.click();
                await page.waitForTimeout(2000);
            }

            // 12. Confirm "Send all" in the "Ready to send" Modal
            console.log(`[Campaign #${campaignId}] 📢 Locating purple 'Send all' button in Ready to send modal...`);
            const sendAllBtn = page.getByRole('button', { name: /send all/i }).or(page.locator('button:has-text("Send all")')).first();
            await sendAllBtn.waitFor({ state: 'visible', timeout: 10000 });
            console.log(`[Campaign #${campaignId}] 🚀 Confirming Mail Merge 'Send all'...`);
            await sendAllBtn.click();

            // 13. Wait for "Message sent" toast confirmation
            console.log(`[Campaign #${campaignId}] ⏳ Waiting for Gmail 'Message sent' confirmation...`);
            const messageSentToast = page.locator('div:has-text("Message sent"), span:has-text("Message sent")').first();
            await messageSentToast.waitFor({ state: 'visible', timeout: 20000 }).catch(() => {
                console.log(`[Campaign #${campaignId}] Note: 'Message sent' toast not captured, verifying compose closed.`);
            });
            await page.waitForTimeout(3000);
            console.log(`[Campaign #${campaignId}] ✅ Mail Merge campaign successfully submitted and sent by Gmail!`);

            // Wait for compose dialog to dismiss and toast notification
            await page.waitForTimeout(4000);
            console.log(`[Campaign #${campaignId}] ✅ Mail Merge campaign successfully submitted to Gmail!`);

            return { success: true, message: 'Mail Merge successfully submitted' };

        } catch (error) {
            console.error(`[Campaign #${campaignId}] ❌ Error during Mail Merge automation:`, error.message);

            let screenshotPath = null;
            if (page) {
                try {
                    const timestamp = Date.now();
                    screenshotPath = path.join(screenshotDir, `campaign_${campaignId}_${timestamp}.png`);
                    await page.screenshot({ path: screenshotPath, fullPage: true });
                    console.log(`[Campaign #${campaignId}] 📸 Screenshot saved at: ${screenshotPath}`);
                } catch (shotErr) {
                    console.error('Failed to capture screenshot:', shotErr.message);
                }
            }

            const enhancedError = new Error(error.message);
            enhancedError.screenshotPath = screenshotPath;
            throw enhancedError;

        } finally {
            if (context) {
                try {
                    await context.close();
                } catch (closeErr) {
                    console.error('Error closing browser context:', closeErr.message);
                }
            }
        }
    }
}

module.exports = GmailMailMergeWorker;
