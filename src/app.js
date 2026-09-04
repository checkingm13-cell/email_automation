const express = require('express');
const cors = require('cors');

const app = express();

// Middleware
app.use(cors());
app.use(express.json()); // Parse JSON bodies
app.use(express.urlencoded({ extended: true }));
app.use(express.static(require('path').join(__dirname, '../public')));

// Health Check Route
app.get('/api/health', (req, res) => {
    res.status(200).json({
        status: 'OK',
        message: 'Email Automation API is running',
        timestamp: new Date().toISOString()
    });
});

// Database Check Route (Phase 1 verification)
app.get('/api/db-check', async (req, res) => {
    try {
        const [rows] = await req.app.get('db').query('SELECT 1 + 1 AS solution');
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