/**
 * Quick CLI tool to create and schedule a new campaign
 * 
 * Usage:
 *   node create-campaign.js
 */

const db = require('./src/config/db');

async function createCampaign() {
    const campaignConfig = {
        spreadsheet_title: '03-09-26 001', // Exact Drive Title verified
        spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1mAtQBl3RQD1PlHpiUBZjHeyjvbd-4yt2nHjSG6nW52g/edit?usp=sharing',
        sender_email: 'editorial@researchworldwidejournals.com',
        chrome_profile: 'chrome-profile-editorial',
        recipient_column: 'email',
        subject: 'Invitation for Research Publication – International Journal of Scientific Research (IJSR)',
        body_template: `Dear Author,

We would like to invite you to consider the International Journal of Scientific Research (IJSR) for your research publication.

IJSR welcomes original research papers, review articles, case studies and other scholarly contributions from researchers and academics.

The journal follows a peer-reviewed publication process and provides an academic platform relevant to researchers considering publication requirements associated with NMC and UGC.

If your manuscript is ready, you can submit it through our online portal.

Submit Your Paper: https://www.worldwidejournals.com

We look forward to receiving your research.

Best regards,
Editorial Team
International Journal of Scientific Research (IJSR)`,
        scheduled_at: new Date()
    };

    console.log('\n======================================================');
    console.log('📝 Creating Campaign for IJSR');
    console.log(`   Subject:     "${campaignConfig.subject}"`);
    console.log(`   Sheet:       "${campaignConfig.spreadsheet_title}"`);
    console.log(`   Sender:      "${campaignConfig.sender_email}"`);
    console.log(`   Profile:     "${campaignConfig.chrome_profile}"`);
    console.log('======================================================\n');

    const [result] = await db.query(
        `INSERT INTO campaigns 
        (spreadsheet_title, spreadsheet_url, sender_email, chrome_profile, recipient_column, subject, body_template, scheduled_at, status) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'PENDING')`,
        [
            campaignConfig.spreadsheet_title,
            campaignConfig.spreadsheet_url,
            campaignConfig.sender_email,
            campaignConfig.chrome_profile,
            campaignConfig.recipient_column,
            campaignConfig.subject,
            campaignConfig.body_template,
            campaignConfig.scheduled_at
        ]
    );

    const newId = result.insertId;
    console.log(`🎉 Campaign #${newId} created successfully in status PENDING!`);
    console.log(`\nTo run this campaign immediately, execute:`);
    console.log(`   node run-test-campaign.js ${newId}\n`);

    process.exit(0);
}

createCampaign().catch(err => {
    console.error('❌ Error creating campaign:', err.message);
    process.exit(1);
});
