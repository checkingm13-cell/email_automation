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

// System Status & Diagnostic Route
app.get('/api/system/status', async (req, res) => {
    const db = req.app.get('db') || require('./config/db');
    let dbStatus = 'DISCONNECTED';
    let pendingCount = 0;
    let runningCount = 0;

    try {
        const [testRows] = await db.query('SELECT 1 + 1 AS solution');
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

    res.json({
        engine: 'ONLINE',
        environment: process.env.NODE_ENV || 'local-production',
        outboundRoute: process.env.PROXY_SERVER ? 'Proxy' : 'Direct Broadband',
        database: dbStatus,
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