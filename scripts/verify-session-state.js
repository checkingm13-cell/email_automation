const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

(async () => {
    const stateFile = path.resolve(__dirname, '../auth-editorial.json');
    const profileDir = path.resolve(__dirname, '../chrome-profile-editorial');
    
    console.log('Using state file:', stateFile);
    console.log('Using profile dir:', profileDir);
    console.log('Using proxy:', process.env.PROXY_SERVER);
    
    const proxyConfig = process.env.PROXY_SERVER ? { server: process.env.PROXY_SERVER } : undefined;
    
    const context = await chromium.launchPersistentContext(profileDir, {
        headless: false,
        storageState: stateFile,
        proxy: proxyConfig,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        viewport: null
    });
    
    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();
    
    console.log('Navigating to Gmail Inbox...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox', {
        waitUntil: 'domcontentloaded',
        timeout: 45000
    });
    
    await page.waitForTimeout(5000);
    
    const title = await page.title();
    const url = page.url();
    console.log('Title:', title);
    console.log('URL:', url);
    
    await page.screenshot({ path: '/tmp/gmail_test.png' });
    console.log('Screenshot saved to /tmp/gmail_test.png');
    
    const isGmail = /gmail|inbox/i.test(title) || (url.includes('mail.google.com') && !url.includes('accounts.google.com'));
    if (isGmail) {
        console.log('SUCCESS: Gmail session verified and persisted on VPS!');
    } else {
        console.log('FAILED: Still on sign-in or other page');
    }
    
    await context.close();
    process.exit(isGmail ? 0 : 1);
})().catch(e => {
    console.error('Execution error:', e);
    process.exit(1);
});
