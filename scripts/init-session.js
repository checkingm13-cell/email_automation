/**
 * scripts/init-session.js
 * Standalone Playwright script to initialize Google session on VPS.
 * 
 * Features:
 * - Uses persistent profile at ../chrome-profile (or optional CLI argument).
 * - Routes browser traffic through process.env.PROXY_SERVER (Tailscale Squid).
 * - Uses DISPLAY :99 for Xvfb + x11vnc session.
 * - Navigates to accounts.google.com, waits for user to sign in + complete 2FA via VNC.
 * - Navigates to mail.google.com and verifies page title / session.
 */

const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');
const readline = require('readline');

// Load environment variables from repo root .env
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });

// Default to display :99 for headless VPS with Xvfb/x11vnc
process.env.DISPLAY = process.env.DISPLAY || ':99';

async function initSession() {
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

    const userDataDir = path.resolve(__dirname, '..', profileFolder);

    if (!fs.existsSync(userDataDir)) {
        fs.mkdirSync(userDataDir, { recursive: true });
    }

    const proxyConfig = process.env.PROXY_SERVER ? { server: process.env.PROXY_SERVER } : undefined;

    console.log('\n======================================================');
    console.log('🌐 VPS Chromium Session Initializer');
    console.log(`   Profile Directory : ${userDataDir}`);
    console.log(`   Target Account    : ${arg || 'default'}`);
    console.log(`   Display           : ${process.env.DISPLAY}`);
    console.log(`   Proxy Server      : ${process.env.PROXY_SERVER || 'DIRECT (None)'}`);
    console.log('======================================================\n');

    const launchOpts = {
        headless: false,
        channel: 'chrome',
        proxy: proxyConfig,
        args: [
            '--start-maximized',
            '--no-sandbox',
            '--disable-blink-features=AutomationControlled'
        ],
        viewport: null
    };

    let context;
    try {
        context = await chromium.launchPersistentContext(userDataDir, launchOpts);
    } catch (launchErr) {
        // Fallback to bundled Chromium if Google Chrome is not installed
        delete launchOpts.channel;
        context = await chromium.launchPersistentContext(userDataDir, launchOpts);
    }

    const page = context.pages().length > 0 ? context.pages()[0] : await context.newPage();

    console.log('➡️  Navigating to https://accounts.google.com/ ...');
    await page.goto('https://accounts.google.com/', { 
        waitUntil: 'domcontentloaded',
        timeout: 45000 
    });

    console.log('\n📺 DISPLAY :99 ACTIVE - VNC Connection Required');
    console.log('------------------------------------------------------');
    console.log('1. Connect via VNC to your VPS (e.g. vncviewer <vps-ip>:5900).');
    console.log('2. Log into your Google Account and complete the 2FA prompt.');
    console.log('3. When finished, press ENTER here to verify the session.');
    console.log('------------------------------------------------------\n');

    // Wait for user confirmation: check URL change, trigger file, or stdin
    console.log('⏳ Waiting for login... (Will auto-detect once login & 2FA completes)');
    await new Promise((resolve) => {
        const interval = setInterval(async () => {
            try {
                const url = page.url();
                if (url.includes('myaccount.google.com') || 
                    url.includes('mail.google.com') || 
                    (url.includes('accounts.google.com') && !url.includes('/signin/') && !url.includes('/v3/signin'))) {
                    console.log(`\n🎉 Login detected! Current URL: ${url}`);
                    clearInterval(interval);
                    resolve();
                } else if (fs.existsSync('/tmp/session_done')) {
                    console.log('\n🔔 Trigger file /tmp/session_done detected!');
                    try { fs.unlinkSync('/tmp/session_done'); } catch (_) {}
                    clearInterval(interval);
                    resolve();
                }
            } catch (_) {}
        }, 2000);

        if (process.stdin.isTTY) {
            const rl = readline.createInterface({
                input: process.stdin,
                output: process.stdout
            });
            rl.question('Or press [ENTER] after completing login & 2FA in VNC... ', () => {
                rl.close();
                clearInterval(interval);
                resolve();
            });
        }
    });

    console.log('\n📬 Navigating to https://mail.google.com/ to verify authentication...');
    await page.goto('https://mail.google.com/mail/u/0/#inbox', {
        waitUntil: 'domcontentloaded',
        timeout: 60000
    });

    // Allow Gmail interface to stabilize
    await page.waitForTimeout(5000);

    const title = await page.title();
    const currentUrl = page.url();

    console.log(`📄 Page Title : "${title}"`);
    console.log(`🔗 Current URL : ${currentUrl}`);

    const isGmailTitle = /gmail|inbox/i.test(title);
    const isGmailUrl = currentUrl.includes('mail.google.com');

    if (isGmailTitle || isGmailUrl) {
        console.log('\n✅ AUTHENTICATION VERIFIED! Gmail session successfully established.');
        console.log(`💾 Persistent session saved to: ${userDataDir}\n`);
    } else {
        console.log('\n⚠️  WARNING: Could not confirm Gmail Inbox title. Please check your credentials and 2FA status.\n');
    }

    await context.close();
    process.exit(0);
}

initSession().catch((err) => {
    console.error('❌ Error during session initialization:', err.message);
    process.exit(1);
});
