/**
 * Script to initialize and log into a persistent Chrome profile.
 * 
 * Usage:
 *   node init-chrome-profile.js [email_or_profile_name]
 * 
 * Examples:
 *   node init-chrome-profile.js editorial@researchworldwidejournals.com
 *   node init-chrome-profile.js editor@worldwidejournals.co.in
 *   node init-chrome-profile.js
 * 
 * Instructions:
 * 1. A Chrome browser window will open at https://mail.google.com/.
 * 2. Log in with the specified Google / Gmail account (complete 2FA if required).
 * 3. Once the Gmail inbox loads, simply close the browser window.
 * 4. The session will be saved in the corresponding profile directory.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function initChromeProfile() {
    const arg = process.argv[2];
    let profileFolder = 'chrome-profile';

    if (arg) {
        if (arg.includes('@')) {
            const prefix = arg.split('@')[0].replace(/[^a-zA-Z0-9_-]/g, '_');
            profileFolder = `chrome-profile-${prefix}`;
        } else if (arg.startsWith('chrome-profile')) {
            profileFolder = arg;
        } else {
            profileFolder = `chrome-profile-${arg}`;
        }
    }

    const userDataDir = path.resolve(__dirname, profileFolder);
    
    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    console.log(`\n======================================================`);
    console.log(`🌐 Launching Chrome with Persistent Profile at:`);
    console.log(`   Directory: ${userDataDir}`);
    if (arg) {
        console.log(`   Target Account: ${arg}`);
    }
    console.log(`======================================================\n`);
    console.log(`➡️  Please log in to your Google Account (${arg || 'default'}) in the browser window.`);
    console.log(`➡️  Once your Gmail Inbox is visible, close the browser window to save.\n`);

    const context = await chromium.launchPersistentContext(userDataDir, {
        headless: false,
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

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    await page.goto('https://mail.google.com/');

    context.on('close', () => {
        console.log(`\n✅ Browser closed. Session profile saved successfully in ./${profileFolder}\n`);
        process.exit(0);
    });
}

initChromeProfile().catch((err) => {
    console.error('❌ Error initializing profile:', err.message);
    process.exit(1);
});
