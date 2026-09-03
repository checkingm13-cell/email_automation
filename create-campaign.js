/**
 * Quick CLI tool to create and schedule a new campaign
 * 
 * Usage:
 *   node create-campaign.js
 */

const db = require('./src/config/db');

async function createCampaign() {
    // Default campaign configuration
    // Edit these fields or pass them dynamically:
    const campaignConfig = {
        spreadsheet_title: 'newproject', // Title of Google Sheet in Drive
        spreadsheet_url: 'https://docs.google.com/spreadsheets/d/1A8Gx8s9mWSOop6t7d_BXa5kPKSV7Jj0MGrytjtwxu6c/edit?usp=sharing',
        sender_email: 'editorial@researchworldwidejournals.com', // Active sender
        chrome_profile: 'chrome-profile-editorial', // Profile directory
        recipient_column: 'email',
        subject: 'Official Announcement - Research World Wide Journals',
        body_template: `Dear Author,

We are pleased to invite your submission to our upcoming journal volume.

You can reply directly to this email if you have any questions.

Best regards,
Editorial Team`,
        scheduled_at: new Date() // Start immediately or schedule for future
    };

    console.log('\n======================================================');
    console.log('📝 Creating New Campaign');
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
