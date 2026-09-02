require('dotenv').config();
const { google } = require('googleapis');
const path = require('path');

const SPREADSHEET_ID = '1th9yiyDeKHIIB381KAT4vRpQElFMDoJpZ0dMjnQICJY';

(async () => {
    console.log('🔍 Raw Google Sheet Debug...\n');

    try {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, 'credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        const authClient = await auth.getClient();
        const sheets = google.sheets({ version: 'v4', auth: authClient });

        const response = await sheets.spreadsheets.values.get({
            spreadsheetId: SPREADSHEET_ID,
            range: 'Sheet1!A1:D5', // Read first 5 rows
        });

        const rows = response.data.values;

        console.log('📋 RAW ROWS FROM GOOGLE SHEET:');
        console.table(rows);

        if (rows && rows.length > 0) {
            console.log('\n🔍 EXACT HEADER NAMES (Row 1):');
            rows[0].forEach((header, index) => {
                console.log(`   Column ${index + 1}: "${header}" (Length: ${header.length})`);
            });
        }

    } catch (error) {
        console.error('❌ Error:', error.message);
    }
})();