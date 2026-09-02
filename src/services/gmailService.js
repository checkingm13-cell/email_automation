const { google } = require('googleapis');
const path = require('path');
const crypto = require('crypto');

class GmailService {
    static async sendEmail({ to, subject, htmlContent, textContent, recipientName, senderEmail, unsubscribeUrl }) {
        try {
            console.log(`   📤 Preparing to send email from: ${senderEmail}`);

            const cleanTo = String(to).trim();
            if (!cleanTo || !cleanTo.includes('@')) {
                throw new Error(`Invalid recipient address: "${cleanTo}"`);
            }

            // 1. Initialize Service Account Auth with Dynamic Impersonation
            const auth = new google.auth.GoogleAuth({
                keyFile: path.join(__dirname, '../../credentials.json'),
                scopes: ['https://www.googleapis.com/auth/gmail.send'],
                clientOptions: {
                    subject: senderEmail // Dynamically impersonate the campaign's sender
                }
            });

            const authClient = await auth.getClient();

            // 2. Personalize content
            const name = recipientName || 'Subscriber';
            const personalizedHtml = htmlContent.replace(/\{\{Name\}\}/gi, name);
            const personalizedText = textContent.replace(/\{\{Name\}\}/gi, name);

            // 3. Generate unique Message-ID and Date
            const domain = senderEmail.split('@')[1];
            const messageId = `<${Date.now()}.${crypto.randomBytes(8).toString('hex')}@${domain}>`;
            const dateHeader = new Date().toUTCString();

            // 4. Construct MIME message with dynamic sender and unsubscribe
            const boundary = 'boundary_' + Date.now();
            const mimeMessage = [
                `Date: ${dateHeader}`,
                `From: "Editorial Team" <${senderEmail}>`,
                `To: ${cleanTo}`,
                `Subject: ${subject}`,
                `Message-ID: ${messageId}`,
                `Reply-To: ${senderEmail}`,
                `List-Unsubscribe: <${unsubscribeUrl}>, <mailto:${senderEmail}?subject=Unsubscribe>`,
                `List-Unsubscribe-Post: List-Unsubscribe=One-Click`,
                `MIME-Version: 1.0`,
                `Content-Type: multipart/alternative; boundary="${boundary}"`,
                '',
                `--${boundary}`,
                'Content-Type: text/plain; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                personalizedText,
                '',
                `--${boundary}`,
                'Content-Type: text/html; charset="UTF-8"',
                'Content-Transfer-Encoding: 7bit',
                '',
                personalizedHtml,
                '',
                `--${boundary}--`
            ].join('\r\n');

            const encodedMessage = Buffer.from(mimeMessage)
                .toString('base64')
                .replace(/\+/g, '-')
                .replace(/\//g, '_')
                .replace(/=+$/, '');

            const gmail = google.gmail({ version: 'v1', auth: authClient });

            const response = await gmail.users.messages.send({
                userId: 'me',
                requestBody: { raw: encodedMessage },
            });

            return { success: true, messageId: response.data.id, threadId: response.data.threadId };

        } catch (error) {
            console.error(`   ❌ Gmail API Error for ${senderEmail}:`, error.message);
            return { success: false, error: error.message };
        }
    }
}

module.exports = GmailService;