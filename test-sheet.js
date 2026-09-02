require('dotenv').config();
const db = require('./src/config/db');
const GoogleSheetsService = require('./src/services/googleSheetsService');
const GmailService = require('./src/services/gmailService');

const SPREADSHEET_ID = '1th9yiyDeKHIIB381KAT4vRpQElFMDoJpZ0dMjnQICJY';
const SENDER_EMAIL = process.env.SENDER_EMAIL;

(async () => {
    console.log('🚀 Starting End-to-End Gmail API Test...\n');

    try {
        // 1. Get valid rows from Google Sheet
        console.log('1️⃣ Reading Google Sheet...');
        const validRows = await GoogleSheetsService.getSheetData(SPREADSHEET_ID);

        if (validRows.length === 0) {
            console.log('❌ No valid rows to process. Stopping.');
            return;
        }

        // 2. Process the first valid row
        const row = validRows[0];
        console.log(`\n2️⃣ Processing Row ${row._rowNumber}:`);
        console.log(`   Name: ${row.name}`);
        console.log(`   Email: ${row.email}`);
        console.log(`   Template: ${row.templateName}`);

        // 3. Fetch the template from the database
        console.log('\n3️⃣ Fetching template from database...');
        const [templateRows] = await db.query(
            'SELECT * FROM templates WHERE template_name = ?',
            [row.templateName]
        );

        if (templateRows.length === 0) {
            console.error(`❌ Template '${row.templateName}' not found in database!`);
            console.log('💡 Tip: Make sure you created this template via the API first.');
            return;
        }

        const template = templateRows[0];
        console.log(`   ✅ Found template: "${template.subject}"`);

        // 4. Send the email via Gmail API
        console.log('\n4️⃣ Sending email via Gmail API...');
        const result = await GmailService.sendEmail({
            to: row.email,
            subject: template.subject,
            htmlContent: template.html_content,
            textContent: template.text_content,
            recipientName: row.name,
            senderEmail: SENDER_EMAIL,
        });

        if (result.success) {
            console.log(`\n🎉 SUCCESS! Email sent to ${row.email}`);
            console.log(`   Gmail Message ID: ${result.messageId}`);
        } else {
            console.error(`\n❌ FAILED to send email: ${result.error}`);
            console.log('\n💡 Tip: If you get an "insufficient authentication scopes" error,');
            console.log('you need to run `node setup-oauth.js` again to grant Gmail sending permissions.');
        }

    } catch (error) {
        console.error('\n❌ Fatal Error:', error.message);
    } finally {
        await db.end();
    }
})();