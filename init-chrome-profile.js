/**
 * One-time setup script to initialize the persistent Chrome profile.
 * 
 * Usage:
 *   node init-chrome-profile.js
 * 
 * Instructions:
 * 1. A Chrome browser window will open at https://mail.google.com/.
 * 2. Log in with your Google / Gmail account (complete 2FA if required).
 * 3. Once your Gmail inbox loads, simply close the browser window.
 * 4. The session will be saved in ./chrome-profile for automated runs.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function initChromeProfile() {
    const userDataDir = path.resolve(__dirname, 'chrome-profile');
    
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log(`\n======================================================`);
    console.log(`🌐 Launching Chrome with Persistent Profile at:`);
    console.log(`   ${userDataDir}`);
    console.log(`======================================================\n`);
    console.log(`➡️  Please log in to your Google Account in the browser window.`);
    console.log(`➡️  Once your Gmail Inbox is visible, close the browser window.\n`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
        channel: 'chrome', // Use installed Google Chrome if available, or defaults to bundled chromium
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        viewport: null
    }).catch(async () => {
        // Fallback to default bundled chromium if Google Chrome channel isn't installed
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

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto('https://mail.google.com/');

    // Wait until browser context is closed by the user
    context.on('close', () => {
        console.log(`\n✅ Browser closed. Session profile saved successfully in ./chrome-profile\n`);
        process.exit(0);
    });
}

initChromeProfile().catch((err) => {
    console.error('❌ Error initializing profile:', err);
    process.exit(1);
});
