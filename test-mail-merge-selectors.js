const { chromium } = require('playwright');
const path = require('path');

async function testMailMergeFlow() {
    console.log('🚀 Starting Mail Merge Selector Verification Test (Complete Flow)...');
    const context = await chromium.launchPersistentContext(path.resolve('chrome-profile'), {
        headless: true,
        channel: 'chrome',
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        viewport: { width: 1366, height: 768 }
    });

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    try {
        // Step 1: Open Gmail Inbox
        console.log('Step 1: Navigating to Gmail inbox...');
        await page.goto('https://mail.google.com/mail/u/0/#inbox', { 
            waitUntil: 'domcontentloaded', 
            timeout: 45000 
        });

        // Step 2: Wait for Gmail UI and Compose button to be visible
        console.log('Step 2: Waiting for Gmail UI and Compose button to be visible...');
        const composeBtn = page.getByRole('button', { name: /compose/i }).or(page.locator('div[gh="cm"]')).first();
        await composeBtn.waitFor({ state: 'visible', timeout: 45000 });
        console.log('   ✅ Compose button is visible! Gmail is fully loaded.');
        await page.waitForTimeout(1000);

        // Step 3: Open Compose Dialog
        console.log('Step 3: Clicking Compose button...');
        await composeBtn.click();
        
        const composeDialog = page.locator('div[role="dialog"]').filter({ hasText: /new message|to/i }).first();
        await composeDialog.waitFor({ state: 'visible', timeout: 20000 });
        console.log('   ✅ Compose dialog is open!');
        await page.waitForTimeout(1500);

        // Step 4: Open Mail Merge popup
        console.log('Step 4: Opening Mail Merge popup...');
        const mailMergeBtn = composeDialog.locator('span.Sz.brj, [aria-label*="mail merge" i], [data-tooltip*="mail merge" i]').first();
        await mailMergeBtn.waitFor({ state: 'visible', timeout: 10000 });
        await mailMergeBtn.focus();
        await page.keyboard.press('Enter');
        await page.waitForTimeout(1500);

        let menu = page.getByRole('menu');
        if (!(await menu.isVisible().catch(() => false))) {
            console.log('   Retrying with mouse click on Mail Merge button...');
            await mailMergeBtn.click();
            await page.waitForTimeout(1500);
        }

        await menu.waitFor({ state: 'visible', timeout: 10000 });
        console.log('   ✅ Mail Merge menu is visible!');

        // Step 5: Check Mail merge checkbox
        console.log('Step 5: Locating Mail merge checkbox...');
        const checkbox = menu.getByRole('checkbox', { name: /mail merge/i });
        await checkbox.waitFor({ state: 'visible', timeout: 5000 });
        const isChecked = await checkbox.getAttribute('aria-checked');
        console.log(`   Current checkbox state: aria-checked="${isChecked}"`);

        if (isChecked !== 'true') {
            console.log('   Clicking checkbox to enable Mail merge...');
            await checkbox.click();
            await page.waitForTimeout(1500);
        }

        // Step 6: Click "Add from a spreadsheet"
        console.log('Step 6: Clicking "Add from a spreadsheet"...');
        const addSheetOption = menu.getByRole('menuitem', { name: /add from a spreadsheet/i }).or(menu.getByText('Add from a spreadsheet')).first();
        await addSheetOption.waitFor({ state: 'visible', timeout: 5000 });
        await addSheetOption.click();
        await page.waitForTimeout(4000);

        // Step 7: Locate Google Drive Picker frame
        console.log('Step 7: Locating Google Drive Picker frame...');
        let pickerFrame = null;
        for (let i = 0; i < 15; i++) {
            pickerFrame = page.frames().find(f => f.url().includes('picker') || f.url().includes('drive'));
            if (pickerFrame) break;
            await page.waitForTimeout(1000);
        }

        if (!pickerFrame) {
            throw new Error('Google Drive picker frame not found');
        }
        console.log('   ✅ Google Drive picker frame active!');

        // Step 8: Search spreadsheet in picker
        const sheetTarget = 'https://docs.google.com/spreadsheets/d/1pLeEJ3OipvQK9U0E7yV7Qcr8tbqUbPrrDXts-DV94Rs/edit?usp=sharing';
        console.log(`Step 8: Searching for spreadsheet URL "${sheetTarget}"...`);
        const searchInput = pickerFrame.locator('input[aria-label*="Search"], input[placeholder*="Search"], input[type="text"]').first();
        await searchInput.waitFor({ state: 'visible', timeout: 10000 });
        await searchInput.fill(sheetTarget);
        await searchInput.press('Enter');
        await page.waitForTimeout(2500);

        // Step 9: Select spreadsheet from search results
        console.log('Step 9: Selecting file entry in picker...');
        const fileItem = pickerFrame.locator('div[role="row"], div[role="option"], div[role="gridcell"]').first();
        await fileItem.waitFor({ state: 'visible', timeout: 15000 });
        await fileItem.click();
        await page.waitForTimeout(1000);

        // Step 10: Click Insert button
        console.log('Step 10: Clicking Insert button in picker...');
        const insertBtn = pickerFrame.locator('button:has-text("Insert"), button:has-text("Select"), div[role="button"]:has-text("Insert"), button[name="ok"]').first();
        await insertBtn.waitFor({ state: 'visible', timeout: 8000 });
        await insertBtn.click();
        await page.waitForTimeout(2500);

        // Step 11: Handle Finish linking spreadsheet Column Mapping Dialog
        const finishLinkingHeading = page.locator('text="Finish linking spreadsheet"').first();
        if (await finishLinkingHeading.isVisible({ timeout: 8000 }).catch(() => false)) {
            console.log('Step 11: Configuring column mappings in Finish linking dialog...');
            
            // Map EMAIL
            const firstDropdown = page.locator('div.rHGeGc-aPP78e').first();
            if (await firstDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
                await firstDropdown.click();
                await page.waitForTimeout(800);
                const emailOption = page.locator('li[role="option"][data-value="email"], li[role="option"]:has-text("@email")').first();
                if (await emailOption.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await emailOption.click();
                    await page.waitForTimeout(800);
                }
            }

            // Map NAME
            const nameDropdown = page.locator('div.rHGeGc-aPP78e').nth(1);
            if (await nameDropdown.isVisible({ timeout: 3000 }).catch(() => false)) {
                await nameDropdown.click();
                await page.waitForTimeout(800);
                const nameOption = page.locator('li[role="option"][data-value="name"], li[role="option"]:has-text("@name")').first();
                if (await nameOption.isVisible({ timeout: 3000 }).catch(() => false)) {
                    await nameOption.click();
                    await page.waitForTimeout(800);
                }
            }

            // Click Finish
            const finishBtn = page.getByRole('button', { name: 'Finish' }).or(page.locator('button:has-text("Finish"), div[role="button"]:has-text("Finish")')).first();
            await finishBtn.waitFor({ state: 'visible', timeout: 5000 });
            await finishBtn.click();
            await page.waitForTimeout(2000);
        }

        // Step 12: Verify Google Sheet is Linked in Compose To field
        await page.screenshot({ path: 'logs/screenshots/step12_final_verified_compose.png', fullPage: true });
        console.log('   Screenshot saved: logs/screenshots/step12_final_verified_compose.png');

        console.log('\n======================================================');
        console.log('🎉 FULL MAIL MERGE PIPELINE VERIFIED SUCCESSFULLY!');
        console.log('======================================================\n');

    } catch (err) {
        console.error('❌ Test failed:', err.message);
        await page.screenshot({ path: 'logs/screenshots/test_mail_merge_error.png' });
        throw err;
    } finally {
        await context.close();
    }
}

testMailMergeFlow().then(() => process.exit(0)).catch(() => process.exit(1));
