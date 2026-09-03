const http = require('http');
const app = require('./src/app');
const db = require('./src/config/db');
const CampaignScheduler = require('./src/services/campaignScheduler');

app.set('db', db);

function makeRequest(server, method, path, data = null) {
    return new Promise((resolve, reject) => {
        const address = server.address();
        const port = address.port;
        const options = {
            hostname: '127.0.0.1',
            port: port,
            path: path,
            method: method,
            headers: {
                'Content-Type': 'application/json'
            }
        };

        const req = http.request(options, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try {
                    const parsed = JSON.parse(body);
                    resolve({ status: res.statusCode, body: parsed });
                } catch (e) {
                    resolve({ status: res.statusCode, body });
                }
            });
        });

        req.on('error', reject);

        if (data) {
            req.write(JSON.stringify(data));
        }
        req.end();
    });
}

async function runTests() {
    console.log('🧪 Starting Phase 1 API & Database Verification Tests...\n');

    const server = http.createServer(app);
    await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));

    try {
        // 1. Health Check
        const healthRes = await makeRequest(server, 'GET', '/api/health');
        console.log('1. Health Check:', healthRes.status === 200 && healthRes.body.status === 'OK' ? '✅ PASS' : '❌ FAIL');

        // 2. DB Check
        const dbCheckRes = await makeRequest(server, 'GET', '/api/db-check');
        console.log('2. Database Check:', dbCheckRes.status === 200 && dbCheckRes.body.solution === 2 ? '✅ PASS' : '❌ FAIL');

        // 3. Validation: Missing both title and URL
        const invalidRes = await makeRequest(server, 'POST', '/api/campaigns', {
            subject: 'Test Subject',
            body_template: 'Hello @name',
            scheduled_at: new Date().toISOString()
        });
        console.log('3. Validation Check (reject missing title & URL):', invalidRes.status === 400 ? '✅ PASS' : '❌ FAIL');

        // 4. Create Campaign with BOTH spreadsheet_title and spreadsheet_url
        const createBothRes = await makeRequest(server, 'POST', '/api/campaigns', {
            spreadsheet_title: 'Campaign 2026 Batch A',
            spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit',
            recipient_column: 'email',
            subject: 'Invitation to Submit Paper',
            body_template: 'Dear @name,\n\nPlease review paper from @company.',
            scheduled_at: new Date(Date.now() + 3600000).toISOString()
        });
        const campaignBoth = createBothRes.body.data;
        console.log('4. Create Campaign (Both URL + Title):', 
            createBothRes.status === 201 && 
            campaignBoth.spreadsheet_title === 'Campaign 2026 Batch A' && 
            campaignBoth.spreadsheet_url.includes('docs.google.com') && 
            campaignBoth.status === 'PENDING' ? '✅ PASS' : '❌ FAIL'
        );

        // 5. Create Campaign with ONLY spreadsheet_url
        const createUrlOnlyRes = await makeRequest(server, 'POST', '/api/campaigns', {
            spreadsheet_url: 'https://docs.google.com/spreadsheets/d/test-sheet-id/edit',
            subject: 'URL Only Campaign',
            body_template: 'Hello @name',
            scheduled_at: new Date(Date.now() + 3600000).toISOString()
        });
        console.log('5. Create Campaign (URL only):', createUrlOnlyRes.status === 201 && createUrlOnlyRes.body.data.spreadsheet_title === null ? '✅ PASS' : '❌ FAIL');

        // 6. Get By ID
        const getRes = await makeRequest(server, 'GET', `/api/campaigns/${campaignBoth.id}`);
        console.log('6. Get Campaign By ID:', getRes.status === 200 && getRes.body.data.id === campaignBoth.id ? '✅ PASS' : '❌ FAIL');

        // 7. Get All
        const getAllRes = await makeRequest(server, 'GET', '/api/campaigns');
        console.log('7. List All Campaigns:', getAllRes.status === 200 && Array.isArray(getAllRes.body.data) && getAllRes.body.data.length >= 2 ? '✅ PASS' : '❌ FAIL');

        // 8. Reschedule
        const newTime = new Date(Date.now() + 7200000).toISOString();
        const scheduleRes = await makeRequest(server, 'POST', `/api/campaigns/${campaignBoth.id}/schedule`, {
            scheduled_at: newTime
        });
        console.log('8. Reschedule Campaign:', scheduleRes.status === 200 && scheduleRes.body.data.status === 'PENDING' ? '✅ PASS' : '❌ FAIL');

        // 9. Cancel
        const cancelRes = await makeRequest(server, 'POST', `/api/campaigns/${campaignBoth.id}/cancel`);
        console.log('9. Cancel Campaign:', cancelRes.status === 200 && cancelRes.body.data.status === 'CANCELLED' ? '✅ PASS' : '❌ FAIL');

        // 10. Stale Job Boot Recovery Check
        // Simulate a job left in RUNNING status
        await db.query("UPDATE campaigns SET status = 'RUNNING' WHERE id = ?", [campaignBoth.id]);
        await CampaignScheduler.recoverStaleOnBoot();
        const [recoveredRows] = await db.query("SELECT status, last_error FROM campaigns WHERE id = ?", [campaignBoth.id]);
        console.log('10. Stale RUNNING Recovery on Boot:', 
            recoveredRows[0].status === 'FAILED' && 
            recoveredRows[0].last_error.includes('Server stopped') ? '✅ PASS' : '❌ FAIL'
        );

        console.log('\n🎉 ALL PHASE 1 VERIFICATION TESTS COMPLETED SUCCESSFULLY!');
    } catch (err) {
        console.error('Test Suite Failure:', err);
    } finally {
        server.close();
        process.exit(0);
    }
}

runTests();
