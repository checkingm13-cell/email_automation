const { google } = require('googleapis');
const path = require('path');

class GoogleSheetsService {

    static async getAuthClient() {
        const auth = new google.auth.GoogleAuth({
            keyFile: path.join(__dirname, '../../credentials.json'),
            scopes: ['https://www.googleapis.com/auth/spreadsheets'],
        });
        return auth.getClient();
    }

    static isValidEmail(email) {
        if (!email || typeof email !== 'string') return false;
        const trimmed = email.trim();
        if (trimmed.length === 0) return false;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(trimmed);
    }

    /**
     * Bulletproof validation with normalized keys
     */
    static validateRow(row, rowIndex) {
        if (!row || Object.keys(row).length === 0) {
            return { valid: false, reason: 'Empty row' };
        }

        // 1. Normalize all keys: trim spaces and convert to lowercase
        const normalizedRow = {};
        Object.keys(row).forEach(key => {
            const cleanKey = key.trim().toLowerCase();
            normalizedRow[cleanKey] = String(row[key]).trim();
        });

        // 2. Extract data using flexible, normalized key names
        const email = normalizedRow['email'] || normalizedRow['email address'] || normalizedRow['e-mail'] || '';
        const name = normalizedRow['name'] || normalizedRow['full name'] || '';
        const templateName = normalizedRow['template name'] || normalizedRow['template'] || '';

        // 3. Validation Checks
        if (!email) {
            return { valid: false, reason: 'Missing email address' };
        }

        if (!this.isValidEmail(email)) {
            return { valid: false, reason: `Invalid email format: ${email}` };
        }

        if (!templateName) {
            return { valid: false, reason: 'Missing Template Name' };
        }

        // Return clean, standardized object
        return {
            valid: true,
            cleanData: {
                name: name || 'Subscriber',
                email: email,
                templateName: templateName
            }
        };
    }

    static async getSheetData(spreadsheetId, range = 'Sheet1!A:D') {
        try {
            const authClient = await this.getAuthClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });

            const response = await sheets.spreadsheets.values.get({
                spreadsheetId,
                range,
            });

            const rows = response.data.values;

            if (!rows || rows.length === 0) {
                throw new Error('No data found in the Google Sheet.');
            }

            const headers = rows[0];
            const allData = rows.slice(1).map((row, index) => {
                let obj = {};
                headers.forEach((header, i) => {
                    // Keep original casing for _originalRow, but we will normalize in validateRow
                    obj[header] = row[i] ? row[i].trim() : '';
                });
                obj._rowNumber = index + 2;
                return obj;
            });

            const validData = [];
            const invalidRows = [];

            allData.forEach(row => {
                const validation = this.validateRow(row, row._rowNumber);

                if (validation.valid) {
                    validData.push({
                        ...validation.cleanData,
                        _rowNumber: row._rowNumber,
                        _originalRow: row
                    });
                } else {
                    invalidRows.push({
                        rowNumber: row._rowNumber,
                        reason: validation.reason,
                        data: row
                    });
                }
            });

            console.log(`\n📊 Google Sheet Validation Results:`);
            console.log(`   Total rows: ${allData.length}`);
            console.log(`   ✅ Valid rows: ${validData.length}`);
            console.log(`   ❌ Invalid rows: ${invalidRows.length}`);

            if (invalidRows.length > 0) {
                console.log(`\n⚠️  Skipped rows:`);
                invalidRows.forEach(invalid => {
                    console.log(`   Row ${invalid.rowNumber}: ${invalid.reason}`);
                });
            }
            console.log('');

            return validData;

        } catch (error) {
            console.error('Error reading Google Sheet:', error.message);
            throw new Error(`Failed to read Google Sheet: ${error.message}`);
        }
    }

    static async updateCell(spreadsheetId, cellRange, value) {
        try {
            const authClient = await this.getAuthClient();
            const sheets = google.sheets({ version: 'v4', auth: authClient });

            await sheets.spreadsheets.values.update({
                spreadsheetId,
                range: cellRange,
                valueInputOption: 'RAW',
                resource: { values: [[value]] },
            });
            return true;
        } catch (error) {
            console.error('Error updating Google Sheet cell:', error.message);
            throw new Error(`Failed to update Google Sheet: ${error.message}`);
        }
    }
}

module.exports = GoogleSheetsService;