const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static(require('path').join(__dirname, '../public')));

const campaignScheduler = require('./services/campaignScheduler');

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Email Automation API is running',
        timestamp: new Date().toISOString()
    });
});

let cachedOutboundIp = null;
let lastIpCheckTime = 0;

async function resolveOutboundIp() {
    const now = Date.now();
    if (cachedOutboundIp && (now - lastIpCheckTime < 10 * 60 * 1000)) {
        return cachedOutboundIp;
    }
    try {
        const response = await fetch('https://api.ipify.org?format=json', { signal: AbortSignal.timeout(2500) });
        const data = await response.json();
        if (data && data.ip) {
            cachedOutboundIp = data.ip;
            lastIpCheckTime = now;
            return cachedOutboundIp;
        }
    } catch (_) {}
    return cachedOutboundIp || 'Direct (Broadband)';
}

// System Status & Diagnostic Route
app.get('/api/system/status', async (req, res) => {
    const db = req.app.get('db') || require('./config/db');
    let dbStatus = 'DISCONNECTED';
    let dbLatencyMs = null;
    let pendingCount = 0;
    let runningCount = 0;

    const tStart = Date.now();
    try {
        const [testRows] = await db.query('SELECT 1 + 1 AS solution');
        dbLatencyMs = Date.now() - tStart;
        if (testRows && testRows.length > 0) {
            dbStatus = 'CONNECTED';
        }
        const [countRows] = await db.query(`
            SELECT 
                SUM(CASE WHEN status = 'PENDING' THEN 1 ELSE 0 END) AS pending,
                SUM(CASE WHEN status = 'RUNNING' THEN 1 ELSE 0 END) AS running
            FROM campaigns
        `);
        if (countRows && countRows.length > 0) {
            pendingCount = Number(countRows[0].pending) || 0;
            runningCount = Number(countRows[0].running) || 0;
        }
    } catch (err) {
        dbStatus = 'ERROR: ' + err.message;
    }

    let activeProfiles = [];
    try {
        const fs = require('fs');
        const path = require('path');
        const [profRows] = await db.query('SELECT id, email, display_name, profile_folder, daily_quota, sent_today, status, last_used_at FROM sender_profiles ORDER BY id ASC');
        activeProfiles = (profRows || []).map(p => {
            const folderPath = path.resolve(process.cwd(), p.profile_folder || 'chrome-profile');
            const exists = fs.existsSync(folderPath);
            const isLocked = exists && (fs.existsSync(path.join(folderPath, 'SingletonLock')) || fs.existsSync(path.join(folderPath, 'SingletonSocket')));
            return {
                id: p.id,
                email: p.email,
                displayName: p.display_name,
                folder: p.profile_folder,
                status: p.status,
                dailyQuota: p.daily_quota,
                sentToday: p.sent_today,
                existsOnDisk: exists,
                isLocked: isLocked,
                lastUsedAt: p.last_used_at
            };
        });
    } catch (e) {
        try {
            const fs = require('fs');
            const path = require('path');
            activeProfiles = fs.readdirSync(process.cwd())
                .filter(name => name.startsWith('chrome-profile') && fs.statSync(path.resolve(process.cwd(), name)).isDirectory())
                .map(folder => {
                    const folderPath = path.resolve(process.cwd(), folder);
                    const isLocked = fs.existsSync(path.join(folderPath, 'SingletonLock')) || fs.existsSync(path.join(folderPath, 'SingletonSocket'));
                    return {
                        email: folder.replace('chrome-profile-', '').replace('chrome-profile', 'Default Profile'),
                        folder: folder,
                        existsOnDisk: true,
                        isLocked: isLocked,
                        status: isLocked ? 'BUSY' : 'READY'
                    };
                });
        } catch (_) {}
    }

    const mem = process.memoryUsage();
    const outboundIp = await resolveOutboundIp();

    res.json({
        engine: 'ONLINE',
        nodeVersion: process.version,
        platform: process.platform,
        environment: process.env.NODE_ENV || 'local-production',
        outboundRoute: process.env.PROXY_SERVER ? 'Proxy' : 'Direct Residential Broadband',
        outboundIp,
        database: dbStatus,
        dbLatencyMs,
        activeProfiles,
        memoryUsageMB: Math.round(mem.rss / (1024 * 1024)),
        scheduler: campaignScheduler.getStatus(),
        counts: {
            pending: pendingCount,
            running: runningCount
        },
        uptimeSeconds: Math.floor(process.uptime()),
        timestamp: new Date().toISOString()
    });
});

// Scheduler Controls
app.post('/api/scheduler/pause', (req, res) => {
    campaignScheduler.stop();
    res.json({ success: true, message: 'Scheduler paused', scheduler: campaignScheduler.getStatus() });
});

app.post('/api/scheduler/resume', (req, res) => {
    campaignScheduler.start();
    res.json({ success: true, message: 'Scheduler resumed', scheduler: campaignScheduler.getStatus() });
});

// Database Check Route (Phase 1 verification)
app.get('/api/db-check', async (req, res) => {
    try {
        const db = req.app.get('db') || require('./config/db');
        const [rows] = await db.query('SELECT 1 + 1 AS solution');
        res.status(200).json({
            status: 'OK',
            message: 'Database is responsive',
            solution: rows[0].solution
        });
    } catch (error) {
        res.status(500).json({
            status: 'ERROR',
            message: 'Database connection failed',
            error: error.message
        });
    }
});

// Sender Profiles Route (Source of Truth from Supabase)
app.get('/api/sender-profiles', async (req, res) => {
    try {
        const db = req.app.get('db') || require('./config/db');
        const [rows] = await db.query('SELECT id, email, display_name, profile_folder, daily_quota, sent_today, status FROM sender_profiles ORDER BY id ASC');
        res.json({ success: true, data: rows });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});

// CI/CD Authenticated Webhook Deploy Route (Zero SSH Keys in GitHub)
app.post('/api/deploy', (req, res) => {
    const secret = req.headers['x-deploy-secret'];
    const expected = process.env.DEPLOY_SECRET;
    
    if (!expected || !secret || secret !== expected) {
        return res.status(401).json({ error: 'Unauthorized: Invalid or missing deployment secret' });
    }
    
    res.status(200).json({ 
        status: 'OK', 
        message: 'Deployment triggered successfully',
        timestamp: new Date().toISOString()
    });
    
    // Execute git pull & PM2 reload asynchronously
    const { exec } = require('child_process');
    const path = require('path');
    const repoRoot = path.resolve(__dirname, '..');
    
    exec('git pull origin main && npm install --production && pm2 reload ecosystem.config.js', { cwd: repoRoot }, (err, stdout, stderr) => {
        if (err) {
            console.error('❌ [Deploy Webhook Error]:', err.message);
        } else {
            console.log('✅ [Deploy Webhook Success]:\n', stdout);
        }
    });
});

// Placeholder for future routes
// Register Routes
app.use('/api/templates', require('./routes/templateRoutes'));
app.use('/api/google-sheets', require('./routes/googleSheetRoutes'));
app.use('/api/campaigns', require('./routes/campaignRoutes'));
app.use('/unsubscribe', require('./routes/unsubscribeRoutes'));

module.exports = app;